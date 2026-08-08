import assert from "node:assert/strict";
import { test } from "node:test";
import type { ManagerLearnerCapability, ManagerLearnerSummary, UserRole, WorkforceCapability } from "@simforge/shared";
import { WORKFORCE_CAPABILITIES } from "@simforge/shared";
import { assertActiveSimulationForAssignment, buildPracticeRecommendations, canAccessManagerIntelligence, canManagePracticeAssignments, deriveFollowUpStatus, summarizeLearner, summarizeTeamCapabilities } from "./manager-intelligence.js";

function capabilities(score: number, weak: string = "Policy Compliance"): ManagerLearnerCapability[] {
  return WORKFORCE_CAPABILITIES.map((capabilityName) => ({
    capabilityName,
    currentScore: capabilityName === weak ? score - 15 : score,
    previousScore: score - 5,
    change: 5,
    lastAssessedAt: new Date("2026-08-08T00:00:00.000Z").toISOString(),
    assessmentCount: 2,
  }));
}

function learner(overrides: Partial<ManagerLearnerSummary> = {}) {
  return {
    id: "learner-1",
    name: "Learner One",
    email: "learner@example.com",
    role: "Learner" as const,
    overallScore: 62,
    previousOverallScore: 58,
    trend: "IMPROVING" as const,
    confidence: "MEDIUM" as const,
    simulationCount: 2,
    completedSimulationCount: 2,
    lastAssessedAt: new Date("2026-08-08T00:00:00.000Z").toISOString(),
    strongestCapabilities: ["Communication"] as WorkforceCapability[],
    weakestCapabilities: ["Policy Compliance"] as WorkforceCapability[],
    followUpStatus: "Needs Practice" as const,
    followUpReason: "One or more capability scores are below the practice threshold.",
    recommendedFocusCapability: "Policy Compliance" as const,
    openAssignmentCount: 0,
    ...overrides,
  };
}

test("manager intelligence is available to organization leaders and denied to learners", () => {
  for (const role of ["Owner", "Admin", "Trainer", "Manager"] as UserRole[]) {
    assert.equal(canAccessManagerIntelligence(role), true, role);
    assert.equal(canManagePracticeAssignments(role), true, role);
  }
  assert.equal(canAccessManagerIntelligence("Learner"), false);
  assert.equal(canManagePracticeAssignments("Learner"), false);
});

test("follow-up queue uses deterministic evidence rules", () => {
  assert.deepEqual(
    deriveFollowUpStatus({ overallScore: null, trend: "NOT_ENOUGH_DATA", simulationCount: 0, weakestScore: null, strongestScore: null }),
    { status: "Not Enough Data", reason: "No completed simulation evaluation is available yet." },
  );
  assert.equal(deriveFollowUpStatus({ overallScore: 82, trend: "DECLINING", simulationCount: 3, weakestScore: 78, strongestScore: 90 }).status, "Needs Review");
  assert.equal(deriveFollowUpStatus({ overallScore: 68, trend: "STABLE", simulationCount: 2, weakestScore: 61, strongestScore: 78 }).status, "Needs Practice");
  assert.equal(deriveFollowUpStatus({ overallScore: 78, trend: "IMPROVING", simulationCount: 2, weakestScore: 72, strongestScore: 84 }).status, "Improving");
  assert.equal(deriveFollowUpStatus({ overallScore: 90, trend: "STABLE", simulationCount: 4, weakestScore: 86, strongestScore: 94 }).status, "Strong Performer");
});

test("learner summary exposes strongest and weakest capabilities without fabricating empty scores", () => {
  const empty = summarizeLearner({
    id: "learner-1",
    name: "Learner One",
    email: "learner@example.com",
    role: "Learner",
    overallScore: null,
    previousOverallScore: null,
    trend: "NOT_ENOUGH_DATA",
    confidence: "NONE",
    simulationCount: 0,
    completedSimulationCount: 0,
    lastAssessedAt: null,
    capabilities: WORKFORCE_CAPABILITIES.map((capabilityName) => ({ capabilityName, currentScore: null, previousScore: null, change: null, lastAssessedAt: null, assessmentCount: 0 })),
    openAssignmentCount: 0,
  });
  assert.equal(empty.followUpStatus, "Not Enough Data");
  assert.deepEqual(empty.strongestCapabilities, []);
  assert.deepEqual(empty.weakestCapabilities, []);

  const assessed = summarizeLearner({
    ...empty,
    overallScore: 72,
    previousOverallScore: 68,
    trend: "IMPROVING",
    confidence: "MEDIUM",
    simulationCount: 2,
    completedSimulationCount: 2,
    capabilities: capabilities(75),
  });
  assert.equal(assessed.weakestCapabilities[0], "Policy Compliance");
  assert.equal(assessed.recommendedFocusCapability, "Policy Compliance");
});

test("team capability aggregation calculates averages and changes from persisted learner values", () => {
  const summary = summarizeTeamCapabilities([
    { capabilities: capabilities(80, "Empathy") },
    { capabilities: capabilities(70, "Empathy") },
  ]);
  const empathy = summary.find((item) => item.capabilityName === "Empathy");
  assert.equal(empathy?.averageScore, 60);
  assert.equal(empathy?.previousAverageScore, 70);
  assert.equal(empathy?.change, -10);
  assert.equal(empathy?.assessmentCount, 4);
});

test("practice recommendations map weak capabilities to active matching simulations", () => {
  const recommendations = buildPracticeRecommendations({
    learners: [learner()],
    simulations: [{
      id: "simulation-1",
      title: "Refund policy compliance practice",
      description: "Practice a policy exception",
      department: "Support",
      category: "Compliance",
      jobRole: "Associate",
      successCriteria: "Follow policy compliance steps",
      status: "Active",
      objectives: [{ title: "Follow policy" }],
      evaluationCriteria: [{ criterion: { name: "Policy Compliance" } }],
    }],
  });
  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].simulationId, "simulation-1");
  assert.equal(recommendations[0].capability, "Policy Compliance");
});

test("practice assignments only allow active simulations", () => {
  assert.equal(assertActiveSimulationForAssignment("Active"), true);
  assert.equal(assertActiveSimulationForAssignment("Draft"), false);
  assert.equal(assertActiveSimulationForAssignment("Archived"), false);
});
