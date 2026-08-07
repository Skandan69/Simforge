# Sprint 19 Technical Design

Working title: Sophia Multi-Mode Foundation + Enterprise Knowledge Retrieval + Ask Mode

Status: design proposal only. Do not implement until architecture approval.

## 1. Design basis

Sprint 19 builds from the accepted architecture discovery:

- Knowledge Studio remains the authoritative enterprise knowledge layer.
- Sophia remains one orchestration layer, not six bots.
- Existing simulation behavior remains backward compatible.
- ASK is the first new Sophia mode.
- LEARN, PRACTICE, ASSESS, and broader COACH mode remain future-compatible only.
- Enterprise retrieval uses Supabase/Postgres + pgvector first.
- No separate vector database is introduced in this stage.
- Retrieval must be query-time, tenant-scoped, version-aware, structure-aware, citation-ready, and able to return insufficient evidence.

Release quality targets:

- Buried-detail Recall@5 >= 95%
- Citation correctness >= 95%
- Hallucination rate for no-answer questions <= 2%
- Cross-tenant retrieval leakage = 0%
- p95 retrieval latency < 1 second before LLM generation

If benchmarks do not meet these targets, Sprint 19 should report the gap honestly and tune retrieval rather than weakening the benchmark.

## 2. Sophia Mode Abstraction

### 2.1 Architectural representation

Add a small shared mode concept, not separate services for every mode.

Proposed shared type:

```ts
export const SOPHIA_MODES = [
  "ASK",
  "LEARN",
  "PRACTICE",
  "SIMULATE",
  "ASSESS",
  "COACH",
] as const;

export type SophiaMode = (typeof SOPHIA_MODES)[number];
```

Mode purpose:

| Mode | Sprint 19 behavior |
| --- | --- |
| ASK | Implemented. Sophia answers grounded questions from permitted enterprise knowledge. |
| SIMULATE | Existing behavior remains unchanged. Current simulation runtime remains the production path. |
| LEARN | Future enum/config only if useful. No UI/service implementation. |
| PRACTICE | Future enum/config only if useful. No UI/service implementation. |
| ASSESS | Future enum/config only if useful. No UI/service implementation. |
| COACH | Future orchestration concept only. Existing AI Coach is not rebuilt. |

### 2.2 Orchestration boundary

Introduce a lightweight `SophiaOrchestrator` interface:

```ts
interface SophiaOrchestrator {
  answerAsk(input: AskSophiaInput): Promise<AskSophiaResponse>;
}
```

Sprint 19 should only implement `answerAsk`. Existing simulation routes continue using the current `generateSophiaReply`, `loadSophiaPromptContext`, and `buildSophiaSystemPrompt` path unless a small shared utility is extracted without behavior change.

### 2.3 Backward compatibility rule

Do not route simulation traffic through ASK. SIMULATE can later move behind the orchestrator, but only after parity tests prove no runtime regressions.

## 3. Knowledge Retrieval Service

### 3.1 Purpose

`KnowledgeRetrievalService` becomes the single authoritative retrieval layer for all Sophia modes.

It should answer:

> Given a server-derived authorization scope, query, optional knowledge base scope, and mode, what exact source evidence is permitted, relevant, current, and safe to send to Sophia?

### 3.2 Proposed interface

```ts
interface AuthorizedKnowledgeScope {
  organizationId: string;
  userId: string;
  role: UserRole;
  permittedKnowledgeBaseIds?: string[];
}

interface KnowledgeRetrievalInput {
  scope: AuthorizedKnowledgeScope;
  query: string;
  mode: SophiaMode;
  knowledgeBaseIds?: string[];
  documentIds?: string[];
  limit?: number;
  maxEvidenceTokens?: number;
}

interface KnowledgeEvidence {
  evidenceId: `E${number}`;
  chunkId: string;
  documentId: string;
  documentName: string;
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  version: number;
  sectionTitle?: string;
  headingPath?: string[];
  pageNumber?: number;
  slideNumber?: number;
  sheetName?: string;
  rowStart?: number;
  rowEnd?: number;
  text: string;
  lexicalScore: number;
  vectorScore: number;
  rrfScore: number;
  rerankScore: number;
  finalScore: number;
  citationLabel: string;
}

interface KnowledgeRetrievalResult {
  query: string;
  evidence: KnowledgeEvidence[];
  confidence: "LOW" | "MEDIUM" | "HIGH";
  insufficientEvidence: boolean;
  reason?: string;
}
```

### 3.3 Tenant filters

Every retrieval query must begin with tenant constraints:

