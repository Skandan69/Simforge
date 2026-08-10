import assert from "node:assert/strict";
import { test } from "node:test";
import type { UserRole } from "@simforge/shared";
import {
  assertAssessmentSimulationCompatible,
  canAssignAssessments,
  canLearnerAccessAssessmentAssignment,
  canManageAssessments,
  deriveAssessmentAssignmentActions,
  deriveAssessmentResult,
} from "./assessments.js";

test("assessment management roles preserve learner denial", () => {
  for (const role of ["Owner", "Admin", "Trainer"] as UserRole[]) {
    assert.equal(canManageAssessments(role), true, role);
  }
  assert.equal(canManageAssessments("Manager"), false);
  assert.equal(canManageAssessments("Learner"), false);
  for (const role of ["Owner", "Admin", "Trainer", "Manager"] as UserRole[]) {
    assert.equal(canAssignAssessments(role), true, role);
  }
  assert.equal(canAssignAssessments("Learner"), false);
});

test("active assessments require active simulations", () => {
  assert.equal(assertAssessmentSimulationCompatible({ assessmentStatus: "ACTIVE", simulationStatus: "Active" }), true);
  assert.equal(assertAssessmentSimulationCompatible({ assessmentStatus: "ACTIVE", simulationStatus: "Draft" }), false);
  assert.equal(assertAssessmentSimulationCompatible({ assessmentStatus: "DRAFT", simulationStatus: "Draft" }), true);
  assert.equal(assertAssessmentSimulationCompatible({ assessmentStatus: "DRAFT", simulationStatus: "Archived" }), false);
});

test("assessment pass fail uses persisted 0 to 100 evaluation scores", () => {
  assert.deepEqual(deriveAssessmentResult({ overallScore: 82.2, passingScore: 80 }), { overallScore: 82, passed: true });
  assert.deepEqual(deriveAssessmentResult({ overallScore: 69.4, passingScore: 70 }), { overallScore: 69, passed: false });
  assert.deepEqual(deriveAssessmentResult({ overallScore: null, passingScore: 70 }), { overallScore: null, passed: null });
});

test("assessment assignments start and continue only through active formal evidence", () => {
  assert.deepEqual(
    deriveAssessmentAssignmentActions({
      assignmentStatus: "ASSIGNED",
      assessmentStatus: "ACTIVE",
      simulationStatus: "Active",
      sessionId: null,
    }),
    { canStart: true, canContinue: false, reportAvailable: false, coachAvailable: false },
  );
  assert.equal(
    deriveAssessmentAssignmentActions({
      assignmentStatus: "IN_PROGRESS",
      assessmentStatus: "ACTIVE",
      simulationStatus: "Active",
      sessionId: "session-1",
      sessionStatus: "IN_PROGRESS",
    }).canContinue,
    true,
  );
  assert.equal(
    deriveAssessmentAssignmentActions({
      assignmentStatus: "ASSIGNED",
      assessmentStatus: "ARCHIVED",
      simulationStatus: "Active",
      sessionId: null,
    }).canStart,
    false,
  );
});

test("learner assessment assignment scope blocks other learners", () => {
  assert.equal(canLearnerAccessAssessmentAssignment("learner-1", "learner-1"), true);
  assert.equal(canLearnerAccessAssessmentAssignment("learner-1", "learner-2"), false);
});
