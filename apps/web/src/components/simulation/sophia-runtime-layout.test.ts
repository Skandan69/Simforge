import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./sophia-simulation-run.tsx", import.meta.url)), "utf8");

test("runtime keeps avatar and conversation in one connected desktop grid", () => {
  assert.match(source, /grid items-start gap-4 lg:grid-cols-\[minmax\(0,1fr\)_300px\]/u);
  assert.match(source, /aria-label="Sophia avatar"|<SophiaAvatarStage/u);
  assert.match(source, /aria-label="Simulation conversation"/u);
  assert.match(source, /lg:col-start-1 lg:row-start-2/u);
});

test("runtime keeps controls accessible and guidance in the right rail", () => {
  for (const label of ["Hold to speak to Sophia", "Replay Sophia's last response", "End simulation and generate report"]) assert.match(source, new RegExp(`aria-label="${label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}"`, "u"));
  assert.match(source, /muted \? "Unmute Sophia" : "Mute Sophia"/u);
  for (const panel of ["LiveCoachingPanel", "Coaching tip", "Scenario"]) assert.match(source, new RegExp(panel, "u"));
  assert.match(source, /order-3 space-y-4 lg:col-start-2/u);
});

test("runtime derives live coaching from persisted learner turns", () => {
  assert.match(source, /deriveLiveCoachingIndicators/u);
  assert.match(source, /message\.role === "learner"/u);
  assert.match(source, /<LiveCoachingPanel indicators=\{liveCoachingIndicators\}/u);
});

test("finishing evaluates before navigating and leaves coaching to the report", () => {
  const evaluateStart = source.indexOf("async function evaluate()");
  const renderStart = source.indexOf("if (loading)", evaluateStart);
  const evaluateSource = source.slice(evaluateStart, renderStart);

  assert.match(evaluateSource, /\/evaluate/u);
  assert.match(evaluateSource, /router\.push/u);
  assert.doesNotMatch(evaluateSource, /\/coach/u);
  assert.match(evaluateSource, /Simulation evaluation failed/u);
});