1. Resolve user membership through existing `requireAuth` and `requireWorkspace` middleware.
2. Build an `AuthorizedKnowledgeScope` on the server.
3. Pass only `scope` into `KnowledgeRetrievalService`; callers must not pass arbitrary `organizationId` / `userId` combinations.
4. Restrict to `KnowledgeSource.organizationId = scope.organizationId`.
5. Restrict to documents whose `KnowledgeBase.organizationId = scope.organizationId`.
6. Restrict optional `knowledgeBaseIds` to active KBs owned by the organization.
7. Restrict optional `documentIds` to documents owned by the organization.
8. Restrict to current active retrieval versions only.

Cross-tenant retrieval leakage is a P0 bug. Tests must attempt retrieval using another org's KB/document/chunk IDs and confirm zero evidence is returned.

Tenant filtering must happen before:

- lexical search;
- vector search;
- reranking;
- evidence selection;
- citation construction.

### 3.4 Knowledge Base filters

If `knowledgeBaseIds` are provided:

- validate all IDs are active and tenant-owned;
- retrieve only chunks from those KBs;
- return 400 or 404 for invalid scope according to current API conventions.

If not provided:

- ASK should search all active KBs in the current organization.

### 3.5 Document filters

If `documentIds` are provided:

- validate all document IDs are tenant-owned;
- restrict retrieval to those documents;
- ensure their KBs are active;
- ensure source status is `Completed`;
- ensure document version state is active/current.

### 3.6 Active-version filters

Sprint 19 must prevent obsolete policy retrieval.

Minimum rule:

- retrieve only chunks where `Document.retrievalVersion = KnowledgeChunk.documentVersion` and `Document.status = Ready`;
- exclude archived/superseded chunk versions.

If a document is replaced, old chunks should be marked `SUPERSEDED` or deleted only after new chunks are successfully processed. Prefer marking superseded for auditability.

### 3.7 Lexical retrieval

Use Postgres full-text search and/or trigram matching over:

- chunk text
- section title
- heading path
- document filename/title
- Knowledge Intelligence keywords

Recommended first implementation:

- `to_tsvector('english', coalesce(text, ''))`
- GIN index on search vector
- optional `pg_trgm` for phrase-like fuzzy matching

Lexical retrieval is essential for exact buried exceptions, codes, policy terms, product names, and numbers.

### 3.8 Vector retrieval

Use pgvector over chunk embeddings.

Recommended first implementation:

- one embedding per retrievable chunk;
- query embedding generated at request time;
- cosine or inner product distance depending on provider model;
- index with HNSW if available in the target Supabase Postgres version, otherwise IVFFlat after enough rows exist.

Vector retrieval is essential for paraphrased questions.

### 3.9 Hybrid scoring

Candidate pool:

- top lexical candidates, e.g. 50;
- top vector candidates, e.g. 50;
- merge with Reciprocal Rank Fusion (RRF);
- hard tenant/version filters applied before both retrieval paths.

Preferred Sprint 19 fusion strategy:

```txt
RRF(chunk) =
  1 / (k + lexicalRank)
  + 1 / (k + vectorRank)
```

Use RRF rather than a hand-weighted normalized score for the first implementation because it is robust when lexical and vector scores live on different scales. A typical `k` value is 60, but this should be tuned against the benchmark.

Weighted normalized scoring should only replace RRF if benchmark evidence shows it materially improves the release gates.

### 3.10 Reranking

After RRF candidate merge, apply deterministic reranking:

- exact phrase match boost;
- number/date/unit match boost;
- heading match boost;
- document title match boost;
- Knowledge Intelligence importance boost;
- active/current version boost;
- table/sheet/page location availability boost when the query asks for structured facts;
- penalty for vague/low-confidence KI sections;
- hard exclusion for stale/non-current versions.

Optional provider-based reranking may be added behind an abstraction if benchmark results require it. If used, send only candidate snippets and never broad documents.

Provider/LLM reranking is not part of the default Sprint 19 path. It should only be added if deterministic RRF + reranking cannot meet the release gates. Minimize additional AI calls.

### 3.11 Evidence selection

Evidence selector should:

- select top 3-5 chunks;
- prefer diversity across documents when scores are close;
- include neighboring parent/section context only if token budget allows;
- avoid sending duplicate overlapping chunks;
- preserve exact source locations for citations.

### 3.12 Confidence calculation

Internal retrieval confidence remains:

- `LOW`
- `MEDIUM`
- `HIGH`

Confidence should combine:

- RRF/top rank strength;
- score gap between top and lower candidates;
- lexical exactness;
- vector relevance;
- citation/source availability;
- conflict detection;
- number/date match where applicable.

Proposed thresholds:

- HIGH: strong top evidence and good score separation.
- MEDIUM: plausible evidence but limited certainty.
- LOW: weak evidence, conflicting evidence, or missing source location.

