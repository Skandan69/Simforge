import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRetrievalBenchmark, sprint19BenchmarkReleaseTargets, type RetrievalBenchmarkCase } from "./benchmark.js";
import type { KnowledgeEvidence } from "./service.js";

function evidence(id: string, citationLabel = "Refund Policy v2, page 14"): KnowledgeEvidence {
  return {
    evidenceId: "E1",
    chunkId: id,
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
    citationLabel,
    relevance: {
      meaningfulQueryTerms: 3,
      termOverlap: 3,
      termOverlapRatio: 1,
      identifierOverlap: 0,
      numberOverlap: 1,
      numberOverlapRatio: 1,
      exactIdentifierRequired: false,
      exactIdentifierSatisfied: true,
      hasExactPhrase: false,
      documentNumberMatch: false,
      strong: true,
    },
  };
}

test("retrieval benchmark evaluates objective evidence, citations, versions, no-answer, latency, and leakage", () => {
  const cases: RetrievalBenchmarkCase[] = [
    { id: "buried-end", category: "buried_end", organizationFixtureId: "org-a", question: "What happens after seven days?", expectedChunkIds: ["chunk-a"], expectedDocumentVersion: 2, expectedCitationContains: ["page 14"], answerable: true },
    { id: "no-answer", category: "unanswerable", organizationFixtureId: "org-a", question: "What is the lunar shipping policy?", expectedChunkIds: [], expectedCitationContains: [], answerable: false },
    { id: "tenant", category: "tenant_isolation", organizationFixtureId: "org-a", question: "Find another org policy", expectedChunkIds: [], expectedCitationContains: [], mustNotRetrieveChunkIds: ["foreign"], answerable: false },
  ];
  const result = evaluateRetrievalBenchmark(cases, [
    { caseId: "buried-end", retrieved: [evidence("chunk-a")], insufficientEvidence: false, latencyMs: 120 },
    { caseId: "no-answer", retrieved: [], insufficientEvidence: true, latencyMs: 80 },
    { caseId: "tenant", retrieved: [], insufficientEvidence: true, latencyMs: 60 },
  ]);
  assert.equal(result.recallAt5, 1);
  assert.equal(result.citationCorrectness, 1);
  assert.equal(result.versionCorrectness, 1);
  assert.equal(result.noAnswerCorrectness, 1);
  assert.equal(result.tenantLeakage, 0);
  assert.equal(result.failedCases.length, 0);
  assert.equal(sprint19BenchmarkReleaseTargets.tenantLeakage, 0);
});
