import { Router } from "express";
import { z } from "zod";
import { WORKFORCE_CAPABILITIES, type ManagerIntelligenceOverviewResponse, type ManagerLearnerCapability, type ManagerLearnerDetailResponse, type ManagerLearnerListResponse, type ManagerLearnerSummary, type PracticeAssignmentListResponse, type PracticeAssignmentResponse, type UserRole, type WorkforceCapability } from "@simforge/shared";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { requireAuth } from "../middleware/auth.js";
import { getWorkspaceRequest, requireWorkspace } from "../middleware/workspace.js";
import { assertActiveSimulationForAssignment, buildPracticeRecommendations, canAccessManagerIntelligence, canManagePracticeAssignments, normalizeScore, orderCapabilities, scoreChange, summarizeLearner, summarizeTeamCapabilities } from "../services/manager-intelligence.js";

const uuidSchema = z.string().uuid();
const createAssignmentSchema = z.object({
  learnerId: uuidSchema,
  simulationId: uuidSchema,
  reason: z.string().trim().max(1000).optional().default(""),
  focusCapability: z.enum(WORKFORCE_CAPABILITIES).nullable().optional(),
});
const updateAssignmentSchema = z.object({ status: z.literal("CANCELLED") });

export const managerIntelligenceRouter = Router();
managerIntelligenceRouter.use(requireAuth, requireWorkspace);
managerIntelligenceRouter.use((request, _response, next) => {
  const { role } = getWorkspaceRequest(request).workspace;
  if (!canAccessManagerIntelligence(role)) {
    throw new HttpError("Learners cannot access manager intelligence", 403, "MANAGER_INTELLIGENCE_DENIED");
  }
  next();
});

function displayName(user: { fullName: string | null; email: string }) {
  return user.fullName?.trim() || user.email;
}

