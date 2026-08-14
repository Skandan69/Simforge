import { Router } from "express";
import { z } from "zod";
import {
  WORKFORCE_CAPABILITIES,
  type DevelopmentPathAssignmentResponse,
  type DevelopmentPathDashboardResponse,
  type DevelopmentPathResponse,
  type DevelopmentPathStepProgressResponse,
  type DevelopmentPathStepResponse,
  type MyDevelopmentResponse,
  type SaveDevelopmentPathInput,
  type WorkforceCapability,
} from "@simforge/shared";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { requireAuth } from "../middleware/auth.js";
import { getWorkspaceRequest, requireWorkspace } from "../middleware/workspace.js";
import { deriveAssessmentAssignmentActions, deriveAssessmentResult } from "../services/assessments.js";
import { deriveAssignmentActions } from "../services/my-practice.js";
import {
  canAssignDevelopmentPaths,
  canLearnerAccessDevelopmentPathAssignment,
  canManageDevelopmentPaths,
  deriveAssessmentStepStatus,
  derivePracticeStepStatus,
  isStepSuccessfullyComplete,
  nextAssignmentStatus,
  summarizePathProgress,
} from "../services/development-paths.js";

const uuidSchema = z.string().uuid();
const pathStatuses = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
const stepTypes = ["PRACTICE", "ASSESSMENT"] as const;
const savePathSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).optional().default(""),
  targetRole: z.string().trim().max(120).optional().default(""),
  department: z.string().trim().max(120).optional().default(""),
  capabilities: z.array(z.enum(WORKFORCE_CAPABILITIES)).min(1).max(WORKFORCE_CAPABILITIES.length),
  status: z.enum(pathStatuses).optional().default("DRAFT"),
  steps: z.array(z.object({
    type: z.enum(stepTypes),
    sortOrder: z.number().int().min(1).max(50),
    title: z.string().trim().max(160).optional(),
    required: z.boolean().optional().default(true),
    simulationId: uuidSchema.nullish(),
    assessmentId: uuidSchema.nullish(),
  })).max(20),
}) satisfies z.ZodType<SaveDevelopmentPathInput>;
const assignPathSchema = z.object({
  learnerId: uuidSchema,
  reason: z.string().trim().max(1000).optional().default(""),
});

export const developmentPathsRouter = Router();
developmentPathsRouter.use(requireAuth, requireWorkspace);

function displayName(user: { fullName: string | null; email: string }) {
  return user.fullName?.trim() || user.email;
}

const pathInclude = {
  creator: { select: { id: true, email: true, fullName: true } },
  steps: {
    include: {
      simulation: { select: { id: true, title: true, status: true, estimatedMinutes: true, organizationId: true } },
      assessment: { select: { id: true, title: true, status: true, passingScore: true, organizationId: true } },
    },
    orderBy: { sortOrder: "asc" as const },
  },
  _count: { select: { assignments: true } },
} as const;

const assignmentInclude = {
  developmentPath: { include: pathInclude },
  learner: { select: { id: true, email: true, fullName: true } },
  assigner: { select: { id: true, email: true, fullName: true } },
  stepProgress: {
    include: {
      step: {
        include: {
          simulation: { select: { id: true, title: true, status: true, estimatedMinutes: true, organizationId: true } },
          assessment: { select: { id: true, title: true, status: true, passingScore: true, organizationId: true } },
        },
      },
      practiceAssignment: {
        include: {
          simulation: { select: { id: true, title: true, description: true, status: true, estimatedMinutes: true } },
          assigner: { select: { id: true, email: true, fullName: true } },
          session: { select: { id: true, status: true, overallScore: true, completedAt: true, evaluation: { select: { id: true } }, coachingInsight: { select: { id: true } } } },
        },
      },
      assessmentAssignment: {
        include: {
          assessment: { include: { simulation: { select: { id: true, title: true, description: true, status: true, estimatedMinutes: true } } } },
          learner: { select: { id: true, email: true, fullName: true } },
          assigner: { select: { id: true, email: true, fullName: true } },
          attempt: { include: { simulationSession: { select: { id: true, status: true, overallScore: true, completedAt: true, evaluation: { select: { id: true } }, coachingInsight: { select: { id: true } } } } } },
        },
      },
    },
    orderBy: { step: { sortOrder: "asc" as const } },
  },
} as const;

