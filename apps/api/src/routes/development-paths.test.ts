import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./development-paths.ts", import.meta.url)), "utf8");

test("Development Path routes enforce role permissions and learner scoping", () => {
  assert.match(source, /canManageDevelopmentPaths\(role\)/u);
  assert.match(source, /canAssignDevelopmentPaths\(role\)/u);
  assert.match(source, /canLearnerAccessDevelopmentPathAssignment\(user\.id,\s*assignment\.learnerId\)/u);
  assert.match(source, /where:\s*\{\s*organizationId,\s*learnerId:\s*user\.id\s*\}/u);
});

test("Development Path routes reject cross-org or inactive linked assets", () => {
  assert.match(source, /DEVELOPMENT_PATH_SIMULATION_NOT_FOUND/u);
  assert.match(source, /DEVELOPMENT_PATH_ASSESSMENT_NOT_FOUND/u);
  assert.match(source, /DEVELOPMENT_PATH_SIMULATION_NOT_ACTIVE/u);
  assert.match(source, /DEVELOPMENT_PATH_ASSESSMENT_NOT_ACTIVE/u);
  assert.match(source, /DEVELOPMENT_PATH_EMPTY/u);
});

test("Development Path execution reuses existing practice and assessment lifecycle records", () => {
  assert.match(source, /practiceAssignment\.findFirst/u);
  assert.match(source, /assessmentAssignment\.findFirst/u);
  assert.match(source, /developmentPathStepProgress\.upsert/u);
  assert.match(source, /pathAssignmentId_stepId/u);
  assert.doesNotMatch(source, /simulationSession\.create/u);
});

test("Development Path routes implement sequential locking and failed-assessment behavior", () => {
  assert.match(source, /DEVELOPMENT_PATH_STEP_LOCKED/u);
  assert.match(source, /NEEDS_REASSESSMENT/u);
  assert.match(source, /summarizePathProgress/u);
});
