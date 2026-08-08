import assert from "node:assert/strict";
import test from "node:test";
import { buildLearningFactoryDrafts, canPublishLearningFactorySimulation, criterionNamesForCapabilities, learningFactoryScope, mapDraftCapabilities, mapDraftToSimulationInput, publishEligibility, reviewDraftTransition, type LearningFactoryBlueprint, type LearningFactorySection } from "./learning-factory.js";

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

test("publish eligibility blocks unsupported, unapproved, and already-published drafts", () => {
  assert.deepEqual(publishEligibility({ assetType: "SIMULATION", status: "APPROVED" }), { eligible: true });
  assert.equal(publishEligibility({ assetType: "QUESTION_BANK", status: "APPROVED" }).code, "DRAFT_ASSET_TYPE_NOT_SUPPORTED");
  assert.equal(publishEligibility({ assetType: "SIMULATION", status: "DRAFT" }).code, "DRAFT_NOT_APPROVED");
  assert.equal(publishEligibility({ assetType: "SIMULATION", status: "PUBLISHED" }).code, "DRAFT_ALREADY_PUBLISHED");
  assert.equal(publishEligibility({ assetType: "SIMULATION", status: "APPROVED", publishedSimulationId: "simulation-1" }).code, "DRAFT_ALREADY_PUBLISHED");
});

test("Learning Factory simulation publishing role policy denies learners only", () => {
  for (const role of ["Owner", "Admin", "Trainer", "Manager"] as const) assert.equal(canPublishLearningFactorySimulation(role), true, role);
  assert.equal(canPublishLearningFactorySimulation("Learner"), false);
});

test("draft-to-simulation mapping keeps trainer review as a Simulation Studio draft with knowledge provenance links", () => {
  const input = mapDraftToSimulationInput({
    draft: {
      title: "Practice: Identity verification",
      description: "Review-required scenario draft.",
      capabilityMappings: ["Policy Compliance", "Communication"],
      payload: {
        scenarioSetup: "A customer asks to bypass two-factor verification.",
        objectives: ["Verify identity", "Escalate exceptions"],
        successCriteria: "Use two approved factors before disclosing account information.",
        suggestedDifficulty: "Advanced",
      },
    },
    blueprint: { industry: "Banking" },
    source: { knowledgeBaseId: "knowledge-base-1", knowledgeBase: { name: "Customer Support", department: "Support" } },
    criteriaIds: ["criterion-1", "criterion-2"],
  });
  assert.equal(input.title, "Identity verification");
  assert.equal(input.status, "Draft");
  assert.equal(input.industry, "Banking");
  assert.equal(input.department, "Support");
  assert.equal(input.difficulty, "Advanced");
  assert.deepEqual(input.knowledgeBaseIds, ["knowledge-base-1"]);
  assert.deepEqual(input.criterionIds, ["criterion-1", "criterion-2"]);
  assert.deepEqual(input.objectives, ["Verify identity", "Escalate exceptions"]);
});

test("capability criteria hints preserve evaluation coverage for Sophia and Manager Intelligence", () => {
  assert.deepEqual(criterionNamesForCapabilities(["Policy Compliance"]), ["Compliance", "Process adherence", "Policy Compliance"]);
  assert.ok(criterionNamesForCapabilities(["Communication", "Empathy"]).includes("Empathy"));
  assert.ok(criterionNamesForCapabilities([]).includes("Communication"));
});
