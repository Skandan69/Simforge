import type { AskSophiaSource, RetrievalConfidence, SophiaMode, UserRole } from "@simforge/shared";
import { prisma } from "../lib/prisma.js";
import { getEmbeddingProvider } from "../ai/embedding-provider.js";
import { getEnv } from "../config/env.js";

export interface AuthorizedKnowledgeScope {
  organizationId: string;
  userId: string;
  role: UserRole;
}

export interface RetrievalCandidate {
  chunkId: string;
  documentId: string;
  documentName: string;
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  version: number;
  sectionTitle: string | null;
  headingPath: string[];
  pageNumber: number | null;
  slideNumber: number | null;
  sheetName: string | null;
  rowStart: number | null;
  rowEnd: number | null;
  text: string;
  lexicalScore: number;
  vectorScore: number;
  lexicalRank?: number;
  vectorRank?: number;
}

export interface KnowledgeEvidence extends RetrievalCandidate {
  evidenceId: `E${number}`;
  rrfScore: number;
  rerankScore: number;
  finalScore: number;
  citationLabel: string;
  relevance: EvidenceRelevance;
}

export interface KnowledgeRetrievalResult {
  query: string;
  evidence: KnowledgeEvidence[];
  confidence: RetrievalConfidence;
  insufficientEvidence: boolean;
  reason?: string;
  latencyMs: number;
  vectorAvailable: boolean;
  debugTimings?: RetrievalDebugTimings;
}

export interface KnowledgeRetrievalInput {
  scope: AuthorizedKnowledgeScope;
  query: string;
  mode: SophiaMode;
  knowledgeBaseIds?: string[];
  documentIds?: string[];
  limit?: number;
  maxEvidenceTokens?: number;
  debugTimings?: boolean;
}

export interface RetrievalDebugTimings {
  totalMs: number;
  dbRoundTrips: number;
  externalCalls: number;
  cacheHit: boolean;
  exactLookup: boolean;
  stages: Array<{ name: string; durationMs: number }>;
}

const WORD_PATTERN = /[\p{L}\p{N}][\p{L}\p{N}-]{1,}/gu;
const NUMBER_PATTERN = /\b\d+(?:\.\d+)?\b/gu;
const TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;
const IDENTIFIER_PATTERN = /\b(?=[\p{L}\p{N}-]{6,}\b)(?=[\p{L}\p{N}-]*(?:\d|-))[\p{L}\p{N}][\p{L}\p{N}-]*[\p{L}\p{N}]\b/giu;
const RRF_K = 60;
const STOP_WORDS = new Set([
  "about",
  "after",
  "and",
  "are",
  "before",
  "current",
  "does",
  "for",
  "from",
  "how",
  "in",
  "into",
  "is",
  "it",
  "of",
  "or",
  "policy",
  "question",
  "requires",
  "the",
  "this",
  "to",
  "what",
  "when",
  "where",
  "who",
  "why",
]);

export interface EvidenceRelevance {
  meaningfulQueryTerms: number;
  termOverlap: number;
  termOverlapRatio: number;
  identifierOverlap: number;
  numberOverlap: number;
  numberOverlapRatio: number;
  exactIdentifierRequired: boolean;
  exactIdentifierSatisfied: boolean;
  hasExactPhrase: boolean;
  documentNumberMatch: boolean;
  strong: boolean;
}

function terms(value: string) {
  return new Set(value.toLowerCase().match(WORD_PATTERN) ?? []);
}

function numbers(value: string) {
  return new Set((value.match(NUMBER_PATTERN) ?? []).filter((number) => number.length <= 6));
}

function tokens(value: string) {
  return new Set((value.toLowerCase().match(TOKEN_PATTERN) ?? []).filter((term) => term.length >= 3 && !STOP_WORDS.has(term)));
}

function identifiers(value: string) {
  return new Set((value.toLowerCase().match(IDENTIFIER_PATTERN) ?? []).filter((term) => !STOP_WORDS.has(term)));
}