function mapAssignment(record: {
  id: string;
  status: string;
  reason: string;
  focusCapability: string | null;
  assignedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sessionId: string | null;
  learner: { id: string; email: string; fullName: string | null };
  assigner: { id: string; email: string; fullName: string | null };
  simulation: { id: string; title: string; status: string };
}): PracticeAssignmentResponse {
  return {
    id: record.id,
    learner: { id: record.learner.id, name: displayName(record.learner), email: record.learner.email },
    simulation: { id: record.simulation.id, title: record.simulation.title, status: record.simulation.status as PracticeAssignmentResponse["simulation"]["status"] },
    assignedBy: { id: record.assigner.id, name: displayName(record.assigner), email: record.assigner.email },
    sessionId: record.sessionId,
    status: record.status as PracticeAssignmentResponse["status"],
    reason: record.reason,
    focusCapability: record.focusCapability as WorkforceCapability | null,
    assignedAt: record.assignedAt.toISOString(),
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    cancelledAt: record.cancelledAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

async function buildManagerSnapshot(organizationId: string) {
  const [
    organization,
    memberships,
    profiles,
    sessions,
    recentSessions,
    assignments,
    recentCoachingInsights,
    simulations,
  ] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    prisma.membership.findMany({
      where: { organizationId },
      orderBy: { joinedAt: "asc" },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    }),
    prisma.learnerCapabilityProfile.findMany({
      where: { organizationId },
      include: { capabilities: true },
    }),
    prisma.simulationSession.findMany({
      where: { organizationId },
      select: { id: true, learnerId: true, status: true, overallScore: true },
    }),
    prisma.simulationSession.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        learner: { select: { id: true, email: true, fullName: true } },
        simulation: { select: { id: true, title: true } },
      },
    }),
    prisma.practiceAssignment.findMany({
      where: { organizationId },
      orderBy: { assignedAt: "desc" },
      include: {
        learner: { select: { id: true, email: true, fullName: true } },
        assigner: { select: { id: true, email: true, fullName: true } },
        simulation: { select: { id: true, title: true, status: true } },
      },
    }),
    prisma.simulationCoachingInsight.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { learner: { select: { id: true, email: true, fullName: true } } },
    }),
    prisma.simulation.findMany({
      where: { organizationId, status: "Active" },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        objectives: { select: { title: true } },
        evaluationCriteria: { select: { criterion: { select: { name: true } } } },
      },
    }),
  ]);

  const profilesByLearner = new Map(profiles.map((profile) => [profile.learnerId, profile]));
  const sessionsByLearner = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const existing = sessionsByLearner.get(session.learnerId) ?? [];
    existing.push(session);
    sessionsByLearner.set(session.learnerId, existing);
  }
  const openAssignmentsByLearner = new Map<string, number>();
  for (const assignment of assignments) {
    if (assignment.status === "ASSIGNED" || assignment.status === "IN_PROGRESS") {
      openAssignmentsByLearner.set(assignment.learnerId, (openAssignmentsByLearner.get(assignment.learnerId) ?? 0) + 1);
    }
  }

  const learnersWithCapabilities = memberships.map((membership) => {
    const profile = profilesByLearner.get(membership.userId);
    const capabilityRecords = orderCapabilities(profile?.capabilities ?? []);
    const capabilities = WORKFORCE_CAPABILITIES.map((capabilityName): ManagerLearnerCapability => {
      const record = capabilityRecords.find((item) => item.capabilityName === capabilityName);
      return {
        capabilityName,
        currentScore: normalizeScore(record?.currentScore),
        previousScore: normalizeScore(record?.previousScore),
        change: record ? scoreChange(normalizeScore(record.currentScore), normalizeScore(record.previousScore)) : null,
        lastAssessedAt: record?.lastAssessedAt.toISOString() ?? null,
        assessmentCount: record?.assessmentCount ?? 0,
      };
    });
    const learnerSessions = sessionsByLearner.get(membership.userId) ?? [];
    const completedSimulationCount = learnerSessions.filter((session) => session.status === "COMPLETED").length;
    const summary = summarizeLearner({
      id: membership.user.id,
      name: displayName(membership.user),
      email: membership.user.email,
      role: membership.role as UserRole,
      overallScore: normalizeScore(profile?.overallScore),
      previousOverallScore: normalizeScore(profile?.previousOverallScore),
      trend: profile?.trend ?? "NOT_ENOUGH_DATA",
      confidence: profile?.confidence ?? "NONE",
      simulationCount: profile?.simulationCount ?? 0,
      completedSimulationCount,
      lastAssessedAt: profile?.lastAssessedAt?.toISOString() ?? null,
      capabilities,
      openAssignmentCount: openAssignmentsByLearner.get(membership.userId) ?? 0,
    });
    return { summary, capabilities };
  });

  const learners = learnersWithCapabilities.map((item) => item.summary);
  const capabilityOverview = summarizeTeamCapabilities(learnersWithCapabilities);
  const recommendations = buildPracticeRecommendations({ learners, simulations });
  const completedSimulations = sessions.filter((session) => session.status === "COMPLETED").length;
  const inProgressSimulations = sessions.filter((session) => session.status === "IN_PROGRESS").length;
  const completedAssignments = assignments.filter((assignment) => assignment.status === "COMPLETED").length;
  const openAssignments = assignments.filter((assignment) => assignment.status === "ASSIGNED" || assignment.status === "IN_PROGRESS").length;
  const assessedScores = learners.map((learner) => learner.overallScore).filter((score): score is number => score !== null);

  return {
    organization,
    learners,
    learnersWithCapabilities,
    capabilityOverview,
    assignments,
    recommendations,
    recentCoachingInsights,
    recentSimulations: recentSessions.map((session) => ({
      id: session.id,
      learnerId: session.learnerId,
      learnerName: displayName(session.learner),
      simulationId: session.simulationId,
      simulationTitle: session.simulation.title,
      status: session.status,
      overallScore: normalizeScore(session.overallScore),
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString() ?? null,
    })),
    totals: {
      learners: memberships.length,
      completedSimulations,
      inProgressSimulations,
      openAssignments,
      completedAssignments,
      averageCapabilityScore: assessedScores.length
        ? Math.round(assessedScores.reduce((total, score) => total + score, 0) / assessedScores.length)
        : null,
    },
  };
}

