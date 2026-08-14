import { Router } from "express";
import { z } from "zod";
import type { AssessmentAssignmentResponse, MyAssessmentsResponse, WorkforceCapability } from "@simforge/shared";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { requireAuth } from "../middleware/auth.js";
import { getWorkspaceRequest, requireWorkspace } from "../middleware/workspace.js";
import { getAIProvider } from "../ai/provider.js";
import { buildSophiaSystemPrompt } from "../ai/prompt-builder.js";
import { loadSophiaPromptContext } from "../ai/sophia-context.js";
import { generateSophiaReply } from "../ai/sophia-service.js";
import { createPlaceholderOpeningMessage } from "../services/simulation-runtime.js";
import {
  assessmentAssignmentScope,
  canLearnerAccessAssessmentAssignment,
  deriveAssessmentAssignmentActions,
  deriveAssessmentResult,
} from "../services/assessments.js";

const uuidSchema = z.string().uuid();

export const myAssessmentsRouter = Router();
myAssessmentsRouter.use(requireAuth, requireWorkspace);

function displayName(user: { fullName: string | null; email: string }) {
  return user.fullName?.trim() || user.email;
}

const assignmentInclude = {
  assessment: {
    include: {
      simulation: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          estimatedMinutes: true,
          persona: { select: { role: true } },
        },
      },
    },
  },
  learner: { select: { id: true, email: true, fullName: true } },
  assigner: { select: { id: true, email: true, fullName: true } },
  attempt: {
    include: {
      simulationSession: {
        select: {
          id: true,
          organizationId: true,
          simulationId: true,
          learnerId: true,
          status: true,
          startedAt: true,
          completedAt: true,
          overallScore: true,
          createdAt: true,
          updatedAt: true,
          simulation: {
            select: {
              id: true,
              title: true,
              description: true,
              scenarioSetup: true,
              estimatedMinutes: true,
              status: true,
              persona: { select: { id: true, name: true, role: true, tone: true } },
            },
          },
          messages: { orderBy: { createdAt: "asc" as const } },
          evaluation: true,
          capabilityScores: { orderBy: { capabilityName: "asc" as const } },
          coachingInsight: { select: { id: true } },
        },
      },
    },
  },
} as const;

function mapAssignment(record: any): AssessmentAssignmentResponse {
  const session = record.attempt?.simulationSession ?? null;
  const actions = deriveAssessmentAssignmentActions({
    assignmentStatus: record.status,
    assessmentStatus: record.assessment.status,
    simulationStatus: record.assessment.simulation.status,
    sessionId: session?.id ?? null,
    sessionStatus: session?.status ?? null,
    evaluationId: session?.evaluation?.id ?? null,
    coachingInsightId: session?.coachingInsight?.id ?? null,
  });
  const result = deriveAssessmentResult({
    overallScore: record.attempt?.overallScore ?? session?.overallScore ?? null,
    passingScore: record.assessment.passingScore,
  });
  return {
    id: record.id,
    assessment: {
      id: record.assessment.id,
      title: record.assessment.title,
      description: record.assessment.description,
      status: record.assessment.status,
      passingScore: Math.round(record.assessment.passingScore),
      capabilities: record.assessment.capabilities as WorkforceCapability[],
      simulation: {
        id: record.assessment.simulation.id,
        title: record.assessment.simulation.title,
        description: record.assessment.simulation.description,
        status: record.assessment.simulation.status,
        estimatedMinutes: record.assessment.simulation.estimatedMinutes,
      },
    },
    learner: { id: record.learner.id, name: displayName(record.learner), email: record.learner.email },
    assignedBy: { id: record.assigner.id, name: displayName(record.assigner), email: record.assigner.email },
    attemptId: record.attemptId,
    sessionId: session?.id ?? null,
    status: record.status,
    reason: record.reason,
    assignedAt: record.assignedAt.toISOString(),
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    cancelledAt: record.cancelledAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    result: {
      ...result,
      reportAvailable: actions.reportAvailable,
      coachAvailable: actions.coachAvailable,
    },
    canStart: actions.canStart,
    canContinue: actions.canContinue,
    reportAvailable: actions.reportAvailable,
  };
}

