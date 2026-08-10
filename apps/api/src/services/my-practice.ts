import type {
  CapabilityConfidence,
  CapabilityTrend,
  MyPracticeAssignmentResponse,
  MyPracticeProgressSummary,
  PracticeAssignmentStatus,
  SimulationSessionStatus,
  SimulationStatus,
  WorkforceCapability,
} from "@simforge/shared";

export const ACTIVE_PRACTICE_STATUSES: PracticeAssignmentStatus[] = [
  "ASSIGNED",
  "IN_PROGRESS",
];

export function myPracticeAssignmentScope(organizationId: string, learnerId: string) {
  return { organizationId, learnerId } as const;
}

export function myPracticeBuckets(assignments: MyPracticeAssignmentResponse[]) {
  return {
    needsAttention: assignments.filter((assignment) => assignment.status === "ASSIGNED"),
    inProgress: assignments.filter((assignment) => assignment.status === "IN_PROGRESS"),
    completed: assignments.filter((assignment) => assignment.status === "COMPLETED" || assignment.status === "CANCELLED"),
  };
}

export function deriveAssignmentActions(input: {
  assignmentStatus: PracticeAssignmentStatus;
  simulationStatus: SimulationStatus;
  sessionId: string | null;
  sessionStatus?: SimulationSessionStatus | null;
  evaluationId?: string | null;
  coachingInsightId?: string | null;
}) {
  const simulationAvailable = input.simulationStatus === "Active";
  const reportAvailable = Boolean(input.sessionId && input.evaluationId);
  const coachAvailable = Boolean(input.sessionId && input.coachingInsightId);
  return {
    canStart: input.assignmentStatus === "ASSIGNED" && simulationAvailable,
    canContinue:
      input.assignmentStatus === "IN_PROGRESS" &&
      simulationAvailable &&
      Boolean(input.sessionId) &&
      input.sessionStatus === "IN_PROGRESS",
    reportAvailable,
    coachAvailable,
  };
}

export function summarizeMyPracticeProgress(input: {
  overallScore: number | null;
  previousOverallScore: number | null;
  trend: CapabilityTrend | "NOT_ENOUGH_DATA";
  confidence: CapabilityConfidence | "NONE";
  simulationCount: number;
  lastAssessedAt: string | null;
  capabilities: Array<{
    capabilityName: WorkforceCapability;
    currentScore: number | null;
    assessmentCount: number;
  }>;
}): MyPracticeProgressSummary {
  const assessed = input.capabilities.filter(
    (capability) => capability.currentScore !== null && capability.assessmentCount > 0,
  );
  const recommendedFocusAreas = [...assessed]
    .sort((a, b) => (a.currentScore ?? 0) - (b.currentScore ?? 0))
    .slice(0, 3)
    .map((capability) => capability.capabilityName);
  const change =
    input.overallScore !== null && input.previousOverallScore !== null
      ? Math.round(input.overallScore - input.previousOverallScore)
      : null;
  const weakestScore = assessed[0]?.currentScore ?? null;
  const status =
    !input.simulationCount || input.overallScore === null
      ? "Not enough data"
      : (weakestScore ?? 100) < 70 || input.overallScore < 70
        ? "Needs more practice"
        : input.trend === "IMPROVING" || (change ?? 0) > 0
          ? "Improved"
          : "Stable";
  return {
    status,
    overallScore: input.overallScore,
    previousOverallScore: input.previousOverallScore,
    change,
    trend: input.trend,
    confidence: input.confidence,
    simulationCount: input.simulationCount,
    lastAssessedAt: input.lastAssessedAt,
    recommendedFocusAreas,
  };
}