If confidence is LOW, ASK should prefer insufficient evidence unless the answer can be safely framed as uncertain.

ASK Mode v1 should not require a prominent learner-facing confidence badge. The normal employee UX should primarily show either:

- grounded answer + sources; or
- insufficient evidence.

Internal confidence can be logged as safe metadata and later exposed to trainer/admin/debug tooling if useful.

### 3.13 Token budgeting

`KnowledgeRetrievalService` should return a bounded evidence package.

Initial defaults:

- max evidence snippets: 5
- max evidence tokens: 2,000-3,000
- max single chunk tokens: 600-900

Prompt builder must never dump full extracted documents into ASK context.

### 3.14 Citation construction

Citation integrity must be machine-controlled.

Retrieval should assign evidence IDs:

- `E1`
- `E2`
- `E3`

Each evidence item owns authoritative source metadata:

- document name
- knowledge base name
- document version
- section title
- heading path
- page/slide/sheet/row if available

Sophia may reference evidence IDs in its answer. The application maps evidence IDs to human-readable citations. The LLM must not be trusted to invent, reproduce, or mutate source metadata.

Do not expose:

- Supabase storage path
- internal source IDs unless needed by UI actions
- private bucket/object paths

Citation integrity tests must cover:

- valid evidence reference;
- wrong evidence reference;
- invented evidence reference;
- citation/source mismatch;
- cross-document citation fabrication.

Cross-document citation fabrication is a release blocker.

### 3.15 No-answer behavior

If retrieval confidence is low or no relevant evidence is found:

Sophia should answer:

> I couldn't find sufficient information in your organization's knowledge to answer that confidently.

The response may include:

- suggested KB/document scope to check;
- prompt to upload relevant policy;
- source coverage hint.

It must not invent policy.

## 4. Ingestion Changes

### 4.1 Principle

Do not build a universal document AST in Sprint 19. Preserve enough structure for reliable retrieval and citation.

Sophia must not rely on early-document sampling. Retrieval must be capable of finding relevant evidence regardless of where it occurs inside an indexed active document: beginning, middle, or end. Prompt construction may receive only selected evidence, but selection must come from indexed query-time retrieval across the full active corpus.

### 4.2 Proposed structure preservation

Extend extraction output from plain text to extracted blocks:

```ts
interface ExtractedBlock {
  text: string;
  blockType: "heading" | "paragraph" | "table" | "list" | "slide" | "sheet-row" | "unknown";
  headingPath: string[];
  pageNumber?: number;
  slideNumber?: number;
  sheetName?: string;
  rowStart?: number;
  rowEnd?: number;
  order: number;
}
```

Extractors can still return plain text for compatibility, but Sprint 19 retrieval-grade processing should produce blocks where possible.

### 4.3 PDF

Preserve:

- page number;
- text blocks ordered by page;
- best-effort headings based on short lines and font info if available from pdfjs;
- fallback to page-level blocks if font metadata is unreliable.

### 4.4 DOCX

Preserve:

- headings if Mammoth exposes style maps or by inspecting document XML;
- paragraphs;
- list text;
- table text as rows if reasonably available.

If Mammoth raw text cannot preserve enough structure, add a minimal DOCX XML parser for headings/tables rather than a full AST.

### 4.5 PPTX

Preserve:

- slide number;
- text per slide;
- title-like first text block if detectable;
- bullet text as ordered blocks.

### 4.6 XLSX

Preserve:

- sheet name;
- row range;
- tabular row text;
- optional header row reference.

Spreadsheet chunks should avoid arbitrary 4,000-character windows across unrelated sheets.

### 4.7 Chunk hierarchy

Target hierarchy:

```txt
Document
  Version
    Section / Heading
      Subsection
        Chunk
```

Persist enough metadata on `KnowledgeChunk.metadata` initially:

- `documentVersion`
- `sectionTitle`
- `subsectionTitle`
- `headingPath`
- `pageNumber`
- `slideNumber`
- `sheetName`
- `rowStart`
- `rowEnd`
- `blockStart`
- `blockEnd`

### 4.8 Known ingestion limitations

Sprint 19 should be honest about what text extraction can and cannot understand.

Unless explicitly implemented and benchmarked, Sprint 19 does not guarantee high-fidelity comprehension for:

- scanned or image-only PDFs without OCR;
- embedded images;
- complex diagrams;
- screenshots of policy text;
- handwritten content;
- heavily nested tables;
- visually positioned PDF tables where reading order is ambiguous;
- legacy PPT;
- legacy XLS;
- audio/video/web sources;
- SharePoint/Confluence/API connectors.

Processing must not silently treat unavailable text extraction as successful knowledge comprehension. If text cannot be extracted, processing should fail or clearly mark retrieval coverage as insufficient.