function mapStep(step: any): DevelopmentPathStepResponse {
  return {
    id: step.id,
    type: step.type,
    sortOrder: step.sortOrder,
    title: step.title,
    required: step.required,
    simulation: step.simulation ? { id: step.simulation.id, title: step.simulation.title, status: step.simulation.status, estimatedMinutes: step.simulation.estimatedMinutes } : null,
    assessment: step.assessment ? { id: step.assessment.id, title: step.assessment.title, status: step.assessment.status, passingScore: Math.round(step.assessment.passingScore) } : null,
  };
}

function mapPath(path: any): DevelopmentPathResponse {
  return {
    id: path.id,
    title: path.title,
    description: path.description,
    targetRole: path.targetRole,
    department: path.department,
    capabilities: path.capabilities as WorkforceCapability[],
    status: path.status,
    createdAt: path.createdAt.toISOString(),
    updatedAt: path.updatedAt.toISOString(),
    createdBy: { id: path.creator.id, name: displayName(path.creator), email: path.creator.email },
    steps: path.steps.map(mapStep),
    assignmentCount: path._count?.assignments ?? path.assignments?.length ?? 0,
  };
}

function mapPractice(record: any) {
  if (!record) return null;
  const actions = deriveAssignmentActions({
    assignmentStatus: record.status,
    simulationStatus: record.simulation.status,
    sessionId: record.sessionId,
    sessionStatus: record.session?.status ?? null,
    evaluationId: record.session?.evaluation?.id ?? null,
    coachingInsightId: record.session?.coachingInsight?.id ?? null,
  });
  const assignment = {
    assignmentId: record.id,
    simulation: { id: record.simulation.id, title: record.simulation.title, description: record.simulation.description, status: record.simulation.status, estimatedMinutes: record.simulation.estimatedMinutes },
    status: record.status,
    reason: record.reason,
    focusCapability: record.focusCapability,
    assignedBy: { id: record.assigner.id, name: displayName(record.assigner), email: record.assigner.email },
    assignedAt: record.assignedAt.toISOString(),
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    cancelledAt: record.cancelledAt?.toISOString() ?? null,
    session: record.session ? { id: record.session.id, status: record.session.status, reportAvailable: actions.reportAvailable, coachAvailable: actions.coachAvailable, overallScore: record.session.overallScore === null ? null : Math.round(record.session.overallScore), completedAt: record.session.completedAt?.toISOString() ?? null } : null,
    ...actions,
  };
  return assignment;
}

function mapAssessmentAssignment(record: any) {
  if (!record) return null;
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
      capabilities: record.assessment.capabilities,
      simulation: { id: record.assessment.simulation.id, title: record.assessment.simulation.title, description: record.assessment.simulation.description, status: record.assessment.simulation.status, estimatedMinutes: record.assessment.simulation.estimatedMinutes },
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
    result: { ...result, reportAvailable: actions.reportAvailable, coachAvailable: actions.coachAvailable },
    canStart: actions.canStart,
    canContinue: actions.canContinue,
    reportAvailable: actions.reportAvailable,
  };
}

