import { Router } from "express";
import { z } from "zod";
import {
  WORKFORCE_CAPABILITIES,
  type AssessmentAssignmentResponse,
  type AssessmentDashboardResponse,
  type AssessmentResponse,
  type CreateAssessmentAssignmentInput,
  type SaveAssessmentInput,
  type UserRole,
  type WorkforceCapability,
} from "@simforge/shared";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { requireAuth } from "../middleware/auth.js";
import { getWorkspaceRequest, requireWorkspace } from "../middleware/workspace.js";
import {
  assertAssessmentSimulationCompatible,
  canAssignAssessments,
  canManageAssessments,
  deriveAssessmentAssignmentActions,
  deriveAssessmentResult,
} from "../services/assessments.js";

const uuidSchema = z.string().uuid();
const assessmentStatuses = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
const saveAssessmentSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).optional().default(""),
  simulationId: uuidSchema,
  capabilities: z.array(z.enum(WORKFORCE_CAPABILITIES)).min(1).max(WORKFORCE_CAPABILITIES.length),
  passingScore: z.number().min(0).max(100),
  status: z.enum(assessmentStatuses).optional().default("DRAFT"),
}) satisfies z.ZodType<SaveAssessmentInput>;
const assignAssessmentSchema = z.object({
  learnerId: uuidSchema,
  assessmentId: uuidSchema,
  reason: z.string().trim().max(1000).optional().default(""),
}) satisfies z.ZodType<CreateAssessmentAssignmentInput>;

export const assessmentsRouter = Router();
assessmentsRouter.use(requireAuth, requireWorkspace);

function displayName(user: { fullName: string | null; email: string }) {
  return user.fullName?.trim() || user.email;
}

function mapAssessment(record: any): AssessmentResponse {
  const completedAttempts = record.attempts?.filter((attempt: any) => attempt.status === "COMPLETED") ?? [];
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    status: record.status,
    passingScore: Math.round(record.passingScore),
    capabilities: record.capabilities as WorkforceCapability[],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    simulation: {
      id: record.simulation.id,
      title: record.simulation.title,
      description: record.simulation.description,
      status: record.simulation.status,
      estimatedMinutes: record.simulation.estimatedMinutes,
    },
    createdBy: {
      id: record.creator.id,
      name: displayName(record.creator),
      email: record.creator.email,
    },
    assignmentCount: record._count?.assignments ?? record.assignments?.length ?? 0,
    completedAttemptCount: completedAttempts.length,
    passCount: completedAttempts.filter((attempt: any) => attempt.passed === true).length,
  };
}

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

const assessmentInclude = {
  simulation: { select: { id: true, title: true, description: true, status: true, estimatedMinutes: true } },
  creator: { select: { id: true, email: true, fullName: true } },
  attempts: { select: { status: true, passed: true } },
  _count: { select: { assignments: true } },
} as const;

const assignmentInclude = {
  assessment: {
    include: {
      simulation: { select: { id: true, title: true, description: true, status: true, estimatedMinutes: true } },
    },
  },
  learner: { select: { id: true, email: true, fullName: true } },
  assigner: { select: { id: true, email: true, fullName: true } },
  attempt: {
    include: {
      simulationSession: {
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
  },
} as const;

function requireAssessmentManager(role: UserRole) {
  if (!canManageAssessments(role))
    throw new HttpError("Learners and Managers cannot create or edit formal assessments", 403, "ASSESSMENT_MANAGE_DENIED");
}

async function assertSimulationForAssessment(simulationId: string, organizationId: string, status: SaveAssessmentInput["status"]) {
  const simulation = await prisma.simulation.findFirst({
    where: { id: simulationId, organizationId },
    select: { id: true, status: true },
  });
  if (!simulation) throw new HttpError("Simulation not found", 404, "SIMULATION_NOT_FOUND");
  if (!assertAssessmentSimulationCompatible({ assessmentStatus: status ?? "DRAFT", simulationStatus: simulation.status }))
    throw new HttpError("Active assessments require an active simulation", 409, "ASSESSMENT_SIMULATION_NOT_ACTIVE");
}

assessmentsRouter.get("/", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  if (!canAssignAssessments(role)) throw new HttpError("Learners can only access their assigned assessments", 403, "ASSESSMENT_LIST_DENIED");
  const [assessments, assignments] = await Promise.all([
    prisma.assessment.findMany({ where: { organizationId }, include: assessmentInclude, orderBy: { updatedAt: "desc" } }),
    prisma.assessmentAssignment.findMany({ where: { organizationId }, include: assignmentInclude, orderBy: { assignedAt: "desc" }, take: 100 }),
  ]);
  const payload: AssessmentDashboardResponse = {
    canManageAssessments: canManageAssessments(role),
    canAssignAssessments: canAssignAssessments(role),
    assessments: assessments.map(mapAssessment),
    assignments: assignments.map(mapAssignment),
  };
  response.json(payload);
});

assessmentsRouter.post("/", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  requireAssessmentManager(role);
  const input = saveAssessmentSchema.parse(request.body);
  await assertSimulationForAssessment(input.simulationId, organizationId, input.status);
  const assessment = await prisma.assessment.create({
    data: {
      organizationId,
      simulationId: input.simulationId,
      title: input.title,
      description: input.description ?? "",
      capabilities: input.capabilities,
      passingScore: input.passingScore,
      status: input.status ?? "DRAFT",
      createdBy: user.id,
    },
    include: assessmentInclude,
  });
  response.status(201).json(mapAssessment(assessment));
});

