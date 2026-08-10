import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./my-practice-view.tsx", import.meta.url)), "utf8");
const runtimeSource = readFileSync(fileURLToPath(new URL("../simulation/sophia-simulation-run.tsx", import.meta.url)), "utf8");
const dashboardSource = readFileSync(fileURLToPath(new URL("../dashboard/dashboard-view.tsx", import.meta.url)), "utf8");

test("my practice view connects learners to manager-assigned practice", () => {
  assert.match(source, /My Practice/u);
  assert.match(source, /\/api\/my-practice/u);
  assert.match(source, /Needs Attention/u);
  assert.match(source, /In Progress/u);
  assert.match(source, /Completed/u);
  assert.match(source, /View Capability Profile/u);
});

test("my practice links to Sophia runtime, coaching reports, and missing-report states", () => {
  assert.match(source, /practiceActionHref/u);
  assert.match(source, /practiceActionLabel/u);
  assert.match(source, /AI Coach included/u);
  assert.match(source, /simulation-studio\/sessions/u);
});

test("sophia runtime can load an existing session for assignment continuation", () => {
  assert.match(runtimeSource, /sessionId\?: string/u);
  assert.match(runtimeSource, /\/api\/simulation-sessions\/\$\{sessionId\}/u);
  assert.match(runtimeSource, /setMessages\(existing\.messages\)/u);
});

test("dashboard exposes the learner practice entry point", () => {
  assert.match(dashboardSource, /\/api\/my-practice/u);
  assert.match(dashboardSource, /Open My Practice/u);
  assert.match(dashboardSource, /outstanding/u);
});