managerIntelligenceRouter.get("/overview", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  const snapshot = await buildManagerSnapshot(organizationId);
  const payload: ManagerIntelligenceOverviewResponse = {
    canManageAssignments: canManagePracticeAssignments(role),
    organization: snapshot.organization,
    totals: snapshot.totals,
    capabilityOverview: snapshot.capabilityOverview,
    learnersNeedingAttention: snapshot.learners
      .filter((learner) => learner.followUpStatus === "Needs Practice" || learner.followUpStatus === "Needs Review")
      .slice(0, 8),
    recentSimulations: snapshot.recentSimulations,
    recentCoachingInsights: snapshot.recentCoachingInsights.map((insight) => ({
      id: insight.id,
      sessionId: insight.sessionId,
      learnerId: insight.learnerId,
      learnerName: displayName(insight.learner),
      summary: insight.summary,
      nextBestAction: insight.nextBestAction as ManagerIntelligenceOverviewResponse["recentCoachingInsights"][number]["nextBestAction"],
      createdAt: insight.createdAt.toISOString(),
    })),
    recommendations: snapshot.recommendations,
  };
  response.json(payload);
});

managerIntelligenceRouter.get("/learners", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const snapshot = await buildManagerSnapshot(organizationId);
  const payload: ManagerLearnerListResponse = {
    learners: snapshot.learners.sort((a, b) => {
      const priority: Record<ManagerLearnerSummary["followUpStatus"], number> = { "Needs Review": 0, "Needs Practice": 1, "Not Enough Data": 2, Improving: 3, "Strong Performer": 4 };
      return priority[a.followUpStatus] - priority[b.followUpStatus] || a.name.localeCompare(b.name);
    }),
  };
  response.json(payload);
});

