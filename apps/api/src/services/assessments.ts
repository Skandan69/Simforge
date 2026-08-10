import type {
  AssessmentAssignmentStatus,
  AssessmentStatus,
  SimulationSessionStatus,
  SimulationStatus,
  UserRole,
} from "@simforge/shared";

export const ASSESSMENT_AUTHOR_ROLES: UserRole[] = ["Owner", "Admin", "Trainer"];
export const ASSESSMENT_ASSIGNMENT_ROLES: UserRole[] = ["Owner", "Admin", "Trainer", "Manager"];

export function canManageAssessments(role: UserRole) {
  return ASSESSMENT_AUTHOR_ROLES.includes(role);
}

export function canAssignAssessments(role: UserRole) {
  return ASSESSMENT_ASSIGNMENT_ROLES.includes(role);
}

export function canLearnerAccessAssessmentAssignment(
  userId: string,
  learnerId: string,
) {
  return userId === learnerId;
}

export function assertAssessmentSimulationCompatible(input: {
  assessmentStatus: AssessmentStatus;
  simulationStatus: SimulationStatus;
}) {
  if (input.assessmentStatus === "ACTIVE") return input.simulationStatus === "Active";
  return input.simulationStatus !== "Archived";
}

export function deriveAssessmentAssignmentActions(input: {
  assignmentStatus: AssessmentAssignmentStatus;
  assessmentStatus: AssessmentStatus;
  simulationStatus: SimulationStatus;
  sessionId: string | null;
  sessionStatus?: SimulationSessionStatus | null;
  evaluationId?: string | null;
  coachingInsightId?: string | null;
}) {
  const runnable =
    input.assessmentStatus === "ACTIVE" && input.simulationStatus === "Active";
  const reportAvailable = Boolean(input.sessionId && input.evaluationId);
  return {
    canStart: input.assignmentStatus === "ASSIGNED" && runnable,
    canContinue:
      input.assignmentStatus === "IN_PROGRESS" &&
      runnable &&
      Boolean(input.sessionId) &&
      input.sessionStatus === "IN_PROGRESS",
    reportAvailable,
    coachAvailable: Boolean(input.sessionId && input.coachingInsightId),
  };
}

export function deriveAssessmentResult(input: {
  overallScore: number | null | undefined;
  passingScore: number;
}) {
  if (input.overallScore === null || input.overallScore === undefined)
    return { overallScore: null, passed: null };
  const overallScore = Math.round(input.overallScore);
  return { overallScore, passed: overallScore >= input.passingScore };
}

export function assessmentAssignmentScope(organizationId: string, learnerId: string) {
  return { organizationId, learnerId } as const;
}
