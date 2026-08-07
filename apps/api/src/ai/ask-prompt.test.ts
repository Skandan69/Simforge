import assert from "node:assert/strict";
import test from "node:test";
import { buildAskSophiaPrompt, deterministicAskAnswer, sanitizeEvidenceReferences } from "./ask-prompt.js";
import type { KnowledgeEvidence } from "../knowledge-retrieval/service.js";

const evidence: KnowledgeEvidence = {
  evidenceId: "E1",
  chunkId: "chunk-a",
  documentId: "document-a",
  documentName: "Refund Policy",
  knowledgeBaseId: "kb-a",
  knowledgeBaseName: "Customer Support",
  version: 2,
  sectionTitle: "Accessory returns",
  headingPath: ["Returns"],
  pageNumber: 14,
  slideNumber: null,
  sheetName: null,
  rowStart: null,
  rowEnd: null,
  text: "Bundled accessories require manager approval after 7 days.",
  lexicalScore: 1,
  vectorScore: 1,
  rrfScore: 0.1,
  rerankScore: 0.1,
  finalScore: 0.2,
  citationLabel: "Refund Policy v2, page 14",
};

test("ASK prompt uses evidence IDs and does not ask the model to invent citations", () => {
  const prompt = buildAskSophiaPrompt([evidence]);
  assert.match(prompt, /E1/u);
  assert.match(prompt, /Do not create source names/u);
  assert.doesNotMatch(prompt, /storagePath/u);
});

test("citation sanitizer removes invented evidence references", () => {
  assert.equal(sanitizeEvidenceReferences("Use this policy [E1] and another source [E9].", ["E1"]), "Use this policy [E1] and another source .");
});

test("deterministic ASK answer is grounded in supplied evidence", () => {
  assert.match(deterministicAskAnswer([evidence]), /Bundled accessories/u);
  assert.match(deterministicAskAnswer([evidence]), /\[E1\]/u);
  assert.match(deterministicAskAnswer([]), /couldn't find sufficient information/u);
});
