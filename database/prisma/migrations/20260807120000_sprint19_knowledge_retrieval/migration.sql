CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE "DocumentVersionRetrievalStatus" AS ENUM ('PROCESSING', 'ACTIVE', 'SUPERSEDED', 'FAILED', 'ARCHIVED');
CREATE TYPE "KnowledgeChunkStatus" AS ENUM ('PROCESSING', 'ACTIVE', 'SUPERSEDED', 'FAILED', 'ARCHIVED');

ALTER TABLE "Document"
ADD COLUMN "retrievalVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "DocumentVersion"
ADD COLUMN "retrievalStatus" "DocumentVersionRetrievalStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "processedAt" TIMESTAMP(3),
ADD COLUMN "retrievalReadyAt" TIMESTAMP(3),
ADD COLUMN "failedAt" TIMESTAMP(3),
ADD COLUMN "failureReason" TEXT;

ALTER TABLE "KnowledgeChunk"
ADD COLUMN "documentVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "status" "KnowledgeChunkStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "sectionTitle" TEXT,
ADD COLUMN "headingPath" JSONB,
ADD COLUMN "pageNumber" INTEGER,
ADD COLUMN "slideNumber" INTEGER,
ADD COLUMN "sheetName" TEXT,
ADD COLUMN "rowStart" INTEGER,
ADD COLUMN "rowEnd" INTEGER,
ADD COLUMN "contentHash" TEXT;

UPDATE "Document" SET "retrievalVersion" = "currentVersion";

UPDATE "DocumentVersion"
SET "retrievalStatus" = CASE
  WHEN "version" = document."currentVersion" THEN 'ACTIVE'::"DocumentVersionRetrievalStatus"
  ELSE 'SUPERSEDED'::"DocumentVersionRetrievalStatus"
END
FROM "Document" document
WHERE "DocumentVersion"."documentId" = document."id";

UPDATE "KnowledgeChunk"
SET "documentVersion" = document."retrievalVersion",
    "status" = 'ACTIVE'::"KnowledgeChunkStatus"
FROM "Document" document
WHERE "KnowledgeChunk"."documentId" = document."id";

CREATE TABLE "KnowledgeChunkEmbedding" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "chunkId" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "dimensions" INTEGER NOT NULL,
  "contentHash" TEXT NOT NULL,
  "embeddedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "embedding" vector(1536) NOT NULL,
  CONSTRAINT "KnowledgeChunkEmbedding_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "KnowledgeChunkEmbedding"
ADD CONSTRAINT "KnowledgeChunkEmbedding_chunkId_fkey"
FOREIGN KEY ("chunkId") REFERENCES "KnowledgeChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "KnowledgeChunk_sourceId_chunkNumber_key";

CREATE UNIQUE INDEX "KnowledgeChunk_sourceId_documentVersion_chunkNumber_key"
ON "KnowledgeChunk"("sourceId", "documentVersion", "chunkNumber");

CREATE UNIQUE INDEX "KnowledgeChunkEmbedding_chunkId_key"
ON "KnowledgeChunkEmbedding"("chunkId");

CREATE INDEX "DocumentVersion_documentId_retrievalStatus_idx"
ON "DocumentVersion"("documentId", "retrievalStatus");

CREATE INDEX "KnowledgeChunk_documentId_documentVersion_status_idx"
ON "KnowledgeChunk"("documentId", "documentVersion", "status");

CREATE INDEX "KnowledgeChunk_sourceId_status_idx"
ON "KnowledgeChunk"("sourceId", "status");

CREATE INDEX "KnowledgeChunkEmbedding_provider_model_dimensions_idx"
ON "KnowledgeChunkEmbedding"("provider", "model", "dimensions");

CREATE INDEX "KnowledgeChunk_text_fts_idx"
ON "KnowledgeChunk"
USING GIN (to_tsvector('english', "text"));

CREATE INDEX "KnowledgeChunkEmbedding_embedding_hnsw_idx"
ON "KnowledgeChunkEmbedding"
USING hnsw ("embedding" vector_cosine_ops);

ALTER TABLE "KnowledgeChunkEmbedding" ENABLE ROW LEVEL SECURITY;
