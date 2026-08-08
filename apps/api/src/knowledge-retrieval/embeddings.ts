import { prisma } from "../lib/prisma.js";
import { getEnv } from "../config/env.js";
import { assertActiveEmbeddingDimensions, getEmbeddingProvider, type EmbeddingProvider } from "../ai/embedding-provider.js";

export interface EmbeddableChunk {
  id: string;
  text: string;
  contentHash: string | null;
}

export interface EmbeddingBatchResult {
  attempted: number;
  embedded: number;
  skipped: number;
  providerConfigured: boolean;
}

function vectorLiteral(vector: number[]) {
  return `[${vector.map((value) => Number.isFinite(value) ? value.toFixed(8) : "0").join(",")}]`;
}

async function hasCurrentEmbedding(chunk: EmbeddableChunk, provider: EmbeddingProvider) {
  if (!chunk.contentHash) return false;
  const existing = await prisma.knowledgeChunkEmbedding.findUnique({
    where: { chunkId: chunk.id },
    select: { model: true, provider: true, dimensions: true, contentHash: true },
  });
  return existing?.provider === provider.name && existing.model === provider.model && existing.dimensions === provider.dimensions && existing.contentHash === chunk.contentHash;
}

export async function embedKnowledgeChunks(chunks: EmbeddableChunk[], provider = getEmbeddingProvider()): Promise<EmbeddingBatchResult> {
  if (!chunks.length) return { attempted: 0, embedded: 0, skipped: 0, providerConfigured: Boolean(provider) };
  if (!provider) return { attempted: chunks.length, embedded: 0, skipped: chunks.length, providerConfigured: false };
  assertActiveEmbeddingDimensions(provider.dimensions);

  const env = getEnv();
  const pending: EmbeddableChunk[] = [];
  for (const chunk of chunks) {
    if (await hasCurrentEmbedding(chunk, provider)) continue;
    pending.push(chunk);
  }
  let embedded = 0;
  for (let index = 0; index < pending.length; index += env.EMBEDDING_BATCH_SIZE) {
    const batch = pending.slice(index, index + env.EMBEDDING_BATCH_SIZE);
    let vectors: number[][] | undefined;
    let lastError: unknown;
    for (let attempt = 0; attempt <= env.EMBEDDING_MAX_RETRIES; attempt += 1) {
      try {
        vectors = await provider.embed(batch.map((chunk) => chunk.text));
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!vectors) throw lastError instanceof Error ? lastError : new Error("Embedding provider failed");
    for (const [offset, vector] of vectors.entries()) {
      assertActiveEmbeddingDimensions(vector.length);
      const chunk = batch[offset]!;
      const hash = chunk.contentHash ?? "";
      await prisma.$executeRawUnsafe(
        `INSERT INTO "KnowledgeChunkEmbedding" ("chunkId", "provider", "model", "dimensions", "contentHash", "embedding")
         VALUES ($1::uuid, $2, $3, $4, $5, $6::vector)
         ON CONFLICT ("chunkId") DO UPDATE SET
          "provider" = EXCLUDED."provider",
          "model" = EXCLUDED."model",
          "dimensions" = EXCLUDED."dimensions",
          "contentHash" = EXCLUDED."contentHash",
          "embedding" = EXCLUDED."embedding",
          "embeddedAt" = CURRENT_TIMESTAMP`,
        chunk.id,
        provider.name,
        provider.model,
        provider.dimensions,
        hash,
        vectorLiteral(vector),
      );
      embedded += 1;
    }
  }
  return { attempted: chunks.length, embedded, skipped: chunks.length - pending.length, providerConfigured: true };
}
