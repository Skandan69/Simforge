# Sprint 19 Manual Supabase Migration Package

Target environment only:

- Project name: `SimForge-Staging`
- Project ref: `zyrxivxvywruyoogrmki`
- Region: `ap-south-1 (Mumbai)`

Do not run this package against production.

Production project ref `mjqtfgyikverxckcyxri` must not appear anywhere in the Supabase dashboard URL, project settings, SQL editor, connection strings, or local staging notes while performing this migration.

## 1. Pre-migration safety checks

Before opening the SQL editor:

1. Confirm this is a non-production operation.
2. Confirm the Supabase project selected in the dashboard is `SimForge-Staging`.
3. Confirm the project ref is exactly `zyrxivxvywruyoogrmki`.
4. Confirm you are not viewing or editing the production project.
5. Confirm no production browser tab is open where SQL could accidentally be pasted.
6. Confirm Sprint 19 application code has not been deployed to production.
7. Confirm this migration is being applied only to the dedicated staging database.
8. Take a staging database backup/snapshot if Supabase plan controls allow it.

Stop immediately if the selected project ref is anything other than `zyrxivxvywruyoogrmki`.

## 2. Confirm you are inside SimForge-Staging

In Supabase:

1. Open the Supabase dashboard.
2. Select the project named `SimForge-Staging`.
3. Open Project Settings.
4. Confirm:
   - Project name: `SimForge-Staging`
   - Project ref: `zyrxivxvywruyoogrmki`
   - Region: `ap-south-1`
5. Open SQL Editor only after confirming the project identity.

Do not rely on memory or tab title alone. Verify the project ref in the dashboard.

## 3. Enable pgvector

Run this first in the Supabase SQL Editor for `SimForge-Staging` only:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Expected result:

- Query succeeds.
- The `vector` extension is available for vector columns and indexes.
- No application tables are modified by this statement.

Read-only verification:

```sql
SELECT
  name,
  installed_version,
  default_version
FROM pg_available_extensions
WHERE name = 'vector';
```

Expected result:

- One row for `vector`.
- `installed_version` is not null.

## 4. Sprint 19 migration SQL

Run the following sections in order. Stop on the first error.

### Section A — Retrieval lifecycle enums

```sql
CREATE TYPE "DocumentVersionRetrievalStatus" AS ENUM ('PROCESSING', 'ACTIVE', 'SUPERSEDED', 'FAILED', 'ARCHIVED');
CREATE TYPE "KnowledgeChunkStatus" AS ENUM ('PROCESSING', 'ACTIVE', 'SUPERSEDED', 'FAILED', 'ARCHIVED');
```

Expected result:

- Two enum types are created.
- No table rows are changed.

If this section fails because a type already exists, stop and verify whether the migration or a partial migration was already applied.

### Section B — Document retrieval version column

```sql
ALTER TABLE "Document"
ADD COLUMN "retrievalVersion" INTEGER NOT NULL DEFAULT 1;
```

Expected result:

- `Document.retrievalVersion` exists.
- Existing rows receive default value `1` until the backfill section updates them to `currentVersion`.

### Section C — DocumentVersion retrieval lifecycle columns

```sql
ALTER TABLE "DocumentVersion"
ADD COLUMN "retrievalStatus" "DocumentVersionRetrievalStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "processedAt" TIMESTAMP(3),
ADD COLUMN "retrievalReadyAt" TIMESTAMP(3),
ADD COLUMN "failedAt" TIMESTAMP(3),
ADD COLUMN "failureReason" TEXT;
```

Expected result:

- `DocumentVersion.retrievalStatus` exists.
- Processing timestamps and failure reason columns exist.
- Existing rows default to `ACTIVE` until the backfill section classifies them.

### Section D — KnowledgeChunk retrieval metadata columns

```sql
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
```

Expected result:

- Retrieval-grade chunk metadata columns exist.
- Existing chunks default to document version `1` and status `ACTIVE` until backfill.

### Section E — Existing data backfill

```sql
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
```

Expected result:

- Every document retrieval version matches its current version.
- Current document versions are marked `ACTIVE`.
- Older document versions are marked `SUPERSEDED`.
- Existing chunks are tied to the document retrieval version and remain active.

