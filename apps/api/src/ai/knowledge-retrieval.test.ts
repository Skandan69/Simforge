import assert from "node:assert/strict";
import test from "node:test";
import { rankKnowledgeSections } from "./knowledge-retrieval.js";

test("knowledge retrieval favors relevant classified sections and respects the limit", () => {
  const sections = [
    { id: "sales", title: "Sales tips", summary: "Discovery questions", sectionType: "BestPractice", importance: "Reference", confidence: 0.9, keywords: ["sales"], capabilities: ["Communication"] },
    { id: "policy", title: "Identity verification", summary: "Verify customer identity before account changes", sectionType: "Policy", importance: "Critical", confidence: 0.8, keywords: ["identity", "customer"], capabilities: ["Policy Compliance"] },
    { id: "product", title: "Premium plan", summary: "Product reporting features", sectionType: "ProductInformation", importance: "Reference", confidence: 0.95, keywords: ["product"], capabilities: ["Product Knowledge"] },
  ];
  const result = rankKnowledgeSections(sections, "customer identity verification policy", 2);
  assert.deepEqual(result.map((section) => section.id), ["policy", "product"]);
});