function stepAction(status: string, practice: ReturnType<typeof mapPractice>, assessment: ReturnType<typeof mapAssessmentAssignment>, locked: boolean) {
  if (locked) return { actionLabel: "Locked", actionHref: null };
  if (practice) {
    if (practice.canContinue && practice.session?.id) return { actionLabel: "Continue practice", actionHref: `/simulation-studio/simulations/${practice.simulation.id}/run?sessionId=${practice.session.id}&assignmentId=${practice.assignmentId}` };
    if (practice.canStart) return { actionLabel: "Start practice", actionHref: `/simulation-studio/simulations/${practice.simulation.id}/run?start=true&assignmentId=${practice.assignmentId}` };
    if (practice.reportAvailable && practice.session?.id) return { actionLabel: "View practice results", actionHref: `/simulation-studio/sessions/${practice.session.id}/report` };
  }
  if (assessment) {
    if (assessment.canContinue && assessment.sessionId) return { actionLabel: "Continue assessment", actionHref: `/simulation-studio/simulations/${assessment.assessment.simulation.id}/run?sessionId=${assessment.sessionId}` };
    if (assessment.canStart) return { actionLabel: "Start assessment", actionHref: `/assessments?assignmentId=${assessment.id}` };
    if (assessment.reportAvailable && assessment.sessionId) return { actionLabel: "View assessment results", actionHref: `/simulation-studio/sessions/${assessment.sessionId}/report` };
  }
  if (status === "NEEDS_REASSESSMENT") return { actionLabel: "Needs reassessment", actionHref: null };
  return { actionLabel: "Start step", actionHref: null };
}

function mapAssignment(record: any): DevelopmentPathAssignmentResponse {
  const progressByStep = new Map(record.stepProgress.map((progress: any) => [progress.stepId, progress]));
  let priorRequiredIncomplete = false;
  const steps: DevelopmentPathStepProgressResponse[] = record.developmentPath.steps.map((step: any) => {
    const progress = progressByStep.get(step.id) as any;
    const practice = mapPractice(progress?.practiceAssignment ?? null);
    const assessment = mapAssessmentAssignment(progress?.assessmentAssignment ?? null);
    const status = step.type === "PRACTICE"
      ? derivePracticeStepStatus({ assignmentStatus: practice?.status ?? null, simulationStatus: step.simulation?.status ?? null, sessionStatus: practice?.session?.status ?? null, evaluationId: practice?.session?.reportAvailable ? "evaluation" : null })
      : deriveAssessmentStepStatus({ assignmentStatus: assessment?.status ?? null, assessmentStatus: step.assessment?.status ?? null, attemptPassed: assessment?.result.passed ?? null, reportAvailable: assessment?.result.reportAvailable ?? false });
    const locked = priorRequiredIncomplete;
    if (step.required && !isStepSuccessfullyComplete(status)) priorRequiredIncomplete = true;
    const action = stepAction(status, practice, assessment, locked);
    return { step: mapStep(step), status, locked, required: step.required, ...action, practiceAssignment: practice, assessmentAssignment: assessment };
  });
  const progress = summarizePathProgress(steps.map((step) => ({ required: step.required, status: step.status, title: step.step.title })));
  return {
    id: record.id,
    developmentPath: mapPath(record.developmentPath),
    learner: { id: record.learner.id, name: displayName(record.learner), email: record.learner.email },
    assignedBy: { id: record.assigner.id, name: displayName(record.assigner), email: record.assigner.email },
    status: record.status,
    reason: record.reason,
    assignedAt: record.assignedAt.toISOString(),
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    cancelledAt: record.cancelledAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    progress,
    steps,
  };
}

async function syncAssignmentStatus(record: any) {
  const mapped = mapAssignment(record);
  const next = nextAssignmentStatus({
    currentStatus: record.status,
    completedRequiredSteps: mapped.progress.completedRequiredSteps,
    totalRequiredSteps: mapped.progress.totalRequiredSteps,
    hasStartedStep: record.stepProgress.length > 0,
  });
  if (next === record.status) return record;
  return prisma.developmentPathAssignment.update({
    where: { id: record.id },
    data: {
      status: next,
      startedAt: next === "IN_PROGRESS" && !record.startedAt ? new Date() : undefined,
      completedAt: next === "COMPLETED" && !record.completedAt ? new Date() : undefined,
    },
    include: assignmentInclude,
  });
}