## 5. Database Changes

### 5.1 Prefer extending KnowledgeChunk

Avoid duplicating chunk storage. Extend `KnowledgeChunk` where practical.

Proposed Prisma-level changes:

```prisma
enum DocumentVersionRetrievalStatus {
  PROCESSING
  ACTIVE
  SUPERSEDED
  FAILED
  ARCHIVED
}

enum KnowledgeChunkStatus {
  PROCESSING
  ACTIVE
  SUPERSEDED
  FAILED
  ARCHIVED
}

model Document {
  // existing fields remain
  currentVersion   Int @default(1) // latest uploaded version
  retrievalVersion Int @default(1) // currently retrievable active version
}

model DocumentVersion {
  // existing fields remain
  retrievalStatus DocumentVersionRetrievalStatus @default(PROCESSING)
  processedAt     DateTime?
  retrievalReadyAt DateTime?
  failedAt        DateTime?
  failureReason   String?

  @@index([documentId, retrievalStatus])
}

model KnowledgeChunk {
  id              String               @id @default(uuid()) @db.Uuid
  sourceId        String               @db.Uuid
  documentId      String?              @db.Uuid
  documentVersion Int                  @default(1)
  status          KnowledgeChunkStatus @default(ACTIVE)
  chunkNumber     Int
  sectionTitle    String?
  headingPath     Json?
  pageNumber      Int?
  slideNumber     Int?
  sheetName       String?
  rowStart        Int?
  rowEnd          Int?
  text            String               @db.Text
  characterCount  Int
  estimatedTokens Int
  metadata        Json
  embedding       Unsupported("vector")?
  embeddedAt      DateTime?
  embeddingModel  String?
  contentHash     String?
  createdAt       DateTime             @default(now())

  source          KnowledgeSource      @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  document        Document?            @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([sourceId, documentVersion, chunkNumber])
  @@index([documentId, documentVersion, status])
  @@index([sourceId, status])
}
```

Prisma support for pgvector may require `Unsupported("vector")` plus raw SQL migrations.

### 5.2 pgvector strategy

Migration should:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

pgvector dimensions are fixed per vector column and index. Provider independence does not mean arbitrary embedding dimensions can transparently share one indexed vector column.

Sprint 19 should use one configured embedding model/dimension per retrieval index. The app keeps an embedding provider abstraction, but the active retrieval index is tied to the configured model dimension.

Prefer a companion table:

```prisma
model KnowledgeChunkEmbedding {
  id             String   @id @default(uuid()) @db.Uuid
  chunkId        String   @unique @db.Uuid
  provider       String
  model          String
  dimensions     Int
  contentHash    String
  embeddedAt     DateTime @default(now())
  embedding      Unsupported("vector")
}
```

The raw SQL migration still needs a concrete vector dimension:

```sql
ALTER TABLE "KnowledgeChunkEmbedding"
ADD COLUMN "embedding" vector(<configured_dimension>);
```

If the embedding model changes to a different dimension:

1. create a new vector structure or migration for the new dimension;
2. re-embed active chunks into the new structure;
3. build the new vector index;
4. run retrieval benchmark against the new index;
5. switch retrieval to the new model/index only after the new index is ready;
6. keep the previous index available until rollback is no longer needed.

Do not over-engineer multi-dimension support in Sprint 19. One active configured embedding dimension is enough.

### 5.3 Indexes

Recommended indexes:

- `KnowledgeChunk(documentId, documentVersion, status)`
- `KnowledgeChunk(sourceId, status)`
- `KnowledgeChunkEmbedding(chunkId)`
- vector HNSW/IVFFlat index on embedding
- GIN full-text index on chunk text
- optional trigram index on text/title

Raw SQL example:

```sql
CREATE INDEX "KnowledgeChunk_text_fts_idx"
ON "KnowledgeChunk"
USING GIN (to_tsvector('english', "text"));

CREATE INDEX "KnowledgeChunkEmbedding_embedding_hnsw_idx"
ON "KnowledgeChunkEmbedding"
USING hnsw ("embedding" vector_cosine_ops);
```

### 5.4 Version state and activation lifecycle

Minimum required:

- `KnowledgeChunk.status`
- `KnowledgeChunk.documentVersion`
- `Document.currentVersion`
- `Document.retrievalVersion`
- `Document.status`
- `DocumentVersion.retrievalStatus`

Required replacement flow:

