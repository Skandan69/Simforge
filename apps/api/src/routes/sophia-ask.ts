import { Router } from "express";
import { z } from "zod";
import type { AskSophiaResponse } from "@simforge/shared";
import { getAIProvider } from "../ai/provider.js";
import { buildAskSophiaPrompt, deterministicAskAnswer, sanitizeEvidenceReferences } from "../ai/ask-prompt.js";
import { requireAuth } from "../middleware/auth.js";
import { getWorkspaceRequest, requireWorkspace } from "../middleware/workspace.js";
import { knowledgeRetrievalService, toAskSource } from "../knowledge-retrieval/service.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { debugTimingsRequested, nowMs, requestTimingSummary, timeRequestStage } from "../lib/request-timing.js";
import { TtlCache } from "../lib/ttl-cache.js";
import { insufficientEvidenceAskResponse } from "./sophia-ask-response.js";

const askSchema = z.object({
  question: z.string().trim().min(1).max(4000),
  knowledgeBaseIds: z.array(z.string().uuid()).max(20).optional(),
});

export const sophiaAskRouter = Router();
sophiaAskRouter.use(requireAuth, requireWorkspace);

const askScopeCache = new TtlCache<string, number>(15_000);

sophiaAskRouter.post("/ask", async (request, response) => {
  const routeStartedAt = nowMs();
  const includeDebugTimings = debugTimingsRequested(request);
  const workspace = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  const input = askSchema.parse(request.body ?? {});

  if (input.knowledgeBaseIds?.length) {
    const uniqueKnowledgeBaseIds = [...new Set(input.knowledgeBaseIds)];
    const scopeCacheKey = `${workspace.organizationId}:${[...uniqueKnowledgeBaseIds].sort().join(",")}`;
    const activeCount = askScopeCache.get(scopeCacheKey) ?? await timeRequestStage(request, "ask.scopeValidation", () => askScopeCache.getOrSet(scopeCacheKey, () => prisma.knowledgeBase.count({ where: { id: { in: uniqueKnowledgeBaseIds }, organizationId: workspace.organizationId, status: "Active" } })));
    if (activeCount !== uniqueKnowledgeBaseIds.length) throw new HttpError("One or more knowledge bases are unavailable", 404, "KNOWLEDGE_SCOPE_NOT_FOUND");
  }

  const retrieval = await timeRequestStage(request, "ask.retrieval", () => knowledgeRetrievalService.retrieve({
    scope: { organizationId: workspace.organizationId, userId: user.id, role: workspace.role },
    query: input.question,
    mode: "ASK",
    knowledgeBaseIds: input.knowledgeBaseIds,
    debugTimings: includeDebugTimings,
  }));

  const makeDebugTimings = (answerGeneration: { invoked: boolean; durationMs: number }) => includeDebugTimings ? {
    ...(requestTimingSummary(request) ?? { requestTotalMs: Math.round(nowMs() - routeStartedAt), stages: [] }),
    retrieval: retrieval.debugTimings,
    answerGeneration,
  } : undefined;

  if (retrieval.insufficientEvidence) {
    const payload: AskSophiaResponse = insufficientEvidenceAskResponse(
      retrieval,
      makeDebugTimings({ invoked: false, durationMs: 0 }),
    );
    response.json(payload);
    return;
  }

  const provider = getAIProvider();
  let answer = deterministicAskAnswer(retrieval.evidence);
  let answerGeneration = { invoked: false, durationMs: 0 };
  if (provider) {
    try {
      const answerStartedAt = nowMs();
      answerGeneration.invoked = true;
      answer = await provider.generateTrainerResponse({
        systemPrompt: buildAskSophiaPrompt(retrieval.evidence),
        messages: [{ role: "learner", content: input.question }],
      });
      answerGeneration.durationMs = Math.round(nowMs() - answerStartedAt);
      answer = sanitizeEvidenceReferences(answer, retrieval.evidence.map((item) => item.evidenceId));
      if (!answer) answer = deterministicAskAnswer(retrieval.evidence);
    } catch (error) {
      answerGeneration.durationMs = answerGeneration.durationMs || Math.round(nowMs() - routeStartedAt);
      console.warn("Ask Sophia provider failed; deterministic grounded fallback active", { provider: provider.name, errorType: error instanceof Error ? error.name : "UnknownError" });
      answer = deterministicAskAnswer(retrieval.evidence);
    }
  }

  const payload: AskSophiaResponse = {
    mode: "ASK",
    answer,
    sources: retrieval.evidence.map(toAskSource),
    insufficientEvidence: false,
    confidence: retrieval.confidence,
    debugTimings: makeDebugTimings(answerGeneration),
  };
  response.json(payload);
});
