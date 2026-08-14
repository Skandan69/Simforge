import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./simulation-sessions.ts", import.meta.url)), "utf8");
const start = source.indexOf('simulationSessionsRouter.post("/",');
const end = source.indexOf('simulationSessionsRouter.get("/:id"', start);
const route = source.slice(start, end);

test("practice assignment session start validates organization learner and simulation scope", () => {
  assert.match(route, /id:\s*assignmentId/u);
  assert.match(route, /organizationId/u);
  assert.match(route, /learnerId:\s*user\.id/u);
  assert.match(route, /simulationId:\s*simulation\.id/u);
  assert.match(route, /PRACTICE_ASSIGNMENT_NOT_FOUND/u);
});

test("practice assignment session start reuses an existing safe linked session", () => {
  assert.match(route, /resolvePracticeAssignmentSessionLink/u);
  assert.match(route, /link\.action === "REUSE"/u);
  assert.match(route, /response\.json\(existingSession\)/u);
  assert.match(route, /existingSession\.learnerId !== user\.id/u);
  assert.match(route, /existingSession\.simulationId !== simulation\.id/u);
  assert.match(route, /PRACTICE_ASSIGNMENT_SESSION_INVALID/u);
});

test("practice assignment session start conditionally links only one newly created session", () => {
  assert.match(route, /practiceAssignment\.updateMany/u);
  assert.match(route, /sessionId:\s*null/u);
  assert.match(route, /linked\.count !== 1/u);
  assert.match(route, /PRACTICE_ASSIGNMENT_SESSION_CONFLICT/u);
  assert.match(route, /catch \(error\)/u);
});
