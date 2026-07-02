import assert from "node:assert/strict";
import test from "node:test";
import { buildLearningFactoryDrafts, learningFactoryScope, mapDraftCapabilities, reviewDraftTransition, type LearningFactoryBlueprint, type LearningFactorySection } from "./learning-factory.js";

const blueprint: LearningFactoryBlueprint = { industry: "Banking", primaryTrainingGoals: ["Compliance"], priorityCapabilities: [{ capability: "Policy Compliance", priority: "High" }], successDefinition: "Make safe decisions", costlyMistakes: "Unauthorized changes", nonNegotiables: "Never skip verification" };
const section = (overrides: Partial<LearningFactorySection> = {}): LearningFactorySection => ({ id: "section-1", documentId: "document-1", title: "Identity verification", summary: "Verify identity with two approved factors.", sectionType: "Policy", importance: "Critical", confidence: 0.91, capabilities: ["Policy Compliance"], ...overrides });

test("generation creates four review-required asset drafts from prioritized knowledge", () => {
  const drafts = buildLearningFactoryDrafts(blueprint, [section()]);
  assert.deepEqual(drafts.map((draft) => draft.assetType), ["SIMULATION", "LEARNING_OBJECTIVE", "QUESTION_BANK", "COACHING_FOCUS"]);
  assert.ok(drafts.every((draft) => draft.payload.generatedDraft === true));
  assert.ok(drafts.every((draft) => draft.generatedFrom === "knowledge-intelligence:section-1:v1"));
});

test("critical and important sections are prioritized while reference content is excluded", () => {
  const drafts = buildLearningFactoryDrafts(blueprint, [section({ id: "reference", importance: "Reference" }), section({ id: "important", importance: "Important", confidence: 0.8 }), section({ id: "critical", confidence: 0.7 })]);
  assert.equal(drafts.length, 8);
  assert.match(drafts[0]!.generatedFrom, /critical/u);
});

test("capability mapping uses section evidence and blueprint priorities as fallback", () => {
  assert.deepEqual(mapDraftCapabilities(section(), blueprint), ["Policy Compliance"]);
  assert.deepEqual(mapDraftCapabilities(section({ sectionType: "Unknown", capabilities: [] }), blueprint), ["Policy Compliance"]);
});

test("repeated generation produces stable duplicate-prevention fingerprints", () => {
  const first = buildLearningFactoryDrafts(blueprint, [section()]);
  const second = buildLearningFactoryDrafts(blueprint, [section()]);
  assert.deepEqual(first.map((draft) => `${draft.assetType}:${draft.generatedFrom}`), second.map((draft) => `${draft.assetType}:${draft.generatedFrom}`));
  assert.equal(new Set(first.map((draft) => `${draft.assetType}:${draft.generatedFrom}`)).size, 4);
});

test("review transitions and tenant scope are explicit", () => {
  assert.equal(reviewDraftTransition("DRAFT", "approve"), "APPROVED");
  assert.equal(reviewDraftTransition("APPROVED", "reject"), "REJECTED");
  assert.throws(() => reviewDraftTransition("PUBLISHED", "reject"));
  assert.deepEqual(learningFactoryScope("draft-a", "org-a"), { id: "draft-a", organizationId: "org-a" });
});
