import { Router } from "express";
import { z } from "zod";
import type { SimulationCoachingInsightResponse, WorkforceCapability } from "@simforge/shared";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { requireAuth } from "../middleware/auth.js";
import { getWorkspaceRequest, requireWorkspace } from "../middleware/workspace.js";
import { canEvaluateSession } from "../services/simulation-runtime.js";
import { canReadCoaching, coachingIdentity, coachingReadiness, coachingScope, generateCoachingWithFallback } from "../services/ai-coach.js";

function mapInsight(record: any): SimulationCoachingInsightResponse {
  return { id: record.id, sessionId: record.sessionId, learnerId: record.learnerId, summary: record.summary, strengths: record.strengths, improvementAreas: record.improvementAreas, capabilityChanges: record.capabilityChanges, knowledgeGaps: record.knowledgeGaps, nextBestAction: record.nextBestAction, estimatedImprovement: record.estimatedImprovement, generatedBy: record.generatedBy, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() };
}

async function sessionForCoaching(id: string, organizationId: string) {
  const session = await prisma.simulationSession.findFirst({
    where: coachingScope(id, organizationId),
    include: {
      evaluation: true,
      capabilityScores: true,
      messages: { where: { role: "learner" }, orderBy: { createdAt: "asc" } },
      simulation: { select: { knowledgeBases: { select: { knowledgeBaseId: true } } } },
    },
  });
  if (!session) throw new HttpError("Simulation session not found", 404, "SESSION_NOT_FOUND");
  return session;
}

export const simulationCoachingRouter = Router();
simulationCoachingRouter.use(requireAuth, requireWorkspace);

simulationCoachingRouter.get("/:id/coach", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  const session = await sessionForCoaching(z.string().uuid().parse(request.params.id), organizationId);
  if (!canReadCoaching(role, user.id, session.learnerId)) throw new HttpError("You cannot access coaching for this session", 403, "COACHING_ACCESS_DENIED");
  const insight = await prisma.simulationCoachingInsight.findUnique({ where: coachingIdentity(session.id) });
  if (!insight) throw new HttpError("Coaching insight has not been generated", 404, "COACHING_NOT_FOUND");
  response.json(mapInsight(insight));
});

simulationCoachingRouter.post("/:id/coach", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  const session = await sessionForCoaching(z.string().uuid().parse(request.params.id), organizationId);
  if (!canEvaluateSession(role, user.id, session.learnerId)) throw new HttpError("You cannot generate coaching for this session", 403, "COACHING_GENERATION_DENIED");
  const readiness = coachingReadiness(session.status, Boolean(session.evaluation));
  if (!readiness.ready) throw new HttpError(readiness.reason, 409, "COACHING_REQUIRES_EVALUATION");
  const existing = await prisma.simulationCoachingInsight.findUnique({ where: coachingIdentity(session.id) });
  if (existing) { response.json(mapInsight(existing)); return; }

  const knowledgeBaseIds = session.simulation.knowledgeBases.map((link) => link.knowledgeBaseId);
  const [changes, blueprint, knowledgeSections] = await Promise.all([
    prisma.capabilityAssessmentHistory.findMany({ where: { sessionId: session.id }, orderBy: { capabilityName: "asc" } }),
    prisma.organizationBlueprint.findFirst({ where: { organizationId, status: "APPROVED" }, select: { successDefinition: true, nonNegotiables: true } }),
    knowledgeBaseIds.length ? prisma.knowledgeIntelligenceSection.findMany({ where: { source: { organizationId, document: { knowledgeBaseId: { in: knowledgeBaseIds } } }, importance: { in: ["Critical", "Important"] } }, select: { title: true, summary: true, capabilities: true, source: { select: { documentId: true } } }, orderBy: [{ importance: "asc" }, { confidence: "desc" }], take: 8 }) : [],
  ]);
  const sourceDocumentIds = knowledgeSections.flatMap((section) => section.source.documentId ? [section.source.documentId] : []);
  const learningDrafts = sourceDocumentIds.length ? await prisma.learningFactoryDraft.findMany({ where: { organizationId, status: "APPROVED", sourceDocumentId: { in: sourceDocumentIds } }, select: { title: true, capabilityMappings: true }, orderBy: { updatedAt: "desc" }, take: 12 }) : [];
  const evaluation = session.evaluation!;
  const output = await generateCoachingWithFallback({
    evaluation: { overallScore: evaluation.overallScore, strengths: evaluation.strengths as string[], improvementAreas: evaluation.improvementAreas as string[], recommendedNextPractice: evaluation.recommendedNextPractice },
    capabilityScores: session.capabilityScores.map((score) => ({ capabilityName: score.capabilityName as WorkforceCapability, score: score.score, evidence: score.evidence, recommendation: score.recommendation })),
    capabilityChanges: changes.map((change) => ({ capabilityName: change.capabilityName as WorkforceCapability, currentScore: change.currentScore, previousScore: change.previousScore, change: change.change })),
    learnerMessages: session.messages.map((message) => message.content),
    knowledgeSections: knowledgeSections.map((section) => ({ title: section.title, summary: section.summary, capabilities: section.capabilities })),
    learningDrafts,
    blueprint,
  });
  const insight = await prisma.simulationCoachingInsight.upsert({
    where: coachingIdentity(session.id),
    create: { organizationId, sessionId: session.id, learnerId: session.learnerId, ...output },
    update: {},
  });
  response.status(201).json(mapInsight(insight));
});