### Section F — Embedding table

```sql
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
```

Expected result:

- `KnowledgeChunkEmbedding` exists.
- The embedding column is exactly `vector(1536)`.
- This matches Sprint 19 application config:
  - `OPENAI_EMBEDDING_MODEL=text-embedding-3-small`
  - `OPENAI_EMBEDDING_DIMENSIONS=1536`

### Section G — Embedding foreign key

```sql
ALTER TABLE "KnowledgeChunkEmbedding"
ADD CONSTRAINT "KnowledgeChunkEmbedding_chunkId_fkey"
FOREIGN KEY ("chunkId") REFERENCES "KnowledgeChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Expected result:

- Each embedding must belong to a valid `KnowledgeChunk`.
- Deleting a chunk deletes its embedding.

### Section H — Retrieval indexes

```sql
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
```

Expected result:

- Old chunk uniqueness index is replaced by version-aware uniqueness.
- Embeddings are one-to-one with chunks.
- Retrieval lifecycle filters are indexed.
- Full-text search index exists.
- HNSW vector index exists for cosine similarity over `vector(1536)`.

### Section I — RLS enablement

```sql
ALTER TABLE "KnowledgeChunkEmbedding" ENABLE ROW LEVEL SECURITY;
```

Expected result:

- Row Level Security is enabled on `KnowledgeChunkEmbedding`.
- No public access policies are created by this migration.
- Application access remains server-mediated.

## 5. Read-only verification queries after migration

Run these after all sections succeed.

### Confirm enums exist

```sql
SELECT
  t.typname AS enum_name,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname IN ('DocumentVersionRetrievalStatus', 'KnowledgeChunkStatus')
GROUP BY t.typname
ORDER BY t.typname;
```

Expected result:

- `DocumentVersionRetrievalStatus`
- `KnowledgeChunkStatus`
- Both contain: `PROCESSING`, `ACTIVE`, `SUPERSEDED`, `FAILED`, `ARCHIVED`

### Confirm Document retrievalVersion exists

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Document'
  AND column_name = 'retrievalVersion';
```

Expected result:

- One row.
- `data_type` is `integer`.
- `is_nullable` is `NO`.

### Confirm DocumentVersion retrieval status exists

```sql
SELECT column_name, udt_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'DocumentVersion'
  AND column_name IN ('retrievalStatus', 'processedAt', 'retrievalReadyAt', 'failedAt', 'failureReason')
ORDER BY column_name;
```

Expected result:

- Five rows.
- `retrievalStatus` uses `DocumentVersionRetrievalStatus`.

### Confirm KnowledgeChunk additions exist

```sql
SELECT column_name, data_type, udt_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'KnowledgeChunk'
  AND column_name IN (
    'documentVersion',
    'status',
    'sectionTitle',
    'headingPath',
    'pageNumber',
    'slideNumber',
    'sheetName',
    'rowStart',
    'rowEnd',
    'contentHash'
  )
ORDER BY column_name;
```

Expected result:

- Ten rows.
- `documentVersion` is integer and not nullable.
- `status` uses `KnowledgeChunkStatus`.
- `headingPath` is JSONB.

### Confirm KnowledgeChunkEmbedding exists and vector dimension is correct

```sql
SELECT
  c.relname AS table_name,
  a.attname AS column_name,
  format_type(a.atttypid, a.atttypmod) AS column_type
FROM pg_class c
JOIN pg_attribute a ON a.attrelid = c.oid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'KnowledgeChunkEmbedding'
  AND a.attname = 'embedding'
  AND a.attnum > 0
  AND NOT a.attisdropped;
```

Expected result:

- One row.
- `column_type` is exactly `vector(1536)`.

### Confirm FTS index exists

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'KnowledgeChunk'
  AND indexname = 'KnowledgeChunk_text_fts_idx';