function candidateSearchText(candidate: Pick<RetrievalCandidate, "documentName" | "sectionTitle" | "headingPath" | "text">) {
  return `${candidate.documentName} ${candidate.sectionTitle ?? ""} ${candidate.headingPath.join(" ")} ${candidate.text}`;
}

function documentNumber(value: string) {
  return value.toLowerCase().match(/\bdocument\s+(\d{1,6})\b/u)?.[1] ?? null;
}

function documentNumberMatches(candidate: Pick<RetrievalCandidate, "documentName" | "text">, query: string) {
  const queryNumber = documentNumber(query);
  if (!queryNumber) return false;
  const normalized = queryNumber.padStart(2, "0");
  return new RegExp(`(?:^|[^\\d])0*${queryNumber}(?:[^\\d]|$)`, "u").test(candidate.documentName)
    || candidate.documentName.includes(normalized)
    || candidate.text.toLowerCase().includes(`document ${normalized}`)
    || candidate.text.toLowerCase().includes(`document ${queryNumber}`);
}

function identifierCompatible(queryIdentifier: string, candidateIdentifier: string) {
  return queryIdentifier === candidateIdentifier
    || (queryIdentifier.length >= 10 && candidateIdentifier.startsWith(`${queryIdentifier}-`))
    || (candidateIdentifier.length >= 10 && queryIdentifier.startsWith(`${candidateIdentifier}-`));
}

function identifierOverlapCount(queryIdentifiers: Set<string>, candidateIdentifiers: Set<string>) {
  return [...queryIdentifiers].filter((queryIdentifier) => [...candidateIdentifiers].some((candidateIdentifier) => identifierCompatible(queryIdentifier, candidateIdentifier))).length;
}