function validateSteps(input: SaveDevelopmentPathInput, organizationId: string) {
  const orders = new Set<number>();
  for (const step of input.steps) {
    if (orders.has(step.sortOrder)) throw new HttpError("Step order values must be unique", 400, "DEVELOPMENT_PATH_DUPLICATE_STEP_ORDER");
    orders.add(step.sortOrder);
    if (step.type === "PRACTICE" && !step.simulationId) throw new HttpError("Practice steps require a simulation", 400, "DEVELOPMENT_PATH_STEP_TARGET_REQUIRED");
    if (step.type === "ASSESSMENT" && !step.assessmentId) throw new HttpError("Assessment steps require an assessment", 400, "DEVELOPMENT_PATH_STEP_TARGET_REQUIRED");
  }
  return Promise.all([
    prisma.simulation.findMany({ where: { organizationId, id: { in: input.steps.flatMap((step) => step.simulationId ? [step.simulationId] : []) } }, select: { id: true, title: true, status: true } }),
    prisma.assessment.findMany({ where: { organizationId, id: { in: input.steps.flatMap((step) => step.assessmentId ? [step.assessmentId] : []) } }, select: { id: true, title: true, status: true } }),
  ]).then(([simulations, assessments]) => {
    const simulationIds = new Set(simulations.map((simulation) => simulation.id));
    const assessmentIds = new Set(assessments.map((assessment) => assessment.id));
    for (const step of input.steps) {
      if (step.simulationId && !simulationIds.has(step.simulationId)) throw new HttpError("Practice step simulation is not available in this organization", 404, "DEVELOPMENT_PATH_SIMULATION_NOT_FOUND");
      if (step.assessmentId && !assessmentIds.has(step.assessmentId)) throw new HttpError("Assessment step is not available in this organization", 404, "DEVELOPMENT_PATH_ASSESSMENT_NOT_FOUND");
    }
    if (input.status === "ACTIVE") {
      if (!input.steps.length) throw new HttpError("Active development paths require at least one step", 409, "DEVELOPMENT_PATH_EMPTY");
      const inactiveSimulation = simulations.find((simulation) => simulation.status !== "Active");
      if (inactiveSimulation) throw new HttpError("Active development paths require active practice simulations", 409, "DEVELOPMENT_PATH_SIMULATION_NOT_ACTIVE");
      const inactiveAssessment = assessments.find((assessment) => assessment.status !== "ACTIVE");
      if (inactiveAssessment) throw new HttpError("Active development paths require active assessments", 409, "DEVELOPMENT_PATH_ASSESSMENT_NOT_ACTIVE");
    }
  });
}

developmentPathsRouter.get("/", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  if (!canAssignDevelopmentPaths(role)) throw new HttpError("Learners can only access their own development paths", 403, "DEVELOPMENT_PATH_LIST_DENIED");
  const [paths, assignments] = await Promise.all([
    prisma.developmentPath.findMany({ where: { organizationId }, include: pathInclude, orderBy: { updatedAt: "desc" } }),
    prisma.developmentPathAssignment.findMany({ where: { organizationId }, include: assignmentInclude, orderBy: { assignedAt: "desc" }, take: 100 }),
  ]);
  const synced = await Promise.all(assignments.map(syncAssignmentStatus));
  response.json({ canManagePaths: canManageDevelopmentPaths(role), canAssignPaths: canAssignDevelopmentPaths(role), paths: paths.map(mapPath), assignments: synced.map(mapAssignment) } satisfies DevelopmentPathDashboardResponse);
});

developmentPathsRouter.post("/", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  if (!canManageDevelopmentPaths(role)) throw new HttpError("You cannot create development paths", 403, "DEVELOPMENT_PATH_MANAGE_DENIED");
  const input = savePathSchema.parse(request.body);
  await validateSteps(input, organizationId);
  const path = await prisma.developmentPath.create({
    data: {
      organizationId,
      title: input.title,
      description: input.description ?? "",
      targetRole: input.targetRole ?? "",
      department: input.department ?? "",
      capabilities: input.capabilities,
      status: input.status ?? "DRAFT",
      createdBy: user.id,
      steps: { create: input.steps.sort((a, b) => a.sortOrder - b.sortOrder).map((step) => ({ type: step.type, sortOrder: step.sortOrder, title: step.title || (step.type === "PRACTICE" ? "Complete practice" : "Complete assessment"), required: step.required ?? true, simulationId: step.type === "PRACTICE" ? step.simulationId! : null, assessmentId: step.type === "ASSESSMENT" ? step.assessmentId! : null })) },
    },
    include: pathInclude,
  });
  response.status(201).json(mapPath(path));
});

