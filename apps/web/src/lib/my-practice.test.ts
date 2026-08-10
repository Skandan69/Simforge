import assert from "node:assert/strict";
import { test } from "node:test";
import type { MyPracticeAssignmentResponse } from "@simforge/shared";
import { practiceActionHref, practiceActionLabel, practiceStatusLabel } from "./my-practice";

function assignment(overrides: Partial<MyPracticeAssignmentResponse> = {}): MyPracticeAssignmentResponse {
  return {
    assignmentId: "assignment-1",
    simulation: {
      id: "simulation-1",
      title: "Refund practice",
      description: "Practice a refund conversation.",
      status: "Active",
      estimatedMinutes: 12,
    },
    status: "ASSIGNED",
    reason: "Practice empathy and policy compliance.",
    focusCapability: "Empathy",
    assignedBy: { id: "manager-1", name: "Manager One", email: "manager@example.com" },
    assignedAt: "2026-08-10T00:00:00.000Z",
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    session: null,
    canStart: true,
    canContinue: false,
    reportAvailable: false,
    coachAvailable: false,
    ...overrides,
  };
}

test("my practice start links use the assignment-aware Sophia runtime", () => {
  assert.equal(
    practiceActionHref(assignment()),
    "/simulation-studio/simulations/simulation-1/run?start=true&assignmentId=assignment-1",
  );
  assert.equal(practiceActionLabel(assignment()), "Start practice");
});

test("my practice continue links preserve the existing session to avoid duplicates", () => {
  const inProgress = assignment({
    status: "IN_PROGRESS",
    session: {
      id: "session-1",
      status: "IN_PROGRESS",
      reportAvailable: false,
      coachAvailable: false,
      overallScore: null,
      completedAt: null,
    },
    canStart: false,
    canContinue: true,
  });
  assert.equal(
    practiceActionHref(inProgress),
    "/simulation-studio/simulations/simulation-1/run?sessionId=session-1&assignmentId=assignment-1",
  );
  assert.equal(practiceActionLabel(inProgress), "Continue practice");
});

test("my practice completed links route learners to the premium report", () => {
  const completed = assignment({
    status: "COMPLETED",
    session: {
      id: "session-1",
      status: "COMPLETED",
      reportAvailable: true,
      coachAvailable: true,
      overallScore: 84,
      completedAt: "2026-08-10T01:00:00.000Z",
    },
    canStart: false,
    reportAvailable: true,
    coachAvailable: true,
  });
  assert.equal(practiceActionHref(completed), "/simulation-studio/sessions/session-1/report");
  assert.equal(practiceActionLabel(completed), "View coaching report");
  assert.equal(practiceStatusLabel("CANCELLED"), "Cancelled");
});