assessmentsRouter.patch("/:id", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  requireAssessmentManager(role);
  const id = uuidSchema.parse(request.params.id);
  const input = saveAssessmentSchema.partial().parse(request.body);
  const existing = await prisma.assessment.findFirst({ where: { id, organizationId }, include: { simulation: { select: { status: true } } } });
  if (!existing) throw new HttpError("Assessment not found", 404, "ASSESSMENT_NOT_FOUND");
  if (existing.status === "ARCHIVED") throw new HttpError("Archived assessments cannot be edited", 409, "ASSESSMENT_ARCHIVED");
  const nextStatus = input.status ?? existing.status;
  await assertSimulationForAssessment(input.simulationId ?? existing.simulationId, organizationId, nextStatus);
  const assessment = await prisma.assessment.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      simulationId: input.simulationId,
      capabilities: input.capabilities,
      passingScore: input.passingScore,
      status: input.status,
    },
    include: assessmentInclude,
  });
  response.json(mapAssessment(assessment));
});

assessmentsRouter.post("/:id/activate", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  requireAssessmentManager(role);
  const id = uuidSchema.parse(request.params.id);
  const existing = await prisma.assessment.findFirst({ where: { id, organizationId }, include: { simulation: { select: { status: true } } } });
  if (!existing) throw new HttpError("Assessment not found", 404, "ASSESSMENT_NOT_FOUND");
  if (!assertAssessmentSimulationCompatible({ assessmentStatus: "ACTIVE", simulationStatus: existing.simulation.status }))
    throw new HttpError("Only assessments linked to active simulations can be activated", 409, "ASSESSMENT_SIMULATION_NOT_ACTIVE");
  const assessment = await prisma.assessment.update({ where: { id }, data: { status: "ACTIVE" }, include: assessmentInclude });
  response.json(mapAssessment(assessment));
});

assessmentsRouter.post("/:id/archive", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  requireAssessmentManager(role);
  const id = uuidSchema.parse(request.params.id);
  const existing = await prisma.assessment.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!existing) throw new HttpError("Assessment not found", 404, "ASSESSMENT_NOT_FOUND");
  const assessment = await prisma.assessment.update({ where: { id }, data: { status: "ARCHIVED" }, include: assessmentInclude });
  response.json(mapAssessment(assessment));
});

assessmentsRouter.post("/:id/assignments", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  if (!canAssignAssessments(role)) throw new HttpError("You cannot assign assessments", 403, "ASSESSMENT_ASSIGN_DENIED");
  const id = uuidSchema.parse(request.params.id);
  const input = assignAssessmentSchema.omit({ assessmentId: true }).parse(request.body);
  const [assessment, membership] = await Promise.all([
    prisma.assessment.findFirst({ where: { id, organizationId }, include: { simulation: { select: { id: true, status: true } } } }),
    prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: input.learnerId } } }),
  ]);
  if (!assessment) throw new HttpError("Assessment not found", 404, "ASSESSMENT_NOT_FOUND");
  if (assessment.status !== "ACTIVE") throw new HttpError("Only active assessments can be assigned", 409, "ASSESSMENT_NOT_ACTIVE");
  if (assessment.simulation.status !== "Active") throw new HttpError("Inactive simulations cannot be assigned as assessments", 409, "ASSESSMENT_SIMULATION_NOT_ACTIVE");
  if (!membership || membership.role !== "Learner") throw new HttpError("Learner is not available in this organization", 404, "LEARNER_NOT_FOUND");
  const assignment = await prisma.assessmentAssignment.create({
    data: { organizationId, assessmentId: assessment.id, learnerId: input.learnerId, assignedBy: user.id, reason: input.reason ?? "" },
    include: assignmentInclude,
  });
  response.status(201).json(mapAssignment(assignment));
});
