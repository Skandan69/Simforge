import assert from "node:assert/strict";
import test from "node:test";
import { BLUEPRINT_CAPABILITIES, blueprintApprovalUpdate, blueprintScope, organizationBlueprintSchema } from "./organization-blueprint.js";

const validBlueprint = {
  industry: "Financial Services",
  teamSizeRange: "201–500",
  primaryTrainingGoals: ["Compliance", "Customer Service"],
  priorityCapabilities: BLUEPRINT_CAPABILITIES.map((capability) => ({ capability, priority: "High" as const })),
  criticalDocumentsNotes: "Customer verification and escalation policies.",
  successDefinition: "Resolve customer issues accurately and confidently.",
  costlyMistakes: "Missing identity verification before account changes.",
  nonNegotiables: "Never disclose customer data to an unverified caller.",
};

test("blueprint draft accepts complete organization priorities", () => {
  assert.deepEqual(organizationBlueprintSchema.parse(validBlueprint), validBlueprint);
});

test("blueprint requires one rating for every supported capability", () => {
  assert.equal(organizationBlueprintSchema.safeParse({ ...validBlueprint, priorityCapabilities: validBlueprint.priorityCapabilities.slice(1) }).success, false);
});

test("blueprint persistence scope always includes the organization boundary", () => {
  assert.deepEqual(blueprintScope("organization-a"), { organizationId: "organization-a" });
});

test("blueprint approval uses the approved status transition", () => {
  assert.deepEqual(blueprintApprovalUpdate(), { status: "APPROVED" });
});