```txt
Current v1 = ACTIVE and retrievable

Upload v2
-> Document.currentVersion = 2
-> Document.retrievalVersion remains 1
-> DocumentVersion v2 = PROCESSING
-> v1 chunks remain ACTIVE and retrievable

If v2 extraction + chunking + embeddings succeed sufficiently:
-> atomic activation transaction
-> Document.retrievalVersion = 2
-> DocumentVersion v2 = ACTIVE
-> v2 chunks = ACTIVE
-> DocumentVersion v1 = SUPERSEDED
-> v1 chunks = SUPERSEDED

If v2 fails:
-> DocumentVersion v2 = FAILED
-> v2 chunks = FAILED or removed
-> Document.retrievalVersion remains 1
-> v1 remains ACTIVE and retrievable
```

The existing schema cannot support this cleanly with only `Document.currentVersion`, because replacement currently updates the document to the latest upload before retrieval-grade processing is complete. The minimum additive concept is `Document.retrievalVersion` plus `DocumentVersion.retrievalStatus`.

### 5.4.1 Transaction boundary

Slow work must happen outside the activation transaction:

1. upload file;
2. create `DocumentVersion` with `PROCESSING`;
3. extract text;
4. chunk text;
5. generate sufficient embeddings;
6. validate retrieval readiness;
7. open a short transaction only for activation.

Activation transaction:

```txt
BEGIN
  mark previous ACTIVE DocumentVersion as SUPERSEDED
  mark previous ACTIVE chunks as SUPERSEDED
  mark new DocumentVersion as ACTIVE
  mark new chunks as ACTIVE
  update Document.retrievalVersion to new version
COMMIT
```

If the transaction fails, old active retrieval remains intact.

### 5.5 Migration strategy

1. Add enums/tables/columns with backward-compatible defaults.
2. Backfill existing chunks:
   - `documentVersion = Document.currentVersion`
   - `status = ACTIVE`
   - `Document.retrievalVersion = Document.currentVersion`
   - existing latest `DocumentVersion.retrievalStatus = ACTIVE`
   - nullable location fields left empty
3. Create indexes concurrently where possible.
4. Add embedding job to populate embeddings after schema deploy.
5. Deploy retrieval code after embeddings begin populating, with lexical fallback for chunks not yet embedded.

### 5.6 Rollback strategy

Rollback should preserve current simulation behavior:

- existing Sophia prompt context can continue using `KnowledgeChunk.text`;
- new embedding table can be ignored;
- ASK route can be disabled by feature flag;
- new columns are additive and nullable/defaulted.

Do not delete existing chunks or extracted text during migration.

## 6. Embedding Architecture

### 6.1 Provider abstraction

Add replaceable interface:

```ts
interface EmbeddingProvider {
  name: string;
  model: string;
  dimensions: number;
  embed(input: string[]): Promise<number[][]>;
}
```

Initial provider: OpenAI-compatible embeddings.

The provider abstraction makes the application code replaceable. It does not remove the database constraint that one pgvector index has one fixed vector dimension. Sprint 19 should configure one active embedding model/dimension for retrieval.

Environment variables:

- `EMBEDDING_PROVIDER=openai`
- `OPENAI_EMBEDDING_MODEL`
- `EMBEDDING_BATCH_SIZE`
- `EMBEDDING_TIMEOUT_MS`
- `EMBEDDING_MAX_RETRIES`

### 6.2 Batch generation

Embedding job should:

- select active chunks missing embeddings;
- batch by model/dimension;
- respect max batch size;
- retry transient failures;
- record failure metadata without storing sensitive content in logs.

### 6.3 Idempotency

Use `contentHash`:

- hash normalized chunk text + document version + embedding model + embedding dimension;
- skip embedding if existing row has same hash/model;
- regenerate when hash/model changes.

### 6.4 Changed-document handling

On replacement:

- new chunks get new hashes;
- new embeddings generated;
- old chunks marked `SUPERSEDED`;
- old embeddings retained for audit but excluded by chunk status.

### 6.5 Cost controls

- Embed only active retrievable chunks.
- Avoid re-embedding unchanged chunks.
- Batch embeddings.
- Add admin-visible processing status later, but not necessary for Sprint 19 v1.
- Use lexical fallback while embeddings are pending.

## 7. ASK Mode API

### 7.1 Endpoint

```http
POST /api/sophia/ask
```

### 7.2 Request

```json
{
  "question": "What is our warranty policy for water damage?",
  "knowledgeBaseIds": ["optional-uuid"],
  "conversationId": "optional-client-thread-id"
}
```

Validation:

- `question`: required, trimmed, 1-4000 chars.
- `knowledgeBaseIds`: optional, max 20, must belong to current organization and be active.
- Auth required.
- Workspace required.

### 7.3 Response

```json
{
  "answer": "I couldn't find sufficient information in your organization's knowledge to answer that confidently.",
  "confidence": "LOW",
  "insufficientEvidence": true,
  "sources": [],
  "mode": "ASK"
}
```

