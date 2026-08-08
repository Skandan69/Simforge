import { WORKFORCE_CAPABILITIES, type CapabilityConfidence, type CapabilityTrend, type ManagerCapabilitySummary, type ManagerFollowUpStatus, type ManagerLearnerCapability, type ManagerLearnerSummary, type PracticeRecommendation, type SimulationStatus, type UserRole, type WorkforceCapability } from "@simforge/shared";

export const MANAGER_INTELLIGENCE_ROLES: UserRole[] = ["Owner", "Admin", "Trainer", "Manager"];
export const PRACTICE_ASSIGNMENT_ROLES: UserRole[] = ["Owner", "Admin", "Trainer", "Manager"];

export function canAccessManagerIntelligence(role: UserRole) {
  return MANAGER_INTELLIGENCE_ROLES.includes(role);
}

export function canManagePracticeAssignments(role: UserRole) {
  return PRACTICE_ASSIGNMENT_ROLES.includes(role);
}

export function assertActiveSimulationForAssignment(status: SimulationStatus) {
  return status === "Active";
}

export function normalizeScore(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(value)
    : null;
}

export function scoreChange(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  return Math.round(current - previous);
}

export function deriveFollowUpStatus(input: {
  overallScore: number | null;
  trend: CapabilityTrend | "NOT_ENOUGH_DATA";
  simulationCount: number;
  weakestScore: number | null;
  strongestScore: number | null;
}): { status: ManagerFollowUpStatus; reason: string } {
  if (!input.simulationCount || input.overallScore === null) {
    return {
      status: "Not Enough Data",
      reason: "No completed simulation evaluation is available yet.",
    };
  }
  if (input.trend === "DECLINING") {
    return {
      status: "Needs Review",
      reason: "Recent capability history shows a decline that should be reviewed.",
    };
  }
  if ((input.weakestScore ?? 100) < 70 || input.overallScore < 70) {
    return {
      status: "Needs Practice",
      reason: "One or more capability scores are below the practice threshold.",
    };
  }
  if (input.trend === "IMPROVING") {
    return {
      status: "Improving",
      reason: "Recent assessments show positive movement.",
    };
  }
  if (input.overallScore >= 85 && (input.strongestScore ?? 0) >= 85) {
    return {
      status: "Strong Performer",
      reason: "Current scores show strong performance across assessed capabilities.",
    };
  }
  return {
    status: "Needs Practice",
    reason: "Enough evidence exists to recommend another focused practice cycle.",
  };
}

export function orderCapabilities<T extends { capabilityName: string }>(items: T[]) {
  const order = new Map(WORKFORCE_CAPABILITIES.map((name, index) => [name, index]));
  return [...items].sort(
    (a, b) =>
      (order.get(a.capabilityName as WorkforceCapability) ?? 99) -
      (order.get(b.capabilityName as WorkforceCapability) ?? 99),
  );
}

export function summarizeLearner(input: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  overallScore: number | null;
  previousOverallScore: number | null;
  trend: CapabilityTrend | "NOT_ENOUGH_DATA";
  confidence: CapabilityConfidence | "NONE";
  simulationCount: number;
  completedSimulationCount: number;
  lastAssessedAt: string | null;
  capabilities: ManagerLearnerCapability[];
  openAssignmentCount: number;
}): ManagerLearnerSummary {
  const assessed = input.capabilities.filter((capability) => capability.currentScore !== null);
  const strongestCapabilities = [...assessed]
    .sort((a, b) => (b.currentScore ?? 0) - (a.currentScore ?? 0))
    .slice(0, 2)
    .map((capability) => capability.capabilityName);
  const weakestCapabilities = [...assessed]
    .sort((a, b) => (a.currentScore ?? 0) - (b.currentScore ?? 0))
    .slice(0, 2)
    .map((capability) => capability.capabilityName);
  const weakestScore = assessed.length ? assessed.reduce((minimum, item) => Math.min(minimum, item.currentScore ?? minimum), 100) : null;
  const strongestScore = assessed.length ? assessed.reduce((maximum, item) => Math.max(maximum, item.currentScore ?? maximum), 0) : null;
  const followUp = deriveFollowUpStatus({
    overallScore: input.overallScore,
    trend: input.trend,
    simulationCount: input.simulationCount,
    weakestScore,
    strongestScore,
  });
  return {
    id: input.id,
    name: input.name,
    email: input.email,
    role: input.role,
    overallScore: input.overallScore,
    previousOverallScore: input.previousOverallScore,
    trend: input.trend,
    confidence: input.confidence,
    simulationCount: input.simulationCount,
    completedSimulationCount: input.completedSimulationCount,
    lastAssessedAt: input.lastAssessedAt,
    strongestCapabilities,
    weakestCapabilities,
    followUpStatus: followUp.status,
    followUpReason: followUp.reason,
    recommendedFocusCapability: weakestCapabilities[0] ?? null,
    openAssignmentCount: input.openAssignmentCount,
  };
}

