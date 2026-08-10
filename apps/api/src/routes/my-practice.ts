import { Router } from "express";
import { type MyPracticeAssignmentResponse, type MyPracticeResponse, type WorkforceCapability } from "@simforge/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getWorkspaceRequest, requireWorkspace } from "../middleware/workspace.js";
import { deriveAssignmentActions, myPracticeAssignmentScope, myPracticeBuckets, summarizeMyPracticeProgress } from "../services/my-practice.js";

export const myPracticeRouter = Router();
myPracticeRouter.use(requireAuth, requireWorkspace);

function displayName(user: { fullName: string | null; email: string }) {
  return user.fullName ?? user.email;
}

myPracticeRouter.get("/", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  const [assignments, profile] = await Promise.all([
    prisma.practiceAssignment.findMany({
      where: myPracticeAssignmentScope(organizationId, user.id),
      orderBy: [{ status: "asc" }, { assignedAt: "desc" }],
      include: {
        assigner: { select: { id: true, email: true, fullName: true } },
        simulation: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            estimatedMinutes: true,
          },
        },
        session: {
          select: {
            id: true,
            status: true,
            overallScore: true,
            completedAt: true,
            evaluation: { select: { id: true } },
            coachingInsight: { select: { id: true } },
          },
        },
      },
    }),
    prisma.learnerCapabilityProfile.findUnique({
      where: { organizationId_learnerId: { organizationId, learnerId: user.id } },
      include: {
        capabilities: {
          orderBy: { currentScore: "asc" },
          select: { capabilityName: true, currentScore: true, assessmentCount: true },
        },
      },
    }),
  ]);

  const mapped: MyPracticeAssignmentResponse[] = assignments.map((assignment) => {
    const actions = deriveAssignmentActions({
      assignmentStatus: assignment.status,
      simulationStatus: assignment.simulation.status,
      sessionId: assignment.sessionId,
      sessionStatus: assignment.session?.status ?? null,
      evaluationId: assignment.session?.evaluation?.id ?? null,
      coachingInsightId: assignment.session?.coachingInsight?.id ?? null,
    });
    return {
      assignmentId: assignment.id,
      simulation: {
        id: assignment.simulation.id,
        title: assignment.simulation.title,
        description: assignment.simulation.description,
        status: assignment.simulation.status,
        estimatedMinutes: assignment.simulation.estimatedMinutes,
      },
      status: assignment.status,
      reason: assignment.reason,
      focusCapability: assignment.focusCapability as WorkforceCapability | null,
      assignedBy: {
        id: assignment.assigner.id,
        name: displayName(assignment.assigner),
        email: assignment.assigner.email,
      },
      assignedAt: assignment.assignedAt.toISOString(),
      startedAt: assignment.startedAt?.toISOString() ?? null,
      completedAt: assignment.completedAt?.toISOString() ?? null,
      cancelledAt: assignment.cancelledAt?.toISOString() ?? null,
      session: assignment.session
        ? {
            id: assignment.session.id,
            status: assignment.session.status,
            reportAvailable: actions.reportAvailable,
            coachAvailable: actions.coachAvailable,
            overallScore: assignment.session.overallScore === null ? null : Math.round(assignment.session.overallScore),
            completedAt: assignment.session.completedAt?.toISOString() ?? null,
          }
        : null,
      ...actions,
    };
  });
  const buckets = myPracticeBuckets(mapped);
  const payload: MyPracticeResponse = {
    summary: {
      needsAttention: buckets.needsAttention.length,
      inProgress: buckets.inProgress.length,
      completed: buckets.completed.length,
      total: mapped.length,
    },
    progress: summarizeMyPracticeProgress({
      overallScore: profile ? Math.round(profile.overallScore) : null,
      previousOverallScore: profile?.previousOverallScore === null || profile?.previousOverallScore === undefined ? null : Math.round(profile.previousOverallScore),
      trend: profile?.trend ?? "NOT_ENOUGH_DATA",
      confidence: profile?.confidence ?? "NONE",
      simulationCount: profile?.simulationCount ?? 0,
      lastAssessedAt: profile?.lastAssessedAt?.toISOString() ?? null,
      capabilities: (profile?.capabilities ?? []).map((capability) => ({
        capabilityName: capability.capabilityName as WorkforceCapability,
        currentScore: Math.round(capability.currentScore),
        assessmentCount: capability.assessmentCount,
      })),
    }),
    assignments: buckets,
  };
  response.json(payload);
});
