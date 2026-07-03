import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./simulation-coaching.ts", import.meta.url)), "utf8");

test("AI Coach route returns deterministic output when generation or persistence fails", () => {
  assert.match(source, /buildDeterministicCoaching\(baseInput\)/u);
  assert.match(source, /transientInsight/u);
  assert.match(source, /generate_or_persist/u);
  assert.match(source, /response\.status\(200\)/u);
});

test("AI Coach failure logging contains safe metadata only", () => {
  const logger = source.slice(source.indexOf("function safeCoachFailure"), source.indexOf("function transientInsight"));
  assert.match(logger, /sessionId/u);
  assert.match(logger, /operation/u);
  assert.match(logger, /errorType/u);
  assert.match(logger, /errorCode/u);
  assert.doesNotMatch(logger, /learnerMessages|message\.content/u);
});