function identifierArray(value: string) {
  return [...identifiers(value)];
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function excerpt(text: string, max = 360) {
  const normalized = text.replace(/\s+/gu, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max - 3).trimEnd()}...` : normalized;
}

function citationLabel(candidate: Pick<RetrievalCandidate, "documentName" | "version" | "sectionTitle" | "pageNumber" | "slideNumber" | "sheetName" | "rowStart" | "rowEnd">) {
  const parts = [`${candidate.documentName} v${candidate.version}`];
  if (candidate.sectionTitle) parts.push(candidate.sectionTitle);
  if (candidate.pageNumber) parts.push(`page ${candidate.pageNumber}`);
  if (candidate.slideNumber) parts.push(`slide ${candidate.slideNumber}`);
  if (candidate.sheetName) parts.push(candidate.rowStart ? `${candidate.sheetName} row ${candidate.rowStart}${candidate.rowEnd && candidate.rowEnd !== candidate.rowStart ? `-${candidate.rowEnd}` : ""}` : candidate.sheetName);
  return parts.join(", ");
}

function candidateKey(candidate: RetrievalCandidate) {
  return candidate.chunkId;
}

export function reciprocalRankFusion(lexical: RetrievalCandidate[], vector: RetrievalCandidate[]) {
  const merged = new Map<string, RetrievalCandidate & { rrfScore: number }>();
  for (const [index, candidate] of lexical.entries()) {
    const key = candidateKey(candidate);
    merged.set(key, { ...candidate, lexicalRank: index + 1, rrfScore: 1 / (RRF_K + index + 1) });
  }
  for (const [index, candidate] of vector.entries()) {
    const key = candidateKey(candidate);
    const existing = merged.get(key);
    if (existing) {
      existing.vectorRank = index + 1;
      existing.vectorScore = candidate.vectorScore;
      existing.rrfScore += 1 / (RRF_K + index + 1);
    } else {
      merged.set(key, { ...candidate, vectorRank: index + 1, rrfScore: 1 / (RRF_K + index + 1) });
    }
  }
  return [...merged.values()].sort((a, b) => b.rrfScore - a.rrfScore);
}

export function deterministicRerank(candidate: RetrievalCandidate & { rrfScore: number }, query: string) {
  const queryTerms = tokens(query);
  const queryNumbers = numbers(query);
  const text = candidateSearchText(candidate).toLowerCase();
  const candidateTerms = tokens(text);
  const candidateNumbers = numbers(text);
  const queryIdentifiers = identifiers(query);
  const candidateIdentifiers = identifiers(text);
  const overlap = [...queryTerms].filter((term) => candidateTerms.has(term)).length;
  const identifierMatch = queryIdentifiers.size ? identifierOverlapCount(queryIdentifiers, candidateIdentifiers) / queryIdentifiers.size * 0.12 : 0;
  const exactPhrase = query.length >= 8 && candidate.text.toLowerCase().includes(query.toLowerCase()) ? 0.08 : 0;
  const numberMatch = queryNumbers.size ? [...queryNumbers].filter((number) => candidateNumbers.has(number)).length / queryNumbers.size * 0.08 : 0;
  const docNumberMatch = documentNumberMatches(candidate, query) ? 0.16 : 0;
  const titleMatch = [...queryTerms].some((term) => candidate.documentName.toLowerCase().includes(term)) ? 0.03 : 0;
  const headingMatch = [...queryTerms].some((term) => candidate.headingPath.join(" ").toLowerCase().includes(term)) ? 0.04 : 0;
  const locationBoost = candidate.pageNumber || candidate.slideNumber || candidate.sheetName ? 0.02 : 0;
  return clamp(overlap / Math.max(queryTerms.size, 1) * 0.12 + identifierMatch + exactPhrase + numberMatch + docNumberMatch + titleMatch + headingMatch + locationBoost, 0, 0.42);
}

export function assessEvidenceRelevance(candidate: RetrievalCandidate, query: string): EvidenceRelevance {
  const queryTerms = tokens(query);
  const candidateTerms = tokens(candidateSearchText(candidate));
  const queryIdentifiers = identifiers(query);
  const candidateIdentifiers = identifiers(candidateSearchText(candidate));
  const queryNumbers = numbers(query);
  const candidateNumbers = numbers(candidateSearchText(candidate));
  const termOverlap = [...queryTerms].filter((term) => candidateTerms.has(term)).length;
  const identifierOverlap = identifierOverlapCount(queryIdentifiers, candidateIdentifiers);
  const numberOverlap = [...queryNumbers].filter((number) => candidateNumbers.has(number)).length;
  const termOverlapRatio = queryTerms.size ? termOverlap / queryTerms.size : 0;
  const numberOverlapRatio = queryNumbers.size ? numberOverlap / queryNumbers.size : 0;
  const exactIdentifierRequired = queryIdentifiers.size > 0;
  const exactIdentifierSatisfied = !exactIdentifierRequired || identifierOverlap > 0;
  const normalizedQuery = query.toLowerCase().replace(/\s+/gu, " ").trim();
  const normalizedText = candidate.text.toLowerCase().replace(/\s+/gu, " ").trim();
  const hasExactPhrase = normalizedQuery.length >= 12 && normalizedText.includes(normalizedQuery);
  const documentNumberMatch = documentNumberMatches(candidate, query);
  const hasStrongTokenEvidence = termOverlapRatio >= 0.4 || termOverlap >= 3;
  const hasStrongNumberEvidence = queryNumbers.size > 0 && numberOverlapRatio >= 0.5 && termOverlap >= 1;
  const hasStrongIdentifierEvidence = exactIdentifierRequired && identifierOverlap > 0;
  const strong = exactIdentifierSatisfied && (hasStrongIdentifierEvidence || hasStrongTokenEvidence || hasStrongNumberEvidence || hasExactPhrase || documentNumberMatch);
  return {
    meaningfulQueryTerms: queryTerms.size,
    termOverlap,
    termOverlapRatio,
    identifierOverlap,
    numberOverlap,
    numberOverlapRatio,
    exactIdentifierRequired,
    exactIdentifierSatisfied,
    hasExactPhrase,
    documentNumberMatch,
    strong,
  };
}

export function calculateConfidence(evidence: KnowledgeEvidence[]): RetrievalConfidence {
  const top = evidence[0];
  if (!top) return "LOW";
  const second = evidence[1];
  const gap = second ? top.finalScore - second.finalScore : top.finalScore;
  const hasCitationLocation = Boolean(top.pageNumber || top.slideNumber || top.sheetName || top.sectionTitle);
  if (!top.relevance.strong) return "LOW";
  if (top.finalScore >= 0.16 && gap >= 0.02 && hasCitationLocation && (top.relevance.termOverlapRatio >= 0.5 || top.relevance.identifierOverlap > 0 || top.relevance.numberOverlapRatio >= 0.5)) return "HIGH";
  if (top.finalScore >= 0.095 && (top.relevance.termOverlapRatio >= 0.35 || top.relevance.identifierOverlap > 0 || top.relevance.numberOverlapRatio >= 0.5)) return "MEDIUM";
  return "LOW";
}

export function selectEvidence(candidates: Array<RetrievalCandidate & { rrfScore: number }>, query: string, limit: number, maxEvidenceTokens: number): KnowledgeEvidence[] {
  const selected: KnowledgeEvidence[] = [];
  let tokens = 0;
  for (const candidate of candidates.map((item) => ({ ...item, rerankScore: deterministicRerank(item, query), relevance: assessEvidenceRelevance(item, query) })).filter((item) => item.relevance.strong).map((item) => ({ ...item, finalScore: item.rrfScore + item.rerankScore })).sort((a, b) => b.finalScore - a.finalScore)) {
    if (selected.length >= limit) break;
    if (selected.some((existing) => existing.text === candidate.text)) continue;
    const candidateTokens = estimateTokens(candidate.text);
    const introducesNewDocument = !selected.some((existing) => existing.documentId === candidate.documentId);
    const preservesIdentifierSource = introducesNewDocument && candidate.relevance.identifierOverlap > 0;
    if (selected.length && tokens + candidateTokens > maxEvidenceTokens && !preservesIdentifierSource) continue;
    tokens += candidateTokens;
    selected.push({ ...candidate, evidenceId: `E${selected.length + 1}` as `E${number}`, citationLabel: citationLabel(candidate) });
  }
  return selected;
}

export function toAskSource(evidence: KnowledgeEvidence): AskSophiaSource {
  return {
    evidenceId: evidence.evidenceId,
    document: evidence.documentName,
    knowledgeBase: evidence.knowledgeBaseName,
    version: evidence.version,
    section: evidence.sectionTitle,
    headingPath: evidence.headingPath,
    page: evidence.pageNumber,
    slide: evidence.slideNumber,
    sheet: evidence.sheetName,
    rowStart: evidence.rowStart,
    rowEnd: evidence.rowEnd,
    excerpt: excerpt(evidence.text),
    citationLabel: evidence.citationLabel,
  };
}

function mapRows(rows: Array<Record<string, unknown>>): RetrievalCandidate[] {
  return rows.map((row) => ({
    chunkId: String(row.chunkId),
    documentId: String(row.documentId),
    documentName: String(row.documentName),
    knowledgeBaseId: String(row.knowledgeBaseId),
    knowledgeBaseName: String(row.knowledgeBaseName),
    version: Number(row.version),
    sectionTitle: row.sectionTitle ? String(row.sectionTitle) : null,
    headingPath: Array.isArray(row.headingPath) ? row.headingPath.map(String) : [],
    pageNumber: row.pageNumber === null || row.pageNumber === undefined ? null : Number(row.pageNumber),
    slideNumber: row.slideNumber === null || row.slideNumber === undefined ? null : Number(row.slideNumber),
    sheetName: row.sheetName ? String(row.sheetName) : null,
    rowStart: row.rowStart === null || row.rowStart === undefined ? null : Number(row.rowStart),
    rowEnd: row.rowEnd === null || row.rowEnd === undefined ? null : Number(row.rowEnd),
    text: String(row.text),
    lexicalScore: Number(row.lexicalScore ?? 0),
    vectorScore: Number(row.vectorScore ?? 0),
  }));
}

function vectorLiteral(vector: number[]) {
  return `[${vector.map((value) => Number.isFinite(value) ? value.toFixed(8) : "0").join(",")}]`;
}

const EXACT_LOOKUP_CACHE_TTL_MS = 30_000;
const EXACT_LOOKUP_CACHE_MAX_CHUNKS = 5_000;
const exactLookupCache = new Map<string, { expiresAt: number; candidates: RetrievalCandidate[] }>();
const exactLookupWarmups = new Set<string>();

function retrievalNowMs() {
  return performance.now();
}

async function timeRetrievalStage<T>(timings: RetrievalDebugTimings | null, name: string, operation: () => Promise<T>): Promise<T> {
  const startedAt = retrievalNowMs();
  try {
    return await operation();
  } finally {
    if (timings) timings.stages.push({ name, durationMs: Math.round(retrievalNowMs() - startedAt) });
  }
}

function recordRetrievalStage(timings: RetrievalDebugTimings | null, name: string, durationMs: number) {
  timings?.stages.push({ name, durationMs: Math.round(durationMs) });
}

function scopedIdsKey(ids: string[] | null) {
  return ids?.length ? [...ids].sort().join(",") : "*";
}

function exactLookupCacheKey(organizationId: string, kbIds: string[] | null, docIds: string[] | null) {
  return `${organizationId}:${scopedIdsKey(kbIds)}:${scopedIdsKey(docIds)}`;
}

function exactLookupMatches(candidate: RetrievalCandidate, query: string, exactIdentifiers: string[]) {
  const searchText = candidateSearchText(candidate).toLowerCase();
  return exactIdentifiers.some((identifier) => searchText.includes(identifier)) || documentNumberMatches(candidate, query);
}

function getCachedExactLookupCandidates(organizationId: string, kbIds: string[] | null, docIds: string[] | null) {
  const cacheKey = exactLookupCacheKey(organizationId, kbIds, docIds);
  const cached = exactLookupCache.get(cacheKey);
  return cached && cached.expiresAt > Date.now() ? cached.candidates : null;
}

async function warmExactLookupCandidates(organizationId: string, kbIds: string[] | null, docIds: string[] | null) {
  const cacheKey = exactLookupCacheKey(organizationId, kbIds, docIds);
  if (exactLookupWarmups.has(cacheKey)) return;
  exactLookupWarmups.add(cacheKey);
  try {
    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT kc."id" AS "chunkId", d."id" AS "documentId", d."fileName" AS "documentName",
        kb."id" AS "knowledgeBaseId", kb."name" AS "knowledgeBaseName",
        kc."documentVersion" AS "version", kc."sectionTitle", kc."headingPath",
        kc."pageNumber", kc."slideNumber", kc."sheetName", kc."rowStart", kc."rowEnd", kc."text",
        1::float AS "lexicalScore",
        0::float AS "vectorScore"
      FROM "KnowledgeChunk" kc
      JOIN "Document" d ON d."id" = kc."documentId"
      JOIN "KnowledgeBase" kb ON kb."id" = d."knowledgeBaseId"
      WHERE kb."organizationId" = $1::uuid
        AND kb."status" = 'Active'
        AND d."status" = 'Ready'
        AND kc."status" = 'ACTIVE'
        AND d."retrievalVersion" = kc."documentVersion"
        AND ($2::uuid[] IS NULL OR kb."id" = ANY($2::uuid[]))
        AND ($3::uuid[] IS NULL OR d."id" = ANY($3::uuid[]))
      ORDER BY kc."createdAt" DESC
      LIMIT $4`,
      organizationId,
      kbIds,
      docIds,
      EXACT_LOOKUP_CACHE_MAX_CHUNKS + 1,
    );
    if (rows.length <= EXACT_LOOKUP_CACHE_MAX_CHUNKS) exactLookupCache.set(cacheKey, { expiresAt: Date.now() + EXACT_LOOKUP_CACHE_TTL_MS, candidates: mapRows(rows) });
  } finally {
    exactLookupWarmups.delete(cacheKey);
  }
}

