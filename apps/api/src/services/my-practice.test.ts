import assert from "node:assert/strict";
import { test } from "node:test";
import { WORKFORCE_CAPABILITIES } from "@simforge/shared";
import type { MyPracticeAssignmentResponse, WorkforceCapability } from "@simforge/shared";
import { deriveAssignmentActions, myPracticeAssignmentScope, myPracticeBuckets, summarizeMyPracticeProgress } from "./my-practice.js";

function assignment(status: MyPracticeAssignmentResponse["status"], overrides: Partial<MyPracticeAssignmentResponse> = {}): MyPracticeAssignmentResponse {
  return {
    assignmentId: `assignment-${status}`,
    simulation: {
      id: "simulation-1",
      title: "Refund practice",
      description: "Handle a customer refund scenario.",
      status: "Active",
      estimatedMinutes: 10,
    },
    status,
    reason: "Practice policy-safe customer response.",
    focusCapability: "Policy Compliance",
    assignedBy: { id: "manager-1", name: "Manager One", email: "manager@example.com" },
    assignedAt: "2026-08-10T00:00:00.000Z",
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    session: null,
    canStart: status === "ASSIGNED",
    canContinue: false,
    reportAvailable: false,
    coachAvailable: false,
    ...overrides,
  };
}

test("my practice scope is always organization and authenticated learner scoped", () => {
  assert.deepEqual(myPracticeAssignmentScope("org-1", "learner-1"), {
    organizationId: "org-1",
    learnerId: "learner-1",
  });
});

test("assignment actions prevent duplicate sessions and expose completed report links", () => {
  assert.deepEqual(deriveAssignmentActions({
    assignmentStatus: "ASSIGNED",
    simulationStatus: "Active",
    sessionId: null,
  }), {
    canStart: true,
    canContinue: false,
    reportAvailable: false,
    coachAvailable: false,
  });
  assert.equal(deriveAssignmentActions({
    assignmentStatus: "IN_PROGRESS",
    simulationStatus: "Active",
    sessionId: "session-1",
    sessionStatus: "IN_PROGRESS",
  }).canContinue, true);
  assert.equal(deriveAssignmentActions({
    assignmentStatus: "IN_PROGRESS",
    simulationStatus: "Active",
    sessionId: null,
    sessionStatus: null,
  }).canContinue, false);
  assert.deepEqual(deriveAssignmentActions({
    assignmentStatus: "COMPLETED",
    simulationStatus: "Active",
    sessionId: "session-1",
    sessionStatus: "COMPLETED",
    evaluationId: "evaluation-1",
    coachingInsightId: "coach-1",
  }), {
    canStart: false,
    canContinue: false,
    reportAvailable: true,
    coachAvailable: true,
  });
});

test("assignments are grouped into learner-facing practice sections", () => {
  const grouped = myPracticeBuckets([
    assignment("ASSIGNED"),
    assignment("IN_PROGRESS"),
    assignment("COMPLETED"),
    assignment("CANCELLED"),
  ]);
  assert.equal(grouped.needsAttention.length, 1);
  assert.equal(grouped.inProgress.length, 1);
  assert.equal(grouped.completed.length, 2);
});

test("progress summary uses existing capability history without fabricating improvement", () => {
  const empty = summarizeMyPracticeProgress({
    overallScore: null,
    previousOverallScore: null,
    trend: "NOT_ENOUGH_DATA",
    confidence: "NONE",
    simulationCount: 0,
    lastAssessedAt: null,
    capabilities: [],
  });
  assert.equal(empty.status, "Not enough data");
  assert.equal(empty.change, null);

  const assessedInput = {
    overallScore: 82,
    previousOverallScore: 76,
    trend: "IMPROVING",
    confidence: "MEDIUM",
    simulationCount: 3,
    lastAssessedAt: "2026-08-10T00:00:00.000Z",
    capabilities: WORKFORCE_CAPABILITIES.map((capabilityName, index) => ({
      capabilityName: capabilityName as WorkforceCapability,
      currentScore: 80 - index,
      assessmentCount: 2,
    })),
  } as const;
  const improved = summarizeMyPracticeProgress(assessedInput);
  assert.equal(improved.status, "Improved");
  assert.equal(improved.change, 6);
  assert.deepEqual(improved.recommendedFocusAreas, ["Decision Making", "Problem Solving", "Empathy"]);

  const needsPractice = summarizeMyPracticeProgress({
    ...assessedInput,
    overallScore: 68,
    previousOverallScore: 69,
    trend: "STABLE",
  });
  assert.equal(needsPractice.status, "Needs more practice");
});