function bucket(assignments: AssessmentAssignmentResponse[]): MyAssessmentsResponse["assignments"] {
  return {
    assigned: assignments.filter((item) => item.status === "ASSIGNED"),
    inProgress: assignments.filter((item) => item.status === "IN_PROGRESS"),
    completed: assignments.filter((item) => item.status === "COMPLETED" || item.status === "CANCELLED"),
  };
}

myAssessmentsRouter.get("/", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  const records = await prisma.assessmentAssignment.findMany({
    where: assessmentAssignmentScope(organizationId, user.id),
    include: assignmentInclude,
    orderBy: [{ status: "asc" }, { assignedAt: "desc" }],
  });
  const assignments = records.map(mapAssignment);
  const grouped = bucket(assignments);
  response.json({
    summary: {
      assigned: grouped.assigned.length,
      inProgress: grouped.inProgress.length,
      completed: grouped.completed.length,
      passed: assignments.filter((item) => item.result.passed === true).length,
      total: assignments.length,
    },
    assignments: grouped,
  } satisfies MyAssessmentsResponse);
});

myAssessmentsRouter.post("/:assignmentId/start", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  const assignmentId = uuidSchema.parse(request.params.assignmentId);
  const assignment = await prisma.assessmentAssignment.findFirst({
    where: { id: assignmentId, organizationId },
    include: assignmentInclude,
  });
  if (!assignment || !canLearnerAccessAssessmentAssignment(user.id, assignment.learnerId))
    throw new HttpError("Assessment assignment not found", 404, "ASSESSMENT_ASSIGNMENT_NOT_FOUND");
  if (assignment.status === "CANCELLED")
    throw new HttpError("This assessment assignment was cancelled", 409, "ASSESSMENT_CANCELLED");
  if (assignment.status === "COMPLETED")
    throw new HttpError("This assessment assignment is already complete", 409, "ASSESSMENT_COMPLETED");
  if (assignment.assessment.status !== "ACTIVE")
    throw new HttpError("This assessment is not active", 409, "ASSESSMENT_NOT_ACTIVE");
  if (assignment.assessment.simulation.status !== "Active")
    throw new HttpError("The linked simulation is not active", 409, "ASSESSMENT_SIMULATION_NOT_ACTIVE");
  if (assignment.attempt?.simulationSession) {
    response.json(assignment.attempt.simulationSession);
    return;
  }
  const openingMessage = await generateSophiaReply({
    provider: getAIProvider(),
    systemPrompt: async () => buildSophiaSystemPrompt(await loadSophiaPromptContext({ organizationId, learnerId: user.id, simulationId: assignment.assessment.simulation.id })),
    messages: [{ role: "learner", content: "Begin this formal readiness assessment in the configured counterpart role. Open with one concise, realistic statement or question for the learner." }],
    fallback: () => createPlaceholderOpeningMessage(assignment.assessment.simulation.title, assignment.assessment.simulation.persona?.role),
    personaRole: assignment.assessment.simulation.persona?.role,
  });
  const created = await prisma.$transaction(async (transaction) => {
    const session = await transaction.simulationSession.create({
      data: {
        organizationId,
        simulationId: assignment.assessment.simulation.id,
        learnerId: user.id,
        messages: {
          create: [
            { role: "system", content: `Assessment attempt started for ${assignment.assessment.title}.` },
            { role: "ai", content: openingMessage },
          ],
        },
      },
      select: assignmentInclude.attempt.include.simulationSession.select,
    });
    const attempt = await transaction.assessmentAttempt.create({
      data: {
        organizationId,
        assessmentId: assignment.assessmentId,
        learnerId: user.id,
        simulationSessionId: session.id,
      },
    });
    await transaction.assessmentAssignment.update({
      where: { id: assignment.id },
      data: { status: "IN_PROGRESS", startedAt: new Date(), attemptId: attempt.id },
    });
    return session;
  });
  response.status(201).json(created);
});
