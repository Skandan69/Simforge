import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./learning-factory-publisher.ts", import.meta.url), "utf8");

test("Learning Factory publisher enforces tenant-scoped draft and source knowledge access", () => {
  assert.match(source, /where:\s*\{\s*id:\s*input\.draftId,\s*organizationId:\s*input\.organizationId\s*\}/u);
  assert.match(source, /sourceDocument/u);
  assert.match(source, /knowledgeBase\.organizationId !== input\.organizationId/u);
  assert.match(source, /knowledgeBase\.status !== "Active"/u);
});

test("Learning Factory publisher prevents duplicate simulation creation", () => {
  assert.match(source, /publishedSimulationId/u);
  assert.match(source, /DRAFT_ALREADY_PUBLISHED/u);
  assert.match(source, /status:\s*"PUBLISHED"/u);
  assert.match(source, /publishedAt:\s*new Date\(\)/u);
});

test("Learning Factory publisher reuses Simulation Studio relationships and preserves provenance", () => {
  assert.match(source, /simulationRelations\(simulationInput\)/u);
  assert.match(source, /versions:\s*\{/u);
  assert.match(source, /source:\s*"LearningFactoryDraft"/u);
  assert.match(source, /draftId:\s*draft\.id/u);
  assert.match(source, /sourceDocumentId:\s*draft\.sourceDocumentId/u);
});

test("Learning Factory publisher creates simulations as drafts for trainer review", () => {
  assert.match(source, /status:\s*"Draft"/u);
  assert.doesNotMatch(source, /status:\s*"Active"/u);
});