async function queryExactLookupCandidates(organizationId: string, query: string, kbIds: string[] | null, docIds: string[] | null, exactIdentifiers: string[], limit: number) {
  const queryDocumentNumber = documentNumber(query);
  const normalizedDocumentNumber = queryDocumentNumber ? queryDocumentNumber.padStart(3, "0") : null;
  const boundaryDocumentNumber = queryDocumentNumber ? queryDocumentNumber.replace(/^0+/u, "") || "0" : null;
  const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT kc."id" AS "chunkId", d."id" AS "documentId", d."fileName" AS "documentName",
      kb."id" AS "knowledgeBaseId", kb."name" AS "knowledgeBaseName",
      kc."documentVersion" AS "version", kc."sectionTitle", kc."headingPath",
      kc."pageNumber", kc."slideNumber", kc."sheetName", kc."rowStart", kc."rowEnd", kc."text",
      1::float AS "lexicalScore",
      0::float AS "vectorScore"
    FROM "KnowledgeChunk" kc
    JOIN "Document" d ON d."id" = kc."documentId"
    JOIN "KnowledgeBase" kb ON kb."id" = d."knowledgeBaseId"
    WHERE kb."organizationId" = $1::uuid
      AND $2::text IS NOT NULL
      AND ($8::text IS NULL OR $8::text IS NOT NULL)
      AND kb."status" = 'Active'
      AND d."status" = 'Ready'
      AND kc."status" = 'ACTIVE'
      AND d."retrievalVersion" = kc."documentVersion"
      AND ($3::uuid[] IS NULL OR kb."id" = ANY($3::uuid[]))
      AND ($4::uuid[] IS NULL OR d."id" = ANY($4::uuid[]))
      AND (EXISTS (SELECT 1 FROM unnest($6::text[]) AS exact(identifier) WHERE kc."text" ILIKE '%' || exact.identifier || '%')
        OR EXISTS (SELECT 1 FROM unnest($6::text[]) AS exact(identifier) WHERE d."fileName" ILIKE '%' || exact.identifier || '%')
        OR ($7::text IS NOT NULL AND $9::text IS NOT NULL AND d."fileName" ~* ('(^|[^0-9])0*' || $9::text || '([^0-9]|$)')))
    ORDER BY kc."createdAt" DESC
    LIMIT $5`,
    organizationId,
    query,
    kbIds,
    docIds,
    limit,
    exactIdentifiers,
    queryDocumentNumber,
    normalizedDocumentNumber,
    boundaryDocumentNumber,
  );
  return mapRows(rows);
}

export class KnowledgeRetrievalService {
  async retrieve(input: KnowledgeRetrievalInput): Promise<KnowledgeRetrievalResult> {
    const started = Date.now();
    const debugTimings: RetrievalDebugTimings | null = input.debugTimings ? {
      totalMs: 0,
      dbRoundTrips: 0,
      externalCalls: 0,
      cacheHit: false,
      exactLookup: false,
      stages: [],
    } : null;
    const limit = input.limit ?? 5;
    const candidateLimit = Math.max(20, limit * 4);
    const maxEvidenceTokens = input.maxEvidenceTokens ?? 2_500;
    const kbIds = input.knowledgeBaseIds?.length ? input.knowledgeBaseIds : null;
    const docIds = input.documentIds?.length ? input.documentIds : null;
    const exactIdentifiers = identifierArray(input.query);
    const queryDocumentNumber = documentNumber(input.query);
    const exactLookup = exactIdentifiers.length > 0 || Boolean(queryDocumentNumber);
    if (debugTimings) debugTimings.exactLookup = exactLookup;
    const effectiveCandidateLimit = exactLookup ? Math.max(10, limit * Math.max(1, exactIdentifiers.length) * 2) : candidateLimit;
    const cachedExactCandidates = exactLookup ? getCachedExactLookupCandidates(input.scope.organizationId, kbIds, docIds) : null;
    if (debugTimings) debugTimings.cacheHit = Boolean(cachedExactCandidates);
    if (exactLookup && !cachedExactCandidates) {
      const warmup = setTimeout(() => {
        void warmExactLookupCandidates(input.scope.organizationId, kbIds, docIds).catch((error) => {
          console.warn("Knowledge retrieval exact lookup cache warmup failed", { mode: input.mode, errorType: error instanceof Error ? error.name : "UnknownError" });
        });
      }, 2_500);
      warmup.unref?.();
    }
    const lexicalPromise = exactLookup ? (cachedExactCandidates
      ? (async () => {
        const startedAt = retrievalNowMs();
        const candidates = cachedExactCandidates.filter((candidate) => exactLookupMatches(candidate, input.query, exactIdentifiers)).slice(0, effectiveCandidateLimit);
        recordRetrievalStage(debugTimings, "retrieval.exactCacheFilter", retrievalNowMs() - startedAt);
        return candidates;
      })()
      : timeRetrievalStage(debugTimings, "retrieval.exactLookupSql", async () => {
        if (debugTimings) debugTimings.dbRoundTrips += 1;
        return queryExactLookupCandidates(input.scope.organizationId, input.query, kbIds, docIds, exactIdentifiers, effectiveCandidateLimit);
      })) : timeRetrievalStage(debugTimings, "retrieval.lexicalSql", async () => {
      if (debugTimings) debugTimings.dbRoundTrips += 1;
      return prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT kc."id" AS "chunkId", d."id" AS "documentId", d."fileName" AS "documentName",
        kb."id" AS "knowledgeBaseId", kb."name" AS "knowledgeBaseName",
        kc."documentVersion" AS "version", kc."sectionTitle", kc."headingPath",
        kc."pageNumber", kc."slideNumber", kc."sheetName", kc."rowStart", kc."rowEnd", kc."text",
        1::float AS "lexicalScore",
        0::float AS "vectorScore"
      FROM "KnowledgeChunk" kc
      JOIN "KnowledgeSource" ks ON ks."id" = kc."sourceId"
      JOIN "Document" d ON d."id" = kc."documentId"
      JOIN "KnowledgeBase" kb ON kb."id" = d."knowledgeBaseId"
      WHERE ks."organizationId" = $1::uuid
        AND kb."organizationId" = $1::uuid
        AND kb."status" = 'Active'
        AND d."status" = 'Ready'
        AND ks."status" = 'Completed'
        AND kc."status" = 'ACTIVE'
        AND d."retrievalVersion" = kc."documentVersion"
        AND ($3::uuid[] IS NULL OR kb."id" = ANY($3::uuid[]))
        AND ($4::uuid[] IS NULL OR d."id" = ANY($4::uuid[]))
        AND to_tsvector('english', kc."text") @@ websearch_to_tsquery('english', $2)
      ORDER BY kc."createdAt" DESC
      LIMIT $5`,
      input.scope.organizationId,
      input.query,
      kbIds,
      docIds,
      effectiveCandidateLimit,
    );
    });

    let vectorAvailable = false;
    let provider: ReturnType<typeof getEmbeddingProvider> = null;
    try {
      provider = getEmbeddingProvider();
    } catch (error) {
      console.error("Knowledge retrieval embedding configuration invalid; lexical fallback active", {
        mode: input.mode,
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
    }

    const vectorPromise = exactLookup || !provider ? Promise.resolve([] as RetrievalCandidate[]) : (async () => {
      try {
        const [embedding] = await timeRetrievalStage(debugTimings, "retrieval.queryEmbedding", async () => {
          if (debugTimings) debugTimings.externalCalls += 1;
          return provider.embed([input.query]);
        });
        if (embedding) {
          vectorAvailable = true;
          const vectorRows = await timeRetrievalStage(debugTimings, "retrieval.vectorSql", async () => {
            if (debugTimings) debugTimings.dbRoundTrips += 1;
            return prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
            `SELECT kc."id" AS "chunkId", d."id" AS "documentId", d."fileName" AS "documentName",
              kb."id" AS "knowledgeBaseId", kb."name" AS "knowledgeBaseName",
              kc."documentVersion" AS "version", kc."sectionTitle", kc."headingPath",
              kc."pageNumber", kc."slideNumber", kc."sheetName", kc."rowStart", kc."rowEnd", kc."text",
              0::float AS "lexicalScore",
              (1 - (kce."embedding" <=> $2::vector)) AS "vectorScore"
            FROM "KnowledgeChunkEmbedding" kce
            JOIN "KnowledgeChunk" kc ON kc."id" = kce."chunkId"
            JOIN "KnowledgeSource" ks ON ks."id" = kc."sourceId"
            JOIN "Document" d ON d."id" = kc."documentId"
            JOIN "KnowledgeBase" kb ON kb."id" = d."knowledgeBaseId"
            WHERE ks."organizationId" = $1::uuid
              AND kb."organizationId" = $1::uuid
              AND kb."status" = 'Active'
              AND d."status" = 'Ready'
              AND ks."status" = 'Completed'
              AND kc."status" = 'ACTIVE'
              AND d."retrievalVersion" = kc."documentVersion"
              AND kce."provider" = $6
              AND kce."model" = $7
              AND kce."dimensions" = $8
              AND ($3::uuid[] IS NULL OR kb."id" = ANY($3::uuid[]))
              AND ($4::uuid[] IS NULL OR d."id" = ANY($4::uuid[]))
            ORDER BY kce."embedding" <=> $2::vector
            LIMIT $5`,
            input.scope.organizationId,
            vectorLiteral(embedding),
            kbIds,
            docIds,
            candidateLimit,
            provider.name,
            provider.model,
            provider.dimensions,
          );
          });
          return mapRows(vectorRows);
        }
      } catch (error) {
        console.warn("Knowledge retrieval vector path unavailable; lexical fallback active", { mode: input.mode, errorType: error instanceof Error ? error.name : "UnknownError" });
      }
      return [] as RetrievalCandidate[];
    })();

    const [lexicalResult, vector] = await timeRetrievalStage(debugTimings, "retrieval.parallelFetch", () => Promise.all([lexicalPromise, vectorPromise]));
    const lexical = exactLookup ? lexicalResult as RetrievalCandidate[] : mapRows(lexicalResult as Array<Record<string, unknown>>);

    const fusionStarted = retrievalNowMs();
    const fused = reciprocalRankFusion(lexical, vector);
    recordRetrievalStage(debugTimings, "retrieval.rrfFusion", retrievalNowMs() - fusionStarted);
    const evidenceStarted = retrievalNowMs();
    const evidence = selectEvidence(fused, input.query, limit, maxEvidenceTokens);
    recordRetrievalStage(debugTimings, "retrieval.evidenceSelection", retrievalNowMs() - evidenceStarted);
    const confidenceStarted = retrievalNowMs();
    const confidence = calculateConfidence(evidence);
    recordRetrievalStage(debugTimings, "retrieval.confidence", retrievalNowMs() - confidenceStarted);
    const latencyMs = Date.now() - started;
    if (debugTimings) debugTimings.totalMs = latencyMs;
    return {
      query: input.query,
      evidence,
      confidence,
      insufficientEvidence: !evidence.length || confidence === "LOW",
      reason: evidence.length ? undefined : "NO_RELEVANT_EVIDENCE",
      latencyMs,
      vectorAvailable,
      debugTimings: debugTimings ?? undefined,
    };
  }
}

export const knowledgeRetrievalService = new KnowledgeRetrievalService();
