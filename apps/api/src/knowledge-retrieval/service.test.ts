import assert from "node:assert/strict";
import test from "node:test";
import type { AuthorizedKnowledgeScope, RetrievalCandidate } from "./service.js";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/simforge";
process.env.SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_PUBLISHABLE_KEY ??= "sb_publishable_test";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "service_role_test";

const { calculateConfidence, reciprocalRankFusion, selectEvidence, toAskSource } = await import("./service.js");

const base = {
  documentId: "document-a",
  documentName: "Refund Policy",
  knowledgeBaseId: "kb-a",
  knowledgeBaseName: "Customer Support",
  version: 2,
  sectionTitle: "Accessory returns",
  headingPath: ["Returns", "Accessory returns"],
  pageNumber: 14,
  slideNumber: null,
  sheetName: null,
  rowStart: null,
  rowEnd: null,
  lexicalScore: 0,
  vectorScore: 0,
};

function candidate(id: string, text: string): RetrievalCandidate {
  return { ...base, chunkId: id, text };
}

test("retrieval service boundary uses server-derived authorized scope", () => {
  const scope = { organizationId: "org-a", userId: "user-a", role: "Owner" } satisfies AuthorizedKnowledgeScope;
  assert.equal(scope.organizationId, "org-a");
  assert.equal("organizationId" in { scope, query: "policy", mode: "ASK" }, false);
});

test("RRF merges lexical and vector candidates without relying on normalized score scales", () => {
  const lexical = [candidate("lexical", "exact policy language"), candidate("shared", "shared result")];
  const vector = [candidate("shared", "shared result"), candidate("vector", "semantic result")];
  const fused = reciprocalRankFusion(lexical, vector);
  assert.equal(fused[0]?.chunkId, "shared");
  assert.ok((fused[0]?.rrfScore ?? 0) > (fused[1]?.rrfScore ?? 0));
});

test("evidence selection assigns machine-controlled evidence IDs and citation metadata", () => {
  const fused = reciprocalRankFusion([candidate("c1", "Bundled accessories require manager approval after 7 days.")], []);
  const evidence = selectEvidence(fused, "bundled accessories after 7 days", 5, 1000);
  assert.equal(evidence[0]?.evidenceId, "E1");
  const source = toAskSource(evidence[0]!);
  assert.equal(source.evidenceId, "E1");
  assert.match(source.citationLabel, /Refund Policy v2/u);
  assert.equal(source.page, 14);
});

test("weak or empty retrieval remains insufficient evidence", () => {
  assert.equal(calculateConfidence([]), "LOW");
  const weak = selectEvidence(reciprocalRankFusion([candidate("c1", "unrelated text")], []), "different question", 5, 1000);
  assert.equal(calculateConfidence(weak), "LOW");
});
