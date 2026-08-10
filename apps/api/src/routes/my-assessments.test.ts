import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./my-assessments.ts", import.meta.url)), "utf8");

test("my assessments route is learner and organization scoped", () => {
  assert.match(source, /assessmentAssignmentScope\(organizationId,\s*user\.id\)/u);
  assert.match(source, /canLearnerAccessAssessmentAssignment\(user\.id,\s*assignment\.learnerId\)/u);
});

test("assessment start reuses existing attempt session instead of creating duplicates", () => {
  assert.match(source, /if \(assignment\.attempt\?\.simulationSession\)/u);
  assert.match(source, /response\.json\(assignment\.attempt\.simulationSession\)/u);
  assert.match(source, /transaction\.simulationSession\.create/u);
  assert.match(source, /transaction\.assessmentAttempt\.create/u);
});