developmentPathsRouter.patch("/:id", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  if (!canManageDevelopmentPaths(role)) throw new HttpError("You cannot edit development paths", 403, "DEVELOPMENT_PATH_MANAGE_DENIED");
  const id = uuidSchema.parse(request.params.id);
  const input = savePathSchema.parse(request.body);
  await validateSteps(input, organizationId);
  const existing = await prisma.developmentPath.findFirst({ where: { id, organizationId }, select: { id: true, status: true } });
  if (!existing) throw new HttpError("Development path not found", 404, "DEVELOPMENT_PATH_NOT_FOUND");
  if (existing.status === "ARCHIVED") throw new HttpError("Archived development paths cannot be edited", 409, "DEVELOPMENT_PATH_ARCHIVED");
  const path = await prisma.$transaction(async (transaction) => {
    await transaction.developmentPathStep.deleteMany({ where: { developmentPathId: id } });
    return transaction.developmentPath.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description ?? "",
        targetRole: input.targetRole ?? "",
        department: input.department ?? "",
        capabilities: input.capabilities,
        status: input.status ?? existing.status,
        steps: { create: input.steps.sort((a, b) => a.sortOrder - b.sortOrder).map((step) => ({ type: step.type, sortOrder: step.sortOrder, title: step.title || (step.type === "PRACTICE" ? "Complete practice" : "Complete assessment"), required: step.required ?? true, simulationId: step.type === "PRACTICE" ? step.simulationId! : null, assessmentId: step.type === "ASSESSMENT" ? step.assessmentId! : null })) },
      },
      include: pathInclude,
    });
  });
  response.json(mapPath(path));
});

developmentPathsRouter.post("/:id/activate", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  if (!canManageDevelopmentPaths(role)) throw new HttpError("You cannot activate development paths", 403, "DEVELOPMENT_PATH_MANAGE_DENIED");
  const id = uuidSchema.parse(request.params.id);
  const path = await prisma.developmentPath.findFirst({ where: { id, organizationId }, include: pathInclude });
  if (!path) throw new HttpError("Development path not found", 404, "DEVELOPMENT_PATH_NOT_FOUND");
  await validateSteps({ title: path.title, description: path.description, targetRole: path.targetRole, department: path.department, capabilities: path.capabilities as WorkforceCapability[], status: "ACTIVE", steps: path.steps.map((step: any) => ({ type: step.type, sortOrder: step.sortOrder, title: step.title, required: step.required, simulationId: step.simulationId, assessmentId: step.assessmentId })) }, organizationId);
  const updated = await prisma.developmentPath.update({ where: { id }, data: { status: "ACTIVE" }, include: pathInclude });
  response.json(mapPath(updated));
});

developmentPathsRouter.post("/:id/archive", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  if (!canManageDevelopmentPaths(role)) throw new HttpError("You cannot archive development paths", 403, "DEVELOPMENT_PATH_MANAGE_DENIED");
  const id = uuidSchema.parse(request.params.id);
  const existing = await prisma.developmentPath.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!existing) throw new HttpError("Development path not found", 404, "DEVELOPMENT_PATH_NOT_FOUND");
  const updated = await prisma.developmentPath.update({ where: { id }, data: { status: "ARCHIVED" }, include: pathInclude });
  response.json(mapPath(updated));
});