Successful grounded response:

```json
{
  "answer": "Bundled accessories sold under enterprise contracts require manager approval after 7 days. [E1]",
  "confidence": "HIGH",
  "insufficientEvidence": false,
  "sources": [
    {
      "evidenceId": "E1",
      "document": "Refund Policy",
      "knowledgeBase": "Customer Support",
      "version": 2,
      "section": "Accessory returns",
      "page": 14,
      "excerpt": "Defective accessories may be returned within 15 days...",
      "citationLabel": "Refund Policy v2, page 14"
    }
  ],
  "mode": "ASK"
}
```

Do not expose storage paths or private IDs in normal UI responses.

### 7.4 Provider behavior

If retrieval is insufficient:

- do not call the LLM;
- return a deterministic no-answer response.

If retrieval is sufficient:

- build grounded prompt with evidence only;
- instruct Sophia to answer only from evidence;
- reference only supplied evidence IDs;
- map evidence IDs to citations in application code;
- do not mention internal retrieval scores.

## 8. ASK Mode UX

Route:

```txt
/ask-sophia
```

Navigation label:

```txt
Ask Sophia
```

UX elements:

- concise explanation: “Ask Sophia questions about approved company knowledge.”
- question input;
- optional Knowledge Base scope selector;
- answer panel;
- source cards;
- insufficient-evidence state;
- simple conversation list for the current page session.

Default employee UX should not emphasize retrieval confidence as a prominent badge. It should show grounded answers with sources, or an insufficient-evidence state. Internal confidence can remain in the API response for logging/admin/debug use.

Not a chatbot product:

- no separate bot identity;
- no autonomous workflows;
- no LMS-style lesson path;
- no manager analytics.

## 9. Retrieval Benchmark

### 9.1 Goal

Benchmark retrieval objectively before judging generated answers.

### 9.2 Test corpus sizes

- 50 documents
- 500 documents
- 5,000 documents

### 9.3 Test question types

| Type | Example |
| --- | --- |
| Direct fact | “What is the standard return window?” |
| Buried detail | “What happens to bundled accessories under enterprise contracts after seven days?” |
| Buried beginning | A required exception appears near the beginning of a long document. |
| Buried middle | A required exception appears near the middle of a long document. |
| Buried end | A required exception appears near the end of a long document. |
| Exception | “When does the normal accessory return policy not apply?” |
| Numeric exception | “What approval is required after exactly seven days?” |
| Policy exclusion | “Which accessories are excluded from the standard return window?” |
| Table-derived fact | “What warranty applies to SKU class B in region APAC?” |
| PPT slide-specific fact | “What escalation rule is stated on slide 18?” |
| XLSX sheet/row fact | “What threshold appears in the Exceptions sheet row 42?” |
| Cross-document | “What should an agent do when refund policy conflicts with fraud escalation SOP?” |
| Conflicting documents | v1 says 30 days, v2 says 14 days. Expected: v2 only. |
| Superseded policy | Ask old policy question; expected retrieval from active version only. |
| Ambiguous | “What is the approval rule?” Expected: ask clarifying question or low confidence. |
| No answer | “What is the policy for lunar delivery delays?” Expected: insufficient evidence. |
| Tenant isolation | Org A asks using Org B terms/IDs. Expected: zero Org B evidence. |

### 9.4 Benchmark fixture schema

```ts
interface RetrievalBenchmarkCase {
  id: string;
  organizationFixtureId: string;
  question: string;
  knowledgeBaseIds?: string[];
  expectedChunkIds: string[];
  expectedDocumentVersion?: number;
  expectedLocation?: {
    pageNumber?: number;
    slideNumber?: number;
    sheetName?: string;
    rowStart?: number;
    rowEnd?: number;
  };
  expectedCitationContains: string[];
  mustNotRetrieveChunkIds?: string[];
  mustNotRetrieveOrganizationFixtureIds?: string[];
  answerable: boolean;
}
```

### 9.5 Metrics

- Recall@5
- Precision@5
- Citation correctness
- Version correctness
- No-answer correctness
- Tenant leakage rate
- p50/p95 retrieval latency

### 9.6 Release gates

- buried-detail Recall@5 >= 95%
- citation correctness >= 95%
- hallucination/no-answer failure <= 2%
- tenant leakage = 0%
- p95 retrieval latency < 1 second before LLM generation

## 10. Backward Compatibility

| Existing system | Sprint 19 compatibility rule |
| --- | --- |
| Simulation Studio | No builder/schema behavior changes unless additive KB metadata is needed. |
| Sophia Runtime | Existing text/voice/avatar runtime remains unchanged. |
| Prompt Builder | Existing simulation prompt remains behaviorally unchanged. ASK gets a separate grounded prompt builder or prompt mode. |
| Knowledge attachment | Existing simulation-KB links remain valid. |
| Live Intelligence | No changes. |
| Evaluation | No changes. |
| AI Coach | No rebuild. It may later consume retrieval evidence, but not in Sprint 19. |
| Capability Profile | No changes. |
| Premium Report | No changes. |

