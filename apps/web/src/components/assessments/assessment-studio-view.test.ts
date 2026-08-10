import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./assessment-studio-view.tsx", import.meta.url)), "utf8");

test("assessment studio presents formal readiness separate from practice", () => {
  assert.match(source, /Capability readiness checks/u);
  assert.match(source, /formal readiness evidence/u);
  assert.match(source, /Assessment v1 links exactly one active simulation/u);
});

test("learner assessment actions use assessment-aware Sophia runtime links", () => {
  assert.match(source, /assessmentAssignmentId=\$\{assignment\.id\}/u);
  assert.match(source, /Start assessment/u);
  assert.match(source, /Continue assessment/u);
  assert.match(source, /View results/u);
});