developmentPathsRouter.post("/:id/assignments", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  if (!canAssignDevelopmentPaths(role)) throw new HttpError("You cannot assign development paths", 403, "DEVELOPMENT_PATH_ASSIGN_DENIED");
  const id = uuidSchema.parse(request.params.id);
  const input = assignPathSchema.parse(request.body);
  const [path, membership] = await Promise.all([
    prisma.developmentPath.findFirst({ where: { id, organizationId }, include: { steps: true } }),
    prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: input.learnerId } } }),
  ]);
  if (!path) throw new HttpError("Development path not found", 404, "DEVELOPMENT_PATH_NOT_FOUND");
  if (path.status !== "ACTIVE") throw new HttpError("Only active development paths can be assigned", 409, "DEVELOPMENT_PATH_NOT_ACTIVE");
  if (!path.steps.length) throw new HttpError("Development paths require at least one step", 409, "DEVELOPMENT_PATH_EMPTY");
  if (!membership || membership.role !== "Learner") throw new HttpError("Learner is not available in this organization", 404, "LEARNER_NOT_FOUND");
  const existingOpen = await prisma.developmentPathAssignment.findFirst({
    where: { organizationId, developmentPathId: path.id, learnerId: input.learnerId, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
    include: assignmentInclude,
  });
  if (existingOpen) {
    response.json(mapAssignment(existingOpen));
    return;
  }
  const assignment = await prisma.developmentPathAssignment.create({
    data: { organizationId, developmentPathId: path.id, learnerId: input.learnerId, assignedBy: user.id, reason: input.reason ?? "" },
    include: assignmentInclude,
  });
  response.status(201).json(mapAssignment(assignment));
});

developmentPathsRouter.patch("/assignments/:id", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  if (!canAssignDevelopmentPaths(role)) throw new HttpError("You cannot update development path assignments", 403, "DEVELOPMENT_PATH_ASSIGN_DENIED");
  const id = uuidSchema.parse(request.params.id);
  const input = z.object({ status: z.literal("CANCELLED") }).parse(request.body);
  const existing = await prisma.developmentPathAssignment.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!existing) throw new HttpError("Development path assignment not found", 404, "DEVELOPMENT_PATH_ASSIGNMENT_NOT_FOUND");
  const updated = await prisma.developmentPathAssignment.update({ where: { id }, data: { status: input.status, cancelledAt: new Date() }, include: assignmentInclude });
  response.json(mapAssignment(updated));
});

export const myDevelopmentRouter = Router();
myDevelopmentRouter.use(requireAuth, requireWorkspace);

myDevelopmentRouter.get("/", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  const records = await prisma.developmentPathAssignment.findMany({
    where: { organizationId, learnerId: user.id },
    include: assignmentInclude,
    orderBy: [{ status: "asc" }, { assignedAt: "desc" }],
  });
  const synced = await Promise.all(records.map(syncAssignmentStatus));
  const mapped = synced.map(mapAssignment);
  response.json({
    summary: {
      assigned: mapped.filter((item) => item.status === "ASSIGNED").length,
      inProgress: mapped.filter((item) => item.status === "IN_PROGRESS").length,
      completed: mapped.filter((item) => item.status === "COMPLETED" || item.status === "CANCELLED").length,
      total: mapped.length,
    },
    assignments: {
      assigned: mapped.filter((item) => item.status === "ASSIGNED"),
      inProgress: mapped.filter((item) => item.status === "IN_PROGRESS"),
      completed: mapped.filter((item) => item.status === "COMPLETED" || item.status === "CANCELLED"),
    },
  } satisfies MyDevelopmentResponse);
});

