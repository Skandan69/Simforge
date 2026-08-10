import test from "node:test";
import assert from "node:assert/strict";
import { contentHash } from "../processing/chunker.js";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/simforge";
process.env.SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_PUBLISHABLE_KEY ??= "publishable_test";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "service_role_test";

const {
  canonicalChunkHash,
  isEligibleLegacyEmbeddingChunk,
  SPRINT19_LEGACY_EMBEDDING_CHUNK_IDS,
} = await import("./legacy-embedding-backfill.js");

type LegacyEmbeddingBackfillRow = import("./legacy-embedding-backfill.js").LegacyEmbeddingBackfillRow;

function chunk(overrides: Partial<LegacyEmbeddingBackfillRow> = {}): LegacyEmbeddingBackfillRow {
  return {
    id: SPRINT19_LEGACY_EMBEDDING_CHUNK_IDS[0],
    text: "Legacy active production knowledge.",
    contentHash: null,
    documentVersion: 1,
    chunkNumber: 1,
    documentId: "document-1",
    source: { id: "source-1", organizationId: "org-1", status: "Completed" },
    document: {
      id: "document-1",
      fileName: "NP-GOV-001 Company Profile.docx",
      status: "Ready",
      retrievalVersion: 1,
      knowledgeBase: { organizationId: "org-1", status: "Active" },
      versions: [{ version: 1, retrievalStatus: "ACTIVE" }],
    },
    embedding: null,
    ...overrides,
  };
}

test("legacy embedding repair is scoped to the diagnosed chunk ids", () => {
  assert.equal(SPRINT19_LEGACY_EMBEDDING_CHUNK_IDS.length, 31);
  assert.equal(isEligibleLegacyEmbeddingChunk(chunk(), "org-1"), true);
  assert.equal(isEligibleLegacyEmbeddingChunk(chunk({ id: "00000000-0000-0000-0000-000000000000" }), "org-1"), false);
});

test("legacy embedding repair eligibility scales across the full production-sized allowlist", () => {
  const eligible = SPRINT19_LEGACY_EMBEDDING_CHUNK_IDS.map((id, index) =>
    chunk({ id, chunkNumber: index + 1, text: `Legacy active production knowledge ${index + 1}.` }),
  ).filter((record) => isEligibleLegacyEmbeddingChunk(record, "org-1"));

  assert.equal(eligible.length, 31);
});

test("legacy embedding repair requires active lifecycle alignment", () => {
  assert.equal(isEligibleLegacyEmbeddingChunk(chunk({ document: { ...chunk().document!, retrievalVersion: 2 } }), "org-1"), false);
  assert.equal(isEligibleLegacyEmbeddingChunk(chunk({ document: { ...chunk().document!, status: "Archived" } }), "org-1"), false);
  assert.equal(isEligibleLegacyEmbeddingChunk(chunk({ document: { ...chunk().document!, knowledgeBase: { organizationId: "org-1", status: "Archived" } } }), "org-1"), false);
  assert.equal(isEligibleLegacyEmbeddingChunk(chunk({ source: { id: "source-1", organizationId: "org-1", status: "Failed" } }), "org-1"), false);
  assert.equal(isEligibleLegacyEmbeddingChunk(chunk({ document: { ...chunk().document!, versions: [{ version: 1, retrievalStatus: "SUPERSEDED" }] } }), "org-1"), false);
});

test("legacy embedding repair enforces tenant scope and existing embedding exclusion", () => {
  assert.equal(isEligibleLegacyEmbeddingChunk(chunk(), "other-org"), false);
  assert.equal(isEligibleLegacyEmbeddingChunk(chunk({ source: { id: "source-1", organizationId: "other-org", status: "Completed" } }), "org-1"), false);
  assert.equal(isEligibleLegacyEmbeddingChunk(chunk({ embedding: { id: "embedding-1" } }), "org-1"), false);
});

test("legacy embedding repair computes the existing canonical content hash", () => {
  const input = chunk({ text: "  Legacy   content\nfor hashing. ", documentVersion: 3 });
  assert.equal(canonicalChunkHash(input), contentHash(input.text, 3));
});
