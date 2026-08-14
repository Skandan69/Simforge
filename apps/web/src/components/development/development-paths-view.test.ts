import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./development-paths-view.tsx", import.meta.url)), "utf8");

test("Development Paths UI creates ordered practice and assessment steps", () => {
  assert.match(source, /PRACTICE/u);
  assert.match(source, /ASSESSMENT/u);
  assert.match(source, /sortOrder:\s*1/u);
  assert.match(source, /sortOrder:\s*2/u);
});

test("Development Paths UI reuses existing SimForge assets and assignment APIs", () => {
  assert.match(source, /\/api\/simulations\/dashboard/u);
  assert.match(source, /\/api\/assessments/u);
  assert.match(source, /\/api\/manager-intelligence\/learners/u);
  assert.match(source, /\/api\/development-paths/u);
});

test("Development Paths UI exposes lifecycle and assignment controls without an LMS editor", () => {
  assert.match(source, /Activate/u);
  assert.match(source, /Archive/u);
  assert.match(source, /Assign path/u);
  assert.doesNotMatch(source, /course|SCORM|certificate/iu);
});
