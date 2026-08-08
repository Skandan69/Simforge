import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./manager-intelligence-view.tsx", import.meta.url)), "utf8");
const learnerSource = readFileSync(fileURLToPath(new URL("./learner-detail-view.tsx", import.meta.url)), "utf8");

test("manager intelligence view connects to persisted manager APIs", () => {
  assert.match(source, /Manager Intelligence/u);
  assert.match(source, /\/api\/manager-intelligence\/overview/u);
  assert.match(source, /\/api\/manager-intelligence\/learners/u);
  assert.match(source, /\/api\/manager-intelligence\/assignments/u);
  assert.match(source, /Not enough data/u);
});

test("manager intelligence exposes team capability, follow-up queue, and recommended practice", () => {
  assert.match(source, /Team capability overview/u);
  assert.match(source, /Follow-up queue/u);
  assert.match(source, /Recommended practice/u);
  assert.match(source, /Assign recommended practice/u);
  assert.match(source, /Managers stay in control/u);
});

test("learner detail view shows capability history, coaching, and assignment lifecycle", () => {
  assert.match(learnerSource, /Capability history/u);
  assert.match(learnerSource, /AI Coach insights/u);
  assert.match(learnerSource, /Practice assignments/u);
  assert.ok(learnerSource.includes("/api/manager-intelligence/learners/${learnerId}"));
  assert.match(learnerSource, /run\?start=true&assignmentId=/u);
});