myDevelopmentRouter.post("/:assignmentId/steps/:stepId/start", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  const assignmentId = uuidSchema.parse(request.params.assignmentId);
  const stepId = uuidSchema.parse(request.params.stepId);
  const assignment = await prisma.developmentPathAssignment.findFirst({ where: { id: assignmentId, organizationId }, include: assignmentInclude });
  if (!assignment || !canLearnerAccessDevelopmentPathAssignment(user.id, assignment.learnerId)) throw new HttpError("Development path assignment not found", 404, "DEVELOPMENT_PATH_ASSIGNMENT_NOT_FOUND");
  if (assignment.status === "CANCELLED") throw new HttpError("This development path assignment was cancelled", 409, "DEVELOPMENT_PATH_CANCELLED");
  if (assignment.status === "COMPLETED") throw new HttpError("This development path assignment is already complete", 409, "DEVELOPMENT_PATH_COMPLETED");
  if (assignment.developmentPath.status !== "ACTIVE") throw new HttpError("This development path is not active", 409, "DEVELOPMENT_PATH_NOT_ACTIVE");
  const mapped = mapAssignment(assignment);
  const stepView = mapped.steps.find((item) => item.step.id === stepId);
  if (!stepView) throw new HttpError("Development path step not found", 404, "DEVELOPMENT_PATH_STEP_NOT_FOUND");
  if (stepView.locked) throw new HttpError("Complete the previous required step before starting this one", 409, "DEVELOPMENT_PATH_STEP_LOCKED");
  const step = assignment.developmentPath.steps.find((item: any) => item.id === stepId)!;
  const progress = await prisma.$transaction(async (transaction) => {
    if (step.type === "PRACTICE") {
      if (!step.simulation || step.simulation.status !== "Active") throw new HttpError("The linked practice simulation is not active", 409, "DEVELOPMENT_PATH_SIMULATION_NOT_ACTIVE");
      const existing = await transaction.developmentPathStepProgress.findUnique({ where: { pathAssignmentId_stepId: { pathAssignmentId: assignment.id, stepId } }, include: { practiceAssignment: true } });
      if (existing?.practiceAssignment) return existing;
      const reusable = await transaction.practiceAssignment.findFirst({
        where: { organizationId, learnerId: user.id, simulationId: step.simulation.id, status: { in: ["ASSIGNED", "IN_PROGRESS", "COMPLETED"] } },
        orderBy: { assignedAt: "desc" },
        select: { id: true },
      });
      const practice = reusable ?? await transaction.practiceAssignment.create({
        data: { organizationId, learnerId: user.id, simulationId: step.simulation.id, assignedBy: assignment.assignedBy, reason: assignment.reason || `Development path: ${assignment.developmentPath.title}`, focusCapability: assignment.developmentPath.capabilities[0] ?? null },
        select: { id: true },
      });
      await transaction.developmentPathAssignment.update({ where: { id: assignment.id }, data: { status: "IN_PROGRESS", startedAt: assignment.startedAt ?? new Date() } });
      return transaction.developmentPathStepProgress.upsert({
        where: { pathAssignmentId_stepId: { pathAssignmentId: assignment.id, stepId } },
        create: { organizationId, pathAssignmentId: assignment.id, stepId, practiceAssignmentId: practice.id },
        update: { practiceAssignmentId: practice.id },
      });
    }
    if (!step.assessment || step.assessment.status !== "ACTIVE") throw new HttpError("The linked assessment is not active", 409, "DEVELOPMENT_PATH_ASSESSMENT_NOT_ACTIVE");
    const existing = await transaction.developmentPathStepProgress.findUnique({ where: { pathAssignmentId_stepId: { pathAssignmentId: assignment.id, stepId } }, include: { assessmentAssignment: true } });
    if (existing?.assessmentAssignment) return existing;
    const reusable = await transaction.assessmentAssignment.findFirst({
      where: { organizationId, learnerId: user.id, assessmentId: step.assessment.id, status: { in: ["ASSIGNED", "IN_PROGRESS", "COMPLETED"] } },
      orderBy: { assignedAt: "desc" },
      select: { id: true },
    });
    const assessmentAssignment = reusable ?? await transaction.assessmentAssignment.create({
      data: { organizationId, learnerId: user.id, assessmentId: step.assessment.id, assignedBy: assignment.assignedBy, reason: assignment.reason || `Development path: ${assignment.developmentPath.title}` },
      select: { id: true },
    });
    await transaction.developmentPathAssignment.update({ where: { id: assignment.id }, data: { status: "IN_PROGRESS", startedAt: assignment.startedAt ?? new Date() } });
    return transaction.developmentPathStepProgress.upsert({
      where: { pathAssignmentId_stepId: { pathAssignmentId: assignment.id, stepId } },
      create: { organizationId, pathAssignmentId: assignment.id, stepId, assessmentAssignmentId: assessmentAssignment.id },
      update: { assessmentAssignmentId: assessmentAssignment.id },
    });
  });
  response.status(201).json({ progressId: progress.id });
});
