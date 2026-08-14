import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./assessments.ts", import.meta.url)), "utf8");

test("assessment routes enforce organization-scoped simulation linking and learner denial", () => {
  assert.match(source, /where:\s*\{\s*id:\s*simulationId,\s*organizationId\s*\}/u);
  assert.match(source, /canManageAssessments\(role\)/u);
  assert.match(source, /canAssignAssessments\(role\)/u);
  assert.match(source, /membership\.role !== "Learner"/u);
});

test("assessment assignment creation only uses active assessments and active simulations", () => {
  assert.match(source, /assessment\.status !== "ACTIVE"/u);
  assert.match(source, /assessment\.simulation\.status !== "Active"/u);
  assert.match(source, /Only active assessments can be assigned/u);
});
