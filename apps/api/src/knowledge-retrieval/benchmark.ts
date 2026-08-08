import type { KnowledgeEvidence } from "./service.js";

export interface RetrievalBenchmarkCase {
  id: string;
  category: "direct_fact" | "buried_beginning" | "buried_middle" | "buried_end" | "numeric_exception" | "policy_exclusion" | "cross_document" | "conflicting_documents" | "superseded_version" | "ambiguous" | "unanswerable" | "pdf_page" | "pptx_slide" | "xlsx_row" | "tenant_isolation";
  organizationFixtureId: string;
  question: string;
  expectedChunkIds: string[];
  expectedDocumentVersion?: number;
  expectedCitationContains: string[];
  mustNotRetrieveChunkIds?: string[];
  mustNotRetrieveOrganizationFixtureIds?: string[];
  answerable: boolean;
}

export interface RetrievalBenchmarkObservation {
  caseId: string;
  retrieved: KnowledgeEvidence[];
  insufficientEvidence: boolean;
  latencyMs: number;
}

export interface RetrievalBenchmarkResult {
  totalCases: number;
  recallAt5: number;
  precisionAt5: number;
  citationCorrectness: number;
  versionCorrectness: number;
  noAnswerCorrectness: number;
  tenantLeakage: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  failedCases: string[];
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))]!;
}

export function evaluateRetrievalBenchmark(cases: RetrievalBenchmarkCase[], observations: RetrievalBenchmarkObservation[]): RetrievalBenchmarkResult {
  const byId = new Map(observations.map((item) => [item.caseId, item]));
  let recallTotal = 0;
  let precisionTotal = 0;
  let citationTotal = 0;
  let versionTotal = 0;
  let noAnswerTotal = 0;
  let tenantLeakage = 0;
  const failedCases: string[] = [];
  for (const fixture of cases) {
    const observation = byId.get(fixture.id);
    if (!observation) {
      failedCases.push(fixture.id);
      continue;
    }
    const top5 = observation.retrieved.slice(0, 5);
    const ids = new Set(top5.map((item) => item.chunkId));
    const expected = fixture.expectedChunkIds;
    const hits = expected.filter((id) => ids.has(id)).length;
    const recall = expected.length ? hits / expected.length : observation.insufficientEvidence ? 1 : 0;
    const precision = top5.length ? hits / top5.length : expected.length ? 0 : 1;
    const citations = fixture.expectedCitationContains.every((value) => top5.some((item) => item.citationLabel.includes(value)));
    const version = fixture.expectedDocumentVersion === undefined || top5.some((item) => item.version === fixture.expectedDocumentVersion);
    const noAnswer = fixture.answerable ? !observation.insufficientEvidence : observation.insufficientEvidence;
    const forbidden = new Set(fixture.mustNotRetrieveChunkIds ?? []);
    const leaked = top5.some((item) => forbidden.has(item.chunkId));
    if (leaked) tenantLeakage += 1;
    recallTotal += recall;
    precisionTotal += precision;
    citationTotal += citations ? 1 : 0;
    versionTotal += version ? 1 : 0;
    noAnswerTotal += noAnswer ? 1 : 0;
    if (recall < 1 || !citations || !version || !noAnswer || leaked) failedCases.push(fixture.id);
  }
  const denominator = Math.max(cases.length, 1);
  const latencies = observations.map((item) => item.latencyMs);
  return {
    totalCases: cases.length,
    recallAt5: recallTotal / denominator,
    precisionAt5: precisionTotal / denominator,
    citationCorrectness: citationTotal / denominator,
    versionCorrectness: versionTotal / denominator,
    noAnswerCorrectness: noAnswerTotal / denominator,
    tenantLeakage,
    p50LatencyMs: percentile(latencies, 0.5),
    p95LatencyMs: percentile(latencies, 0.95),
    failedCases,
  };
}

export const sprint19BenchmarkReleaseTargets = {
  recallAt5: 0.95,
  citationCorrectness: 0.95,
  noAnswerCorrectness: 0.98,
  tenantLeakage: 0,
  p95LatencyMs: 1_000,
} as const;
