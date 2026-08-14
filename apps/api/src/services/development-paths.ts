import type {
  AssessmentAssignmentResponse,
  DevelopmentPathAssignmentStatus,
  DevelopmentPathStepProgressStatus,
  PracticeAssignmentStatus,
  SimulationStatus,
  UserRole,
} from "@simforge/shared";

export function canManageDevelopmentPaths(role: UserRole) {
  return role === "Owner" || role === "Admin" || role === "Trainer";
}

export function canAssignDevelopmentPaths(role: UserRole) {
  return canManageDevelopmentPaths(role) || role === "Manager";
}

export function developmentPathAssignmentScope(organizationId: string, learnerId: string) {
  return { organizationId, learnerId };
}

export function canLearnerAccessDevelopmentPathAssignment(userId: string, learnerId: string) {
  return userId === learnerId;
}

export function derivePracticeStepStatus(input: {
  assignmentStatus: PracticeAssignmentStatus | null;
  simulationStatus: SimulationStatus | null;
  sessionStatus: "IN_PROGRESS" | "COMPLETED" | "FAILED" | null;
  evaluationId: string | null;
}): DevelopmentPathStepProgressStatus {
  if (input.simulationStatus && input.simulationStatus !== "Active") return "UNAVAILABLE";
  if (!input.assignmentStatus) return "NOT_STARTED";
  if (input.assignmentStatus === "CANCELLED") return "UNAVAILABLE";
  if (input.assignmentStatus === "COMPLETED" || (input.sessionStatus === "COMPLETED" && input.evaluationId)) return "COMPLETED";
  if (input.assignmentStatus === "IN_PROGRESS" || input.sessionStatus === "IN_PROGRESS") return "IN_PROGRESS";
  return "NOT_STARTED";
}

export function deriveAssessmentStepStatus(input: {
  assignmentStatus: AssessmentAssignmentResponse["status"] | null;
  assessmentStatus: AssessmentAssignmentResponse["assessment"]["status"] | null;
  attemptPassed: boolean | null;
  reportAvailable: boolean;
}): DevelopmentPathStepProgressStatus {
  if (input.assessmentStatus && input.assessmentStatus !== "ACTIVE") return "UNAVAILABLE";
  if (!input.assignmentStatus) return "NOT_STARTED";
  if (input.assignmentStatus === "CANCELLED") return "UNAVAILABLE";
  if (input.assignmentStatus === "COMPLETED") {
    if (input.attemptPassed === true) return "COMPLETED";
    if (input.attemptPassed === false) return "NEEDS_REASSESSMENT";
    return input.reportAvailable ? "FAILED" : "IN_PROGRESS";
  }
  if (input.assignmentStatus === "IN_PROGRESS") return "IN_PROGRESS";
  return "NOT_STARTED";
}

export function isStepSuccessfullyComplete(status: DevelopmentPathStepProgressStatus) {
  return status === "COMPLETED";
}

export function canStartStep(input: {
  pathAssignmentStatus: DevelopmentPathAssignmentStatus;
  stepStatus: DevelopmentPathStepProgressStatus;
  locked: boolean;
}) {
  if (input.pathAssignmentStatus === "CANCELLED" || input.pathAssignmentStatus === "COMPLETED") return false;
  if (input.locked) return false;
  return input.stepStatus === "NOT_STARTED" || input.stepStatus === "IN_PROGRESS";
}

export function summarizePathProgress(steps: Array<{ required: boolean; status: DevelopmentPathStepProgressStatus; title: string }>) {
  const required = steps.filter((step) => step.required);
  const completed = required.filter((step) => isStepSuccessfullyComplete(step.status));
  const current = required.find((step) => !isStepSuccessfullyComplete(step.status)) ?? null;
  return {
    completedRequiredSteps: completed.length,
    totalRequiredSteps: required.length,
    percentComplete: required.length ? Math.round((completed.length / required.length) * 100) : 0,
    currentStepTitle: current?.title ?? null,
    currentStepStatus: current?.status ?? null,
  };
}

export function nextAssignmentStatus(input: {
  currentStatus: DevelopmentPathAssignmentStatus;
  completedRequiredSteps: number;
  totalRequiredSteps: number;
  hasStartedStep: boolean;
}): DevelopmentPathAssignmentStatus {
  if (input.currentStatus === "CANCELLED") return "CANCELLED";
  if (input.totalRequiredSteps > 0 && input.completedRequiredSteps === input.totalRequiredSteps) return "COMPLETED";
  if (input.currentStatus === "COMPLETED") return "COMPLETED";
  if (input.hasStartedStep) return "IN_PROGRESS";
  return "ASSIGNED";
}
