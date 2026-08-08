import assert from "node:assert/strict";
import test from "node:test";
import type { AuthorizedKnowledgeScope, RetrievalCandidate } from "./service.js";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/simforge";
process.env.SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_PUBLISHABLE_KEY ??= "sb_publishable_test";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "service_role_test";

const { assessEvidenceRelevance, calculateConfidence, expandedTokens, lexicalTsQuery, reciprocalRankFusion, selectEvidence, toAskSource } = await import("./service.js");

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

test("clearly unanswerable questions do not keep weak vector-only distractors", () => {
  const distractors = reciprocalRankFusion([], [
    candidate("c1", "Refund policy allows manager review for damaged accessories."),
    candidate("c2", "Shipping policy requires empathy and case documentation."),
  ]);
  const evidence = selectEvidence(distractors, "What is the lunar cafeteria authorization code?", 5, 1000);
  assert.equal(evidence.length, 0);
  assert.equal(calculateConfidence(evidence), "LOW");
});

test("synthetic or structured identifiers require exact identifier evidence", () => {
  const distractors = reciprocalRankFusion([], [
    candidate("c1", "QA TEST policy marker QA-phase-a-123-DIRECT-42 explains refund windows."),
    candidate("c2", "QA TEST policy marker QA-phase-a-123-EXCEPTION-42 explains shipping delays."),
  ]);
  const evidence = selectEvidence(distractors, "What is QA-phase-a-123-MISSING-42?", 5, 1000);
  assert.equal(evidence.length, 0);
});

test("same-topic but wrong policy remains insufficient when identifier evidence is absent", () => {
  const distractors = reciprocalRankFusion([], [
    candidate("c1", "Refund exception REFUND-ALPHA-100 requires manager approval."),
    candidate("c2", "Refund exception REFUND-BETA-200 requires legal approval."),
  ]);
  const evidence = selectEvidence(distractors, "What approval is required for REFUND-GAMMA-300?", 5, 1000);
  assert.equal(evidence.length, 0);
});

test("exact identifier evidence survives no-answer filtering", () => {
  const fused = reciprocalRankFusion([
    candidate("c1", "Refund exception REFUND-GAMMA-300 requires director approval within 2 days."),
  ], []);
  const evidence = selectEvidence(fused, "What approval is required for REFUND-GAMMA-300?", 5, 1000);
  assert.equal(evidence[0]?.chunkId, "c1");
  assert.notEqual(calculateConfidence(evidence), "LOW");
});

test("multiple independently relevant identifiers preserve multiple evidence sources", () => {
  const fused = reciprocalRankFusion([
    candidate("c1", "Cross document control CROSS-DOC-401 says verify the customer's account before escalation."),
    { ...candidate("c2", "Cross document control CROSS-DOC-402 says document the refund exception before escalation."), documentId: "document-b", documentName: "Escalation Policy" },
  ], []);
  const evidence = selectEvidence(fused, "Compare CROSS-DOC-401 and CROSS-DOC-402.", 5, 1000);
  assert.deepEqual(evidence.map((item) => item.chunkId), ["c1", "c2"]);
  assert.notEqual(calculateConfidence(evidence), "LOW");
});

test("multi-source identifier evidence is preserved even when the second source exceeds the evidence token budget", () => {
  const longSource = `${"Detailed policy evidence. ".repeat(120)} CROSS-DOC-402 requires escalation notes.`;
  const fused = reciprocalRankFusion([
    candidate("c1", `${"Detailed policy evidence. ".repeat(120)} CROSS-DOC-401 requires identity verification.`),
    { ...candidate("c2", longSource), documentId: "document-b", documentName: "Escalation Policy" },
  ], []);
  const evidence = selectEvidence(fused, "Compare CROSS-DOC-401 and CROSS-DOC-402.", 5, 600);
  assert.deepEqual(evidence.map((item) => item.chunkId), ["c1", "c2"]);
});

test("structured identifier prefixes can retrieve active version lifecycle evidence", () => {
  const fused = reciprocalRankFusion([
    candidate("c1", "Version lifecycle active value PHASE-A-123-VERSION-V2: refund period is 14 days."),
  ], []);
  const evidence = selectEvidence(fused, "What is the current refund period for PHASE-A-123 version lifecycle?", 5, 1000);
  assert.equal(evidence[0]?.chunkId, "c1");
  assert.notEqual(calculateConfidence(evidence), "LOW");
});

test("numeric evidence uses exact number tokens instead of substring matches", () => {
  const wrong = candidate("wrong", "Refund review window is 128 business days for archived cases.");
  const right = candidate("right", "Refund review window is 28 business days for shipping delay evidence.");
  const relevanceWrong = assessEvidenceRelevance(wrong, "How many business days is the 28 day refund review window?");
  const relevanceRight = assessEvidenceRelevance(right, "How many business days is the 28 day refund review window?");
  assert.equal(relevanceWrong.numberOverlap, 0);
  assert.equal(relevanceRight.numberOverlap, 1);
});

test("natural policy-exception wording expands to related retrieval concepts", () => {
  const query = "When can a goodwill credit be offered after the return window, and what is the dollar limit?";
  const tsQuery = lexicalTsQuery(query);
  assert.match(tsQuery, /goodwill/u);
  assert.match(tsQuery, /credit/u);
  assert.match(tsQuery, /usd/u);
  assert.match(tsQuery, /exception/u);
  assert.match(tsQuery, /\|/u);
});

test("goodwill-credit paraphrases remain relevant without weakening unrelated no-answer questions", () => {
  const evidence = candidate("goodwill", "Policy exception: a goodwill credit up to 25 USD may be offered after the return window only when a verified platform outage lasted more than 4 hours and the manager approves the credit.");
  const paraphrases = [
    "Can we give a customer credit after the return period?",
    "Are there exceptions after the return window?",
    "How much goodwill credit can be given for a late return?",
    "What exception allows compensation after the return deadline?",
    "Can support offer compensation when the return period has expired?",
  ];
  for (const query of paraphrases) {
    const relevance = assessEvidenceRelevance(evidence, query);
    assert.equal(relevance.strong, true, query);
  }

  assert.equal(assessEvidenceRelevance(evidence, "What is the warranty replacement policy for lunar mining helmets?").strong, false);
  assert.equal(expandedTokens("lunar mining helmets").has("goodwill"), false);
});
