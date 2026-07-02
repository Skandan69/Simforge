import assert from "node:assert/strict";
import test from "node:test";
import { analyzeKnowledge } from "./service.js";

test("knowledge intelligence classifies sections and marks every result as a suggestion", () => {
  const sections = analyzeKnowledge("Compliance Policy\n\nAgents must verify identity. This mandatory procedure protects customer data.\n\nProduct Overview\n\nThe Premium plan includes priority support and reporting features.");
  assert.equal(sections.length, 2);
  assert.equal(sections[0]?.importance, "Critical");
  assert.ok(sections[0]?.capabilities.includes("Policy Compliance"));
  assert.equal(sections[1]?.sectionType, "ProductInformation");
  assert.ok(sections.every((section) => section.isAiSuggestion));
  assert.ok(sections.every((section) => section.confidence >= 0 && section.confidence <= 1));
});

test("low-signal content remains unknown rather than overstating confidence", () => {
  const [section] = analyzeKnowledge("Quarterly notes\n\nBlue items were discussed on Tuesday.");
  assert.equal(section?.sectionType, "Unknown");
  assert.deepEqual(section?.capabilities, ["Unknown"]);
  assert.equal(section?.confidence, 0.35);
});
