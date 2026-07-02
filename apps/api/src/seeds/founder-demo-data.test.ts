import assert from "node:assert/strict";
import test from "node:test";
import { organizationBlueprintSchema } from "../services/organization-blueprint.js";
import { FOUNDER_DEMO_IDS, founderDemoBlueprint, founderDemoDocuments, founderDemoSimulation } from "./founder-demo-data.js";

test("founder demo blueprint satisfies production validation", () => {
  assert.equal(organizationBlueprintSchema.safeParse(founderDemoBlueprint).success, true);
});

test("founder demo provides five realistic knowledge documents and intelligence sections", () => {
  assert.equal(founderDemoDocuments.length, 5);
  assert.ok(founderDemoDocuments.every((document) => document.content.length > 150));
  assert.ok(founderDemoDocuments.every((document) => document.sections.length >= 2));
  assert.ok(founderDemoDocuments.some((document) => document.sections.some((section) => section.importance === "Critical")));
});

test("founder demo simulation has complete scenario and evaluation shape", () => {
  assert.match(founderDemoSimulation.title, /refund after return window/iu);
  assert.equal(founderDemoSimulation.status, "Active");
  assert.ok(founderDemoSimulation.objectives.length >= 4);
  assert.deepEqual(founderDemoSimulation.evaluationCriteria, ["Communication", "Policy Compliance", "Empathy", "Decision Making", "Problem Solving"]);
  assert.match(FOUNDER_DEMO_IDS.organization, /^[0-9a-f-]{36}$/u);
});