## 11. Implementation Sequence

### Stage 1: Shared mode types

- Files affected:
  - `packages/shared/src/types.ts` or new shared constants file
- Schema impact: none
- API impact: none
- UI impact: none
- Tests:
  - mode type/constants test if existing shared test pattern supports it
- Rollback:
  - remove type export

### Stage 2: Retrieval schema migration

- Files affected:
  - `database/prisma/schema.prisma`
  - new migration SQL
- Schema impact:
  - `Document.retrievalVersion`
  - `DocumentVersion.retrievalStatus`
  - chunk version/status/location fields
  - embedding companion table
  - pgvector extension/index raw SQL
- API impact: none yet
- UI impact: none
- Tests:
  - Prisma validate/generate
  - migration SQL review
- Rollback:
  - feature disabled; additive fields ignored
  - existing simulation prompt context continues reading existing chunks

### Stage 3: Structure-aware chunking extensions

- Files affected:
  - `apps/api/src/processing/extractors.ts`
  - `apps/api/src/processing/chunker.ts`
  - `apps/api/src/processing/types.ts`
  - `apps/api/src/processing/engine.ts`
- Schema impact:
  - writes new metadata fields
- API impact:
  - existing processing endpoints unchanged
- UI impact:
  - none initially
- Tests:
  - failed replacement preserves previous active retrieval version
  - successful replacement atomically activates new retrieval version
  - PDF page metadata
  - PPTX slide metadata
  - XLSX sheet/row metadata
  - chunk hierarchy preservation
- Rollback:
  - continue using existing text-only chunking

### Stage 4: Embedding provider and jobs

- Files affected:
  - new `apps/api/src/ai/embedding-provider.ts`
  - new OpenAI-compatible embedding provider
  - processing worker integration or separate embedding worker
  - env config
- Schema impact:
  - writes embedding rows
- API impact: none
- UI impact: none
- Tests:
  - provider mock
  - batch idempotency
  - changed chunk re-embedding
  - retry/failure behavior
- Rollback:
  - disable provider via env

### Stage 5: KnowledgeRetrievalService

- Files affected:
  - new `apps/api/src/knowledge-retrieval/service.ts`
  - retrieval tests
- Schema impact: uses new indexes/embeddings
- API impact: none yet
- UI impact: none
- Tests:
  - server-derived `AuthorizedKnowledgeScope`
  - tenant scope
  - browser cannot supply organization scope
  - KB scope
  - version filtering
  - lexical retrieval
  - vector retrieval with mock embeddings
  - RRF candidate fusion
  - hybrid ranking
  - no-answer confidence
  - lexical fallback when embeddings are unavailable
- Rollback:
  - disable ASK route

### Stage 6: ASK Mode API

- Files affected:
  - new route, e.g. `apps/api/src/routes/sophia-ask.ts`
  - `apps/api/src/app.ts`
  - ASK prompt builder
- Schema impact: none required for v1 unless conversation persistence is added; avoid persistence initially if not needed
- API impact:
  - `POST /api/sophia/ask`
- UI impact: none yet
- Tests:
  - auth required
  - tenant isolation
  - insufficient evidence
  - no-answer path does not require an LLM call
  - grounded answer with sources
  - machine-controlled citation mapping
  - provider fallback/no-provider behavior
- Rollback:
  - remove route registration

### Stage 7: ASK Mode UI

- Files affected:
  - `apps/web/src/app/(protected)/(workspace)/ask-sophia/page.tsx`
  - ASK component
  - navigation update
- Schema impact: none
- API impact: consumes `/api/sophia/ask`
- UI impact:
  - new simple Ask Sophia page
- Tests:
  - page renders
  - answer/source state
  - insufficient-evidence state
  - KB selector if included
- Rollback:
  - hide navigation entry

### Stage 8: Retrieval benchmark harness

- Files affected:
  - `apps/api/src/knowledge-retrieval/benchmark/*`
  - test fixtures
- Schema impact:
  - test-only seed/fixture data
- API impact: none
- UI impact: none
- Tests:
  - benchmark runner outputs metrics
  - buried details at beginning/middle/end
  - numeric exceptions
  - table-derived facts
  - PPT slide-specific facts
  - XLSX sheet/row facts
  - citation integrity cases
- Rollback:
  - remove benchmark scripts/fixtures

## 12. Cost Estimate

Use configurable assumptions because provider pricing changes.

