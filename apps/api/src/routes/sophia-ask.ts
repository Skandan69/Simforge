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

const askSchema = z.object({
  question: z.string().trim().min(1).max(4000),
  knowledgeBaseIds: z.array(z.string().uuid()).max(20).optional(),
});

export const sophiaAskRouter = Router();
sophiaAskRouter.use(requireAuth, requireWorkspace);

sophiaAskRouter.post("/ask", async (request, response) => {
  const workspace = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  const input = askSchema.parse(request.body ?? {});

  if (input.knowledgeBaseIds?.length) {
    const activeCount = await prisma.knowledgeBase.count({ where: { id: { in: input.knowledgeBaseIds }, organizationId: workspace.organizationId, status: "Active" } });
    if (activeCount !== new Set(input.knowledgeBaseIds).size) throw new HttpError("One or more knowledge bases are unavailable", 404, "KNOWLEDGE_SCOPE_NOT_FOUND");
  }

  const retrieval = await knowledgeRetrievalService.retrieve({
    scope: { organizationId: workspace.organizationId, userId: user.id, role: workspace.role },
    query: input.question,
    mode: "ASK",
    knowledgeBaseIds: input.knowledgeBaseIds,
  });

  if (retrieval.insufficientEvidence) {
    const payload: AskSophiaResponse = {
      mode: "ASK",
      answer: "I couldn't find sufficient information in your organization's knowledge to answer that confidently.",
      sources: retrieval.evidence.map(toAskSource),
      insufficientEvidence: true,
      confidence: retrieval.confidence,
    };
    response.json(payload);
    return;
  }

  const provider = getAIProvider();
  let answer = deterministicAskAnswer(retrieval.evidence);
  if (provider) {
    try {
      answer = await provider.generateTrainerResponse({
        systemPrompt: buildAskSophiaPrompt(retrieval.evidence),
        messages: [{ role: "learner", content: input.question }],
      });
      answer = sanitizeEvidenceReferences(answer, retrieval.evidence.map((item) => item.evidenceId));
      if (!answer) answer = deterministicAskAnswer(retrieval.evidence);
    } catch (error) {
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
  };
  response.json(payload);
});
