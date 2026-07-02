import { Router } from "express";
import type { LearnerCapabilityProfileResponse, WorkforceCapability } from "@simforge/shared";
import { WORKFORCE_CAPABILITIES } from "@simforge/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getWorkspaceRequest, requireWorkspace } from "../middleware/workspace.js";
import { capabilityProfileScope } from "../services/capability-profile.js";

export const capabilityProfileRouter = Router();
capabilityProfileRouter.use(requireAuth, requireWorkspace);

capabilityProfileRouter.get("/", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const { id: learnerId } = getWorkspaceRequest(request).authUser;
  const profile = await prisma.learnerCapabilityProfile.findUnique({
    where: capabilityProfileScope(organizationId, learnerId),
    include: {
      capabilities: true,
      history: { orderBy: { assessedAt: "desc" }, take: 30 },
    },
  });
  if (!profile) { response.json(null); return; }
  const recentSimulations = await prisma.simulationSession.findMany({
    where: { organizationId, learnerId, status: "COMPLETED", overallScore: { not: null } },
    orderBy: { completedAt: "desc" }, take: 5,
    select: { id: true, simulationId: true, overallScore: true, completedAt: true, simulation: { select: { title: true } } },
  });
  const capabilityOrder = new Map(WORKFORCE_CAPABILITIES.map((name, index) => [name, index]));
  const capabilities = [...profile.capabilities].sort((a, b) => (capabilityOrder.get(a.capabilityName as WorkforceCapability) ?? 99) - (capabilityOrder.get(b.capabilityName as WorkforceCapability) ?? 99));
  const payload: LearnerCapabilityProfileResponse = {
    profile: { overallScore: profile.overallScore, previousOverallScore: profile.previousOverallScore, trend: profile.trend, confidence: profile.confidence, simulationCount: profile.simulationCount, lastAssessedAt: profile.lastAssessedAt?.toISOString() ?? null, updatedAt: profile.updatedAt.toISOString() },
    capabilities: capabilities.map((item) => ({ capabilityName: item.capabilityName as WorkforceCapability, currentScore: item.currentScore, previousScore: item.previousScore, change: item.change, lastAssessedAt: item.lastAssessedAt.toISOString(), assessmentCount: item.assessmentCount })),
    history: profile.history.map((item) => ({ sessionId: item.sessionId, capabilityName: item.capabilityName as WorkforceCapability, currentScore: item.currentScore, previousScore: item.previousScore, change: item.change, assessedAt: item.assessedAt.toISOString() })),
    recentSimulations: recentSimulations.map((session) => ({ id: session.id, simulationId: session.simulationId, simulationTitle: session.simulation.title, overallScore: session.overallScore!, completedAt: session.completedAt!.toISOString() })),
    recommendedFocusAreas: [...capabilities].sort((a, b) => a.currentScore - b.currentScore).slice(0, 2).map((item) => item.capabilityName as WorkforceCapability),
  };
  response.json(payload);
});