Variables:

```txt
pages_per_doc
avg_tokens_per_page
chunk_tokens
embedding_price_per_1m_tokens
chat_input_price_per_1m_tokens
chat_output_price_per_1m_tokens
avg_answer_input_tokens
avg_answer_output_tokens
```

### 12.1 Embedding cost per 1,000 pages

Example assumption:

- 500 tokens/page
- 1,000 pages = 500,000 tokens

Formula:

```txt
embedding_cost = 0.5 * embedding_price_per_1m_tokens
```

If embedding price is `$0.02 / 1M tokens`, then 1,000 pages costs about `$0.01`.

If embedding price is `$0.13 / 1M tokens`, then 1,000 pages costs about `$0.065`.

### 12.2 Reprocessing cost

Reprocessing should be proportional only to changed chunks:

```txt
reprocessing_cost = changed_tokens / 1,000,000 * embedding_price_per_1m_tokens
```

Avoid full-corpus re-embedding unless model/dimension changes.

### 12.3 Ask retrieval cost

Deterministic retrieval cost:

- Postgres lexical/vector query: infrastructure cost only.
- Query embedding: usually tiny, often under 1,000 tokens.

Formula:

```txt
query_embedding_cost = query_tokens / 1,000,000 * embedding_price_per_1m_tokens
```

### 12.4 LLM answer cost

Formula:

```txt
answer_cost =
  (input_tokens / 1,000,000 * chat_input_price_per_1m_tokens)
  + (output_tokens / 1,000,000 * chat_output_price_per_1m_tokens)
```

Cost controls:

- strict evidence token budget;
- no full document prompts;
- deterministic no-answer when retrieval is weak;
- cache query embeddings for repeated exact questions if useful later.

## 13. Acceptance Criteria / Definition of Done

Sprint 19 is done only when:

1. ASK Mode exists as a Sophia mode, not a separate bot.
2. Existing SIMULATE runtime behavior remains backward compatible.
3. `KnowledgeRetrievalService` retrieves evidence based on the user’s actual question.
4. Retrieval is tenant-scoped before lexical/vector search.
5. Retrieval supports optional KB scope.
6. Retrieval excludes superseded/archived document versions.
7. Active-version switching is atomic.
8. Failed document replacement preserves the prior retrievable version.
9. Embedding dimension/model migration has a safe strategy.
10. Retrieval returns citations with available document/section/page/slide/sheet/version data.
11. Citations are generated from retrieval metadata, not hallucinated by the LLM.
12. Citation integrity tests reject invented, wrong, and mismatched evidence references.
13. Organization scope cannot be supplied by the browser.
14. Cross-tenant retrieval tests show zero leakage.
15. No-answer behavior does not require an LLM call.
16. Lexical fallback works while embeddings are temporarily unavailable.
17. ASK response supports `insufficientEvidence`.
18. ASK UI displays answer, sources, and insufficient-evidence state.
19. Embeddings are generated idempotently and provider is replaceable within the configured active dimension.
20. Processing preserves enough document structure for citation-ready retrieval.
21. Benchmark harness exists with objective expected evidence.
22. Benchmark covers buried details at the beginning, middle, and end of large documents.
23. Benchmark covers exact numeric exceptions, policy exclusions, table-derived facts, PPT slide facts, and XLSX sheet/row facts.
24. Benchmark reports:
    - buried-detail Recall@5
    - citation correctness
    - no-answer hallucination rate
    - tenant leakage
    - p95 retrieval latency
25. Release targets are met or gaps are reported honestly.
26. Existing Simulation regression suite passes unchanged.
27. No Sprint 18 Enterprise Intelligence work is included.
28. No LEARN, PRACTICE, or ASSESS implementation is included.
29. Existing tests pass:
    - Prisma validate/generate
    - typecheck
    - lint
    - tests
    - production build

## 14. Explicit non-goals

Sprint 19 should not build:

- Enterprise Intelligence / Sprint 18
- Sophia Learning
- Practice mode
- Assessment mode
- Manager analytics
- Executive dashboards
- new digital human/avatar work
- voice intelligence
- separate vector database
- knowledge graph
- separate chatbot identity
- automatic policy decisions
- LMS/course system
- AI Coach rebuild
- simulation runtime redesign

## 15. Final recommendation

Sprint 19 should proceed as a focused platform milestone:

1. Add Sophia mode abstraction.
2. Add retrieval-grade knowledge schema extensions.
3. Add embeddings with pgvector.
4. Add tenant-scoped hybrid retrieval.
5. Add ASK Mode as the first consumer.
6. Add an objective retrieval benchmark.

This is the smallest architecture change that materially improves enterprise knowledge fidelity while preserving the existing SimForge product loop.