export function summarizeTeamCapabilities(learners: Array<{ capabilities: ManagerLearnerCapability[] }>): ManagerCapabilitySummary[] {
  return WORKFORCE_CAPABILITIES.map((capabilityName) => {
    const values = learners
      .map((learner) => learner.capabilities.find((item) => item.capabilityName === capabilityName))
      .filter((item): item is ManagerLearnerCapability => item?.currentScore !== null && item?.currentScore !== undefined);
    if (!values.length) {
      return {
        capabilityName,
        averageScore: null,
        previousAverageScore: null,
        change: null,
        assessmentCount: 0,
        learnerCount: 0,
      };
    }
    const averageScore = Math.round(values.reduce((total, item) => total + (item.currentScore ?? 0), 0) / values.length);
    const previousValues = values.filter((item) => item.previousScore !== null);
    const previousAverageScore = previousValues.length
      ? Math.round(previousValues.reduce((total, item) => total + (item.previousScore ?? 0), 0) / previousValues.length)
      : null;
    return {
      capabilityName,
      averageScore,
      previousAverageScore,
      change: scoreChange(averageScore, previousAverageScore),
      assessmentCount: values.reduce((total, item) => total + item.assessmentCount, 0),
      learnerCount: values.length,
    };
  });
}

export function buildPracticeRecommendations(input: {
  learners: ManagerLearnerSummary[];
  simulations: Array<{
    id: string;
    title: string;
    description: string;
    department: string;
    category: string;
    jobRole: string;
    successCriteria: string;
    status: SimulationStatus;
    objectives: Array<{ title: string }>;
    evaluationCriteria: Array<{ criterion: { name: string } }>;
  }>;
}): PracticeRecommendation[] {
  const activeSimulations = input.simulations.filter((simulation) => simulation.status === "Active");
  return input.learners
    .filter((learner) => ["Needs Practice", "Needs Review", "Not Enough Data"].includes(learner.followUpStatus))
    .slice(0, 8)
    .map((learner) => {
      const capability = learner.recommendedFocusCapability;
      const simulation = capability ? findSimulationForCapability(activeSimulations, capability) : activeSimulations[0];
      return {
        learnerId: learner.id,
        learnerName: learner.name,
        capability,
        simulationId: simulation?.id ?? null,
        simulationTitle: simulation?.title ?? null,
        reason: simulation
          ? `${learner.followUpStatus}: assign a focused simulation to gather more evidence for ${capability ?? "baseline capability"}.`
          : `${learner.followUpStatus}: create or activate a simulation before assigning targeted practice.`,
        evidence: learner.followUpReason,
      };
    });
}

export function findSimulationForCapability<T extends {
  title: string;
  description: string;
  department: string;
  category: string;
  jobRole: string;
  successCriteria: string;
  objectives: Array<{ title: string }>;
  evaluationCriteria: Array<{ criterion: { name: string } }>;
}>(simulations: T[], capability: WorkforceCapability): T | undefined {
  const tokens = capability.toLowerCase().split(/\s+/u);
  return simulations.find((simulation) => {
    const haystack = [
      simulation.title,
      simulation.description,
      simulation.department,
      simulation.category,
      simulation.jobRole,
      simulation.successCriteria,
      ...simulation.objectives.map((objective) => objective.title),
      ...simulation.evaluationCriteria.map((link) => link.criterion.name),
    ].join(" ").toLowerCase();
    return tokens.some((token) => haystack.includes(token));
  }) ?? simulations[0];
}
