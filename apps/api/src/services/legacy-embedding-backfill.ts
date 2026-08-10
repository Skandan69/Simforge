import { prisma } from "../lib/prisma.js";
import { embedKnowledgeChunks, type EmbeddableChunk } from "../knowledge-retrieval/embeddings.js";
import { contentHash } from "../processing/chunker.js";

export const SPRINT19_LEGACY_EMBEDDING_CHUNK_IDS = [
  "d361e417-3a8f-43fe-94ea-0a8c857b8163",
  "01c41650-7956-4416-a60f-60bf747630a1",
  "9627f53d-2252-4375-b97b-25dbddfce046",
  "754a9dcc-58b2-4e8e-a867-537ad8157ee1",
  "1473d1f2-6289-4f1d-b44f-5b2cca4f4714",
  "feeed3f0-0bf7-440d-a36a-9fde8042dda6",
  "e10eef13-5592-4dac-82bb-953e91cd9831",
  "57dbae8e-3ba2-4643-bbbe-96c553123eb4",
  "433d294b-cf6c-465d-b1d9-424ba637782a",
  "4528effc-9d5d-4d47-88f6-d6025fbeacd6",
  "99e46dd4-7f35-4575-8559-6c89625ae1b8",
  "b6740e3f-fc5e-4753-96ac-0348f40d789c",
  "2415b113-d139-4e97-99fe-b14b31ada9b9",
  "75c5471a-25fd-4a76-9c92-3d4904d2401d",
  "37aa324c-bb97-479f-b557-f284486588c2",
  "5a57e193-658d-4052-9ca5-8053c9d0fc97",
  "2f386f77-77bd-468f-920a-7c16588ec68d",
  "1c6ae224-eb77-429b-8d9a-07a791f205a5",
  "261d63ad-5e30-40cb-a0ff-47bfc01e37cb",
  "7cc912fd-46ee-40a1-b284-537328768729",
  "0d904a3a-019c-42ee-ae06-e91c35b544f3",
  "514f2ae5-a569-4fae-9194-a4a00e7cde6e",
  "0625c4f1-2750-4133-894a-4fb62229afde",
  "febcaf59-60ac-412f-9433-90295012fab2",
  "2a8fc325-e83e-41c3-b2c5-ace32d9cd51c",
  "6cf19db5-fc1d-4ac9-a90f-56ff96f9940b",
  "01c26cdc-82d5-4fb1-85a8-d9bfccadcbd0",
  "a517275b-198e-4628-b711-c5d67df3c70d",
  "d3c2db68-c647-4d89-89f9-23746fd41dc3",
  "48607c66-4d66-41ce-ad68-28e353f14eb3",
  "a48bcea2-31c9-4d65-8618-8dcd81332859",
] as const;

export interface LegacyEmbeddingBackfillRow {
  id: string;
  text: string;
  contentHash: string | null;
  documentVersion: number;
  chunkNumber: number;
  documentId: string | null;
  document?: {
    id: string;
    fileName: string;
    status: "Ready" | "Processing" | "Failed" | "Archived";
    retrievalVersion: number;
    knowledgeBase: { organizationId: string; status: "Active" | "Archived" };
    versions: Array<{ version: number; retrievalStatus: "PROCESSING" | "ACTIVE" | "SUPERSEDED" | "FAILED" | "ARCHIVED" }>;
  } | null;
  source: {
    id: string;
    organizationId: string;
    status: "Uploaded" | "Queued" | "Processing" | "Completed" | "Failed" | "Cancelled";
  };
  embedding?: { id: string } | null;
}

export function canonicalChunkHash(chunk: Pick<LegacyEmbeddingBackfillRow, "text" | "documentVersion">) {
  return contentHash(chunk.text, chunk.documentVersion);
}

