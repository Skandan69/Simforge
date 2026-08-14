import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canAssignDevelopmentPaths,
  canLearnerAccessDevelopmentPathAssignment,
  canManageDevelopmentPaths,
  deriveAssessmentStepStatus,
  derivePracticeStepStatus,
  nextAssignmentStatus,
  summarizePathProgress,
} from "./development-paths.js";

test("development path permissions separate creation, assignment, and learner access", () => {
  for (const role of ["Owner", "Admin", "Trainer"] as const) assert.equal(canManageDevelopmentPaths(role), true, role);
  assert.equal(canManageDevelopmentPaths("Manager"), false);
  assert.equal(canManageDevelopmentPaths("Learner"), false);
  for (const role of ["Owner", "Admin", "Trainer", "Manager"] as const) assert.equal(canAssignDevelopmentPaths(role), true, role);
  assert.equal(canAssignDevelopmentPaths("Learner"), false);
  assert.equal(canLearnerAccessDevelopmentPathAssignment("learner-a", "learner-a"), true);
  assert.equal(canLearnerAccessDevelopmentPathAssignment("learner-a", "learner-b"), false);
});

test("practice step status is derived from existing practice evidence", () => {
  assert.equal(derivePracticeStepStatus({ assignmentStatus: null, simulationStatus: "Active", sessionStatus: null, evaluationId: null }), "NOT_STARTED");
  assert.equal(derivePracticeStepStatus({ assignmentStatus: "IN_PROGRESS", simulationStatus: "Active", sessionStatus: "IN_PROGRESS", evaluationId: null }), "IN_PROGRESS");
  assert.equal(derivePracticeStepStatus({ assignmentStatus: "COMPLETED", simulationStatus: "Active", sessionStatus: "COMPLETED", evaluationId: "evaluation-1" }), "COMPLETED");
  assert.equal(derivePracticeStepStatus({ assignmentStatus: "ASSIGNED", simulationStatus: "Archived", sessionStatus: null, evaluationId: null }), "UNAVAILABLE");
});

test("assessment failure requires reassessment instead of satisfying required path step", () => {
  assert.equal(deriveAssessmentStepStatus({ assignmentStatus: "COMPLETED", assessmentStatus: "ACTIVE", attemptPassed: true, reportAvailable: true }), "COMPLETED");
  assert.equal(deriveAssessmentStepStatus({ assignmentStatus: "COMPLETED", assessmentStatus: "ACTIVE", attemptPassed: false, reportAvailable: true }), "NEEDS_REASSESSMENT");
  assert.equal(deriveAssessmentStepStatus({ assignmentStatus: "IN_PROGRESS", assessmentStatus: "ACTIVE", attemptPassed: null, reportAvailable: false }), "IN_PROGRESS");
  assert.equal(deriveAssessmentStepStatus({ assignmentStatus: "ASSIGNED", assessmentStatus: "ARCHIVED", attemptPassed: null, reportAvailable: false }), "UNAVAILABLE");
});

test("path progress is sequential and completes only when required steps are complete", () => {
  const summary = summarizePathProgress([
    { required: true, status: "COMPLETED", title: "Practice" },
    { required: true, status: "NEEDS_REASSESSMENT", title: "Assessment" },
    { required: false, status: "COMPLETED", title: "Optional" },
  ]);
  assert.deepEqual(summary, {
    completedRequiredSteps: 1,
    totalRequiredSteps: 2,
    percentComplete: 50,
    currentStepTitle: "Assessment",
    currentStepStatus: "NEEDS_REASSESSMENT",
  });
  assert.equal(nextAssignmentStatus({ currentStatus: "ASSIGNED", completedRequiredSteps: 1, totalRequiredSteps: 2, hasStartedStep: true }), "IN_PROGRESS");
  assert.equal(nextAssignmentStatus({ currentStatus: "IN_PROGRESS", completedRequiredSteps: 2, totalRequiredSteps: 2, hasStartedStep: true }), "COMPLETED");
  assert.equal(nextAssignmentStatus({ currentStatus: "CANCELLED", completedRequiredSteps: 2, totalRequiredSteps: 2, hasStartedStep: true }), "CANCELLED");
});
