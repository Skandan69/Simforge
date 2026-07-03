import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./premium-simulation-report.tsx", import.meta.url)), "utf8");

test("premium report presents every required report section", () => {
  for (const section of ["Executive Summary", "Capability Snapshot", "Conversation Timeline", "Evidence-Based Observations", "Strengths", "Missed Opportunities", "Knowledge Usage", "AI Coach", "Recommended Next Simulation"]) assert.match(source, new RegExp(section, "u"));
});

test("premium report reuses saved evaluation and existing AI Coach", () => {
  assert.match(source, /buildPremiumReport\(session\)/u);
  assert.match(source, /<SimulationCoachingInsight sessionId=\{session\.id\}/u);
  assert.doesNotMatch(source, /\/coach.*method: "POST"/u);
});

test("premium report is printable, responsive, and evidence-forward", () => {
  assert.match(source, /window\.print\(\)/u);
  assert.match(source, /print:hidden/u);
  assert.match(source, /lg:grid-cols/u);
  assert.match(source, /<EvidenceQuote>/u);
  assert.match(source, /Communication Quality/u);
  assert.match(source, /aria-label="Premium simulation report"/u);
});