managerIntelligenceRouter.get("/learners/:learnerId", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const learnerId = uuidSchema.parse(request.params.learnerId);
  const snapshot = await buildManagerSnapshot(organizationId);
  const learnerEntry = snapshot.learnersWithCapabilities.find((item) => item.summary.id === learnerId);
  if (!learnerEntry) throw new HttpError("Learner not found", 404, "LEARNER_NOT_FOUND");
  const [history, coachingInsights] = await Promise.all([
    prisma.capabilityAssessmentHistory.findMany({
      where: { profile: { organizationId, learnerId } },
      orderBy: { assessedAt: "desc" },
      take: 50,
      include: { session: { select: { simulation: { select: { title: true } } } } },
    }),
    prisma.simulationCoachingInsight.findMany({
      where: { organizationId, learnerId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);
  const payload: ManagerLearnerDetailResponse = {
    learner: { ...learnerEntry.summary, capabilities: learnerEntry.capabilities },
    recentSimulations: snapshot.recentSimulations.filter((session) => session.learnerId === learnerId),
    capabilityHistory: history.map((item) => ({
      sessionId: item.sessionId,
      capabilityName: item.capabilityName as WorkforceCapability,
      currentScore: normalizeScore(item.currentScore) ?? 0,
      previousScore: normalizeScore(item.previousScore),
      change: scoreChange(normalizeScore(item.currentScore), normalizeScore(item.previousScore)) ?? Math.round(item.change),
      assessedAt: item.assessedAt.toISOString(),
      simulationTitle: item.session.simulation.title,
    })),
    coachingInsights: coachingInsights.map((insight) => ({
      id: insight.id,
      sessionId: insight.sessionId,
      summary: insight.summary,
      strengths: insight.strengths as ManagerLearnerDetailResponse["coachingInsights"][number]["strengths"],
      improvementAreas: insight.improvementAreas as ManagerLearnerDetailResponse["coachingInsights"][number]["improvementAreas"],
      nextBestAction: insight.nextBestAction as ManagerLearnerDetailResponse["coachingInsights"][number]["nextBestAction"],
      createdAt: insight.createdAt.toISOString(),
    })),
    assignments: snapshot.assignments.filter((assignment) => assignment.learnerId === learnerId).map(mapAssignment),
    recommendations: snapshot.recommendations.filter((recommendation) => recommendation.learnerId === learnerId),
  };
  response.json(payload);
});

managerIntelligenceRouter.get("/assignments", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  const assignments = await prisma.practiceAssignment.findMany({
    where: { organizationId },
    orderBy: { assignedAt: "desc" },
    include: {
      learner: { select: { id: true, email: true, fullName: true } },
      assigner: { select: { id: true, email: true, fullName: true } },
      simulation: { select: { id: true, title: true, status: true } },
    },
  });
  const payload: PracticeAssignmentListResponse = {
    canManageAssignments: canManagePracticeAssignments(role),
    assignments: assignments.map(mapAssignment),
  };
  response.json(payload);
});

managerIntelligenceRouter.post("/assignments", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  if (!canManagePracticeAssignments(role)) throw new HttpError("You cannot create practice assignments", 403, "PRACTICE_ASSIGNMENT_DENIED");
  const input = createAssignmentSchema.parse(request.body);
  const [membership, simulation] = await Promise.all([
    prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: input.learnerId } }, include: { user: { select: { id: true, email: true, fullName: true } } } }),
    prisma.simulation.findFirst({ where: { id: input.simulationId, organizationId }, select: { id: true, title: true, status: true } }),
  ]);
  if (!membership) throw new HttpError("Learner is not in this organization", 404, "LEARNER_NOT_FOUND");
  if (!simulation) throw new HttpError("Simulation not found", 404, "SIMULATION_NOT_FOUND");
  if (!assertActiveSimulationForAssignment(simulation.status)) throw new HttpError("Only active simulations can be assigned for learner practice", 409, "SIMULATION_NOT_ACTIVE");
  const assignment = await prisma.practiceAssignment.create({
    data: {
      organizationId,
      learnerId: input.learnerId,
      simulationId: input.simulationId,
      assignedBy: user.id,
      reason: input.reason,
      focusCapability: input.focusCapability ?? null,
    },
    include: {
      learner: { select: { id: true, email: true, fullName: true } },
      assigner: { select: { id: true, email: true, fullName: true } },
      simulation: { select: { id: true, title: true, status: true } },
    },
  });
  response.status(201).json(mapAssignment(assignment));
});

managerIntelligenceRouter.patch("/assignments/:id", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  if (!canManagePracticeAssignments(role)) throw new HttpError("You cannot update practice assignments", 403, "PRACTICE_ASSIGNMENT_DENIED");
  const id = uuidSchema.parse(request.params.id);
  const input = updateAssignmentSchema.parse(request.body);
  const existing = await prisma.practiceAssignment.findFirst({ where: { id, organizationId } });
  if (!existing) throw new HttpError("Practice assignment not found", 404, "PRACTICE_ASSIGNMENT_NOT_FOUND");
  if (existing.status === "COMPLETED") throw new HttpError("Completed practice assignments cannot be cancelled", 409, "PRACTICE_ASSIGNMENT_COMPLETED");
  const assignment = await prisma.practiceAssignment.update({
    where: { id },
    data: { status: input.status, cancelledAt: new Date() },
    include: {
      learner: { select: { id: true, email: true, fullName: true } },
      assigner: { select: { id: true, email: true, fullName: true } },
      simulation: { select: { id: true, title: true, status: true } },
    },
  });
  response.json(mapAssignment(assignment));
});
