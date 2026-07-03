import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./simulation-coaching-insight.tsx", import.meta.url)), "utf8");

test("AI Coach success still renders the saved insight", () => {
  assert.match(source, /insight\.summary/u);
  assert.match(source, /insight\.strengths\.map/u);
  assert.match(source, /insight\.nextBestAction/u);
});

test("AI Coach failure renders saved-evaluation fallback without raw errors", () => {
  assert.match(source, /buildReportCoachingFallback/u);
  assert.match(source, /Better response example/u);
  assert.match(source, /Next practice focus/u);
  assert.doesNotMatch(source, /caught\.message|text-destructive/u);
  assert.doesNotMatch(source, /An unexpected error occurred/u);
});