```

Expected result:

- One row.
- `indexdef` includes `USING gin`.
- `indexdef` includes `to_tsvector('english'`.

### Confirm HNSW index exists

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'KnowledgeChunkEmbedding'
  AND indexname = 'KnowledgeChunkEmbedding_embedding_hnsw_idx';
```

Expected result:

- One row.
- `indexdef` includes `USING hnsw`.
- `indexdef` includes `vector_cosine_ops`.

### Confirm RLS is enabled

```sql
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'KnowledgeChunkEmbedding';
```

Expected result:

- One row.
- `rls_enabled` is `true`.

## 6. Validate existing/backfilled records

Run these read-only checks after migration.

### Document retrieval versions match current versions

```sql
SELECT COUNT(*) AS mismatched_documents
FROM "Document"
WHERE "retrievalVersion" <> "currentVersion";
```

Expected result:

- `mismatched_documents = 0`

### DocumentVersion active/superseded status matches current version

```sql
SELECT COUNT(*) AS invalid_document_versions
FROM "DocumentVersion" dv
JOIN "Document" d ON d."id" = dv."documentId"
WHERE (
  dv."version" = d."currentVersion"
  AND dv."retrievalStatus" <> 'ACTIVE'::"DocumentVersionRetrievalStatus"
)
OR (
  dv."version" <> d."currentVersion"
  AND dv."retrievalStatus" <> 'SUPERSEDED'::"DocumentVersionRetrievalStatus"
);
```

Expected result:

- `invalid_document_versions = 0`

### KnowledgeChunk rows are active and versioned

```sql
SELECT COUNT(*) AS invalid_chunks
FROM "KnowledgeChunk" kc
JOIN "Document" d ON d."id" = kc."documentId"
WHERE kc."documentVersion" <> d."retrievalVersion"
   OR kc."status" <> 'ACTIVE'::"KnowledgeChunkStatus";
```

Expected result:

- `invalid_chunks = 0`

### Basic row counts for manual review

```sql
SELECT 'Document' AS table_name, COUNT(*) AS row_count FROM "Document"
UNION ALL
SELECT 'DocumentVersion', COUNT(*) FROM "DocumentVersion"
UNION ALL
SELECT 'KnowledgeChunk', COUNT(*) FROM "KnowledgeChunk"
UNION ALL
SELECT 'KnowledgeChunkEmbedding', COUNT(*) FROM "KnowledgeChunkEmbedding";
```

Expected result:

- Existing document/version/chunk counts should remain present.
- `KnowledgeChunkEmbedding` may be `0` immediately after migration because embeddings are created later by processing jobs.

## 7. Rollback/recovery instructions

If any SQL step fails:

1. Stop immediately.
2. Do not continue to later sections.
3. Record:
   - section name
   - exact error message
   - whether any earlier sections succeeded
4. Do not attempt to repair production.
5. If this is staging and data can be discarded, the safest recovery is restoring/recreating the staging database from a known clean state.
6. If staging data must be preserved, inspect which objects were created before applying targeted cleanup.

Potential targeted cleanup for a failed staging-only partial migration must be reviewed before execution. Do not run cleanup SQL blindly.

Examples of objects that may need review after a partial failure:

- Type: `"DocumentVersionRetrievalStatus"`
- Type: `"KnowledgeChunkStatus"`
- Column: `"Document"."retrievalVersion"`
- Columns added to `"DocumentVersion"`
- Columns added to `"KnowledgeChunk"`
- Table: `"KnowledgeChunkEmbedding"`
- Indexes listed in this document

Because this migration changes existing tables and backfills existing rows, prefer a staging database restore over manual rollback if anything fails midway.

## 8. Explicit production warnings

Do not run any SQL in this document against:

- production Supabase
- project ref `mjqtfgyikverxckcyxri`
- any project other than `SimForge-Staging`

Do not run this package in a browser tab unless the dashboard project ref is visibly confirmed as `zyrxivxvywruyoogrmki`.

Do not copy production database credentials into staging.

Do not copy staging SQL execution results into public channels if they contain private customer data.

## 9. Manual completion checklist

- [ ] Staging project confirmed
- [ ] pgvector enabled
- [ ] migration executed
- [ ] schema verified
- [ ] indexes verified
- [ ] RLS verified
- [ ] backfill verified
- [ ] no production changes

After every checkbox is complete, tell Codex exactly:

`SimForge-Staging migration completed manually`

Codex should not assume the migration succeeded until that confirmation is provided.
