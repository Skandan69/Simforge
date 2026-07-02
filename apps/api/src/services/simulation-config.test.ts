import assert from "node:assert/strict";
import test from "node:test";
import { archiveSimulationData, duplicateSimulationIdentity, isKnowledgeBaseSelectionValid, scopedSimulationMutation, simulationRelations } from "./simulation-config.js";

test("simulation creation normalizes objectives and de-duplicates links", () => {
  const relations = simulationRelations({ objectives: [" Verify identity ", "Show empathy"], knowledgeBaseIds: ["kb-1", "kb-1", "kb-2"], criterionIds: ["c-1", "c-1"] });
  assert.deepEqual(relations.objectives.create, [{ title: "Verify identity", sortOrder: 0 }, { title: "Show empathy", sortOrder: 1 }]);
  assert.deepEqual(relations.knowledgeBases.create, [{ knowledgeBaseId: "kb-1" }, { knowledgeBaseId: "kb-2" }]);
  assert.deepEqual(relations.evaluationCriteria.create, [{ criterionId: "c-1" }]);
});

test("archive and delete mutations remain organization scoped", () => {
  assert.deepEqual(scopedSimulationMutation("simulation-1", "organization-1"), { where: { id: "simulation-1", organizationId: "organization-1" } });
  assert.deepEqual(archiveSimulationData, { status: "Archived" });
});

test("simulation duplication always produces an editable draft copy", () => {
  assert.deepEqual(duplicateSimulationIdentity("Customer escalation"), { title: "Customer escalation (Copy)", status: "Draft" });
});

test("knowledge is optional only when no active knowledge bases are available", () => {
  assert.equal(isKnowledgeBaseSelectionValid([], 0, 0), true);
  assert.equal(isKnowledgeBaseSelectionValid([], 0, 1), false);
  assert.equal(isKnowledgeBaseSelectionValid(["kb-1"], 1, 2), true);
  assert.equal(isKnowledgeBaseSelectionValid(["kb-1"], 0, 2), false);
});