export function isEligibleLegacyEmbeddingChunk(chunk: LegacyEmbeddingBackfillRow, organizationId: string) {
  const activeVersion = chunk.document?.versions.some(
    (version) => version.version === chunk.documentVersion && version.retrievalStatus === "ACTIVE",
  );
  return (
    SPRINT19_LEGACY_EMBEDDING_CHUNK_IDS.includes(chunk.id as typeof SPRINT19_LEGACY_EMBEDDING_CHUNK_IDS[number]) &&
    !chunk.embedding &&
    chunk.documentId !== null &&
    chunk.text.trim().length > 0 &&
    chunk.source.organizationId === organizationId &&
    chunk.source.status === "Completed" &&
    chunk.document?.knowledgeBase.organizationId === organizationId &&
    chunk.document.knowledgeBase.status === "Active" &&
    chunk.document.status === "Ready" &&
    chunk.document.retrievalVersion === chunk.documentVersion &&
    Boolean(activeVersion)
  );
}

export async function selectLegacyEmbeddingBackfillChunks(organizationId: string) {
  const chunks = await prisma.knowledgeChunk.findMany({
    where: {
      id: { in: [...SPRINT19_LEGACY_EMBEDDING_CHUNK_IDS] },
      status: "ACTIVE",
    },
    include: {
      embedding: { select: { id: true } },
      source: { select: { id: true, organizationId: true, status: true } },
      document: {
        select: {
          id: true,
          fileName: true,
          status: true,
          retrievalVersion: true,
          knowledgeBase: { select: { organizationId: true, status: true } },
          versions: { select: { version: true, retrievalStatus: true } },
        },
      },
    },
    orderBy: [{ documentId: "asc" }, { documentVersion: "asc" }, { chunkNumber: "asc" }],
  });

  const eligible = chunks.filter((chunk) => isEligibleLegacyEmbeddingChunk(chunk, organizationId));
  const skipped = chunks.filter((chunk) => !isEligibleLegacyEmbeddingChunk(chunk, organizationId));
  return { chunks, eligible, skipped };
}

export async function runLegacyEmbeddingBackfill(organizationId: string, options: { dryRun?: boolean } = {}) {
  const selection = await selectLegacyEmbeddingBackfillChunks(organizationId);
  const embeddable: EmbeddableChunk[] = selection.eligible.map((chunk) => ({
    id: chunk.id,
    text: chunk.text,
    contentHash: canonicalChunkHash(chunk),
  }));
  const diagnostics = {
    selection: {
      diagnosedChunkIds: SPRINT19_LEGACY_EMBEDDING_CHUNK_IDS.length,
      found: selection.chunks.length,
      eligible: selection.eligible.length,
      skipped: selection.skipped.length,
    },
    contentHashUpdates: { attempted: 0, updated: 0 },
    embeddings: { attempted: 0, embedded: 0, skipped: 0 },
  };

  if (options.dryRun || !embeddable.length) {
    return {
      dryRun: Boolean(options.dryRun),
      diagnosedChunkIds: SPRINT19_LEGACY_EMBEDDING_CHUNK_IDS.length,
      found: selection.chunks.length,
      eligible: selection.eligible.length,
      skipped: selection.skipped.length,
      attempted: 0,
      embedded: 0,
      providerConfigured: null,
      diagnostics,
    };
  }

  for (const chunk of selection.eligible) {
    const hash = canonicalChunkHash(chunk);
    diagnostics.contentHashUpdates.attempted += 1;
    const result = await prisma.knowledgeChunk.updateMany({
      where: {
        id: chunk.id,
        OR: [{ contentHash: null }, { contentHash: { not: hash } }],
      },
      data: { contentHash: hash },
    });
    diagnostics.contentHashUpdates.updated += result.count;
  }

  const result = await embedKnowledgeChunks(embeddable);
  diagnostics.embeddings = {
    attempted: result.attempted,
    embedded: result.embedded,
    skipped: result.skipped,
  };
  return {
    dryRun: false,
    diagnosedChunkIds: SPRINT19_LEGACY_EMBEDDING_CHUNK_IDS.length,
    found: selection.chunks.length,
    eligible: selection.eligible.length,
    skipped: selection.skipped.length,
    attempted: result.attempted,
    embedded: result.embedded,
    providerConfigured: result.providerConfigured,
    diagnostics,
  };
}
