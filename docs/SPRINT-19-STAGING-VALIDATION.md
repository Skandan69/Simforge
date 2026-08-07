# Sprint 19 Staging Validation

Date: August 7, 2026

Current status:

- Sprint 19 implementation: approved
- Local validation: passed
- Staging database: ready
- Staging application deployment: approved, not yet executed
- Production deployment: not approved

Recommendation: NOT READY FOR PRODUCTION DEPLOYMENT

## 1. Staging deployment details

Target staging Supabase project:

- Project name: `SimForge-Staging`
- Project ref: `zyrxivxvywruyoogrmki`

Production Supabase project ref:

- `mjqtfgyikverxckcyxri`

Production was not touched during this validation phase.

Deployment architecture discovered in the repository:

- Backend: Render-style service configuration exists in `render.yaml`
- Frontend: Next.js app under `apps/web`
- Monorepo root build: `npm run build`
- API build command: `npm run render-build`
- API start command: `npm run start --workspace @simforge/api`
- Web build command: `npm run build --workspace @simforge/web`

Deployment tooling status from Codex workspace:

- Git remote exists: `https://github.com/Skandan69/Simforge.git`
- GitHub CLI is installed but not authenticated; keyring token is invalid
- `git ls-remote` could not reach GitHub from this environment
- Vercel CLI is not installed
- Render CLI is not installed
- No local `.vercel/project.json` or `apps/web/.vercel/project.json` binding was found

Result:

- Staging application deployment could not be executed from this Codex environment.
- New staging frontend/API services likely require manual Render/Vercel dashboard setup or restored GitHub/deployment authentication.

## 2. Environment verification

Staging environment requirements for deployment:

API/server:

- `DATABASE_URL`: staging Transaction Pooler for project `zyrxivxvywruyoogrmki`
- `SUPABASE_URL`: `https://zyrxivxvywruyoogrmki.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY`: staging publishable key
- `SUPABASE_SERVICE_ROLE_KEY`: staging service-role key, server-side only
- `OPENAI_API_KEY`: server-side only
- `EMBEDDING_PROVIDER=openai`
- `OPENAI_EMBEDDING_MODEL=text-embedding-3-small`
- `OPENAI_EMBEDDING_DIMENSIONS=1536`

Web:

- `NEXT_PUBLIC_SUPABASE_URL=https://zyrxivxvywruyoogrmki.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: staging publishable key
- `NEXT_PUBLIC_API_URL`: staging API URL after API service is created

Production project ref `mjqtfgyikverxckcyxri` must not appear in staging deployment configuration.

Local staging env verification already confirmed:

- staging ref present
- production ref absent
- embedding model/dimension config matches `vector(1536)`

## 3. Document ingestion results

Pending staging application deployment.

Required test order:

1. PDF
2. DOCX
3. PPTX
4. XLSX

Required flow:

Upload document → processing → structured chunks → embeddings → retrieval → Ask Sophia → grounded answer → machine-controlled sources

## 4. Embedding results

Database readiness: passed.

Verified in staging DB:

- `pgvector` installed
- `KnowledgeChunkEmbedding` exists
- `KnowledgeChunkEmbedding.embedding` is `vector(1536)`
- HNSW index exists with `vector_cosine_ops`

Application embedding execution remains pending until staging API is deployed and QA documents are processed.

## 5. Ask Sophia results

Pending staging application deployment.

Required Ask Sophia cases:

- direct fact
- paraphrased fact
- buried detail
- exact number/date
- policy exception
- cross-document question
- ambiguous question
- no-answer question
- KB-scoped question

Expected:

- answers match retrieved evidence
- citations map to machine-controlled evidence IDs
- no invented source metadata
- insufficient-evidence behavior works
- weak retrieval does not invent policy

## 6. Citation integrity

Pending staging application deployment and QA document ingestion.

Required validation:

- citation labels correspond to stored document/version metadata
- page, slide, sheet, and row metadata display where available
- model cannot invent source IDs
- displayed sources come from machine-controlled evidence

## 7. Insufficient-evidence behavior

Pending staging application deployment.

Expected behavior:

- no-answer questions should not hallucinate policy
- low-confidence retrieval should produce insufficient-evidence behavior
- ASK responses should distinguish known evidence from unknowns

## 8. Version lifecycle

Pending staging application deployment and QA document ingestion.

Required scenario:

1. Upload `QA TEST - Policy v1`
2. Set refund period to `30 days`
3. Confirm ASK returns `30 days`
4. Upload/process v2 with refund period `14 days`
5. While v2 is processing, confirm v1 remains active
6. After v2 activation, confirm ASK returns `14 days`
7. If safely possible, simulate failed v3 processing
8. Confirm v2 remains active

## 9. Tenant isolation

Pending staging application deployment.

Required:

- Create two QA-only organizations if supported safely
- Confirm Org A cannot retrieve Org B knowledge
- Tenant leakage must equal `0`

Any tenant leakage is a P0 release blocker.

## 10. 50-document benchmark

Pending staging application deployment and QA data generation.

Targets:

- buried-detail Recall@5 >= 95%
- citation correctness >= 95%
- no-answer failure <= 2%
- tenant leakage = 0
- p95 retrieval latency < 1 second before LLM generation

## 11. 500-document benchmark

Pending acceptable Phase A result.

Do not run until the 50-document benchmark reaches acceptable quality.

## 12. 5,000-document benchmark

Pending acceptable Phase B result and staging capacity approval.

If staging cannot practically support this scale, record exactly what was validated and what remains unproven.

## 13. Retrieval latency

Pending staging application deployment.

Measure separately:

- lexical retrieval
- vector retrieval
- reciprocal rank fusion
- deterministic reranking
- evidence selection
- prompt preparation
- LLM generation

The <1 second target applies to retrieval before LLM generation.

## 14. AI/API cost observations

Pending staging application deployment and QA ingestion.

Record:

- chunks per document
- embedding tokens
- embedding requests
- query embedding requests
- evidence tokens passed to Sophia
- ASK prompt size

Estimate practical cost for:

- 1,000 pages
- 10,000 pages
- 100,000 pages

using configurable provider pricing assumptions.

## 15. Simulation regression

Pending staging application deployment.

Required existing capability journey:

Knowledge → Simulation → Sophia Runtime → Live Intelligence → Evaluation → AI Coach → Capability Profile → Premium Report

Sprint 19 is not successful if ASK works but this journey regresses.

## 16. Defects found

Current defects/blockers:

1. GitHub authentication/network access from Codex is unavailable.
2. Render CLI is not installed.
3. Vercel CLI is not installed.
4. No local Vercel project binding exists.
5. Staging application services have not yet been created or deployed.

No Sprint 19 database-schema defect remains based on accepted staging DB verification.

## 17. Remaining blockers

P0 before end-to-end staging validation:

- Create staging API service.
- Create staging frontend service.
- Configure staging-only environment variables.
- Ensure production project ref is absent from staging service env.
- Deploy Sprint 19 branch/build to staging.
- Verify `/health` on staging API.
- Verify staging frontend can authenticate against SimForge-Staging.

P0 before production:

- Complete document ingestion tests.
- Complete ASK Sophia tests.
- Complete tenant isolation tests.
- Complete 50-document benchmark.
- Complete existing simulation regression.

## 18. Production rollout plan

Do not execute until staging validation passes.

Proposed production sequence after approval:

1. Confirm production backup/snapshot.
2. Confirm production `OPENAI_EMBEDDING_DIMENSIONS=1536`.
3. Apply Sprint 19 SQL manually or via approved production process.
4. Deploy API and web versions containing Sprint 19.
5. Smoke-test health, Knowledge Studio, ASK Sophia, and simulation journey.
6. Monitor retrieval latency, embedding errors, and API errors.

## 19. Rollback plan

If Sprint 19 retrieval fails in staging or production:

1. Disable embedding provider configuration if needed to force lexical fallback.
2. Preserve current active document retrieval versions.
3. Stop processing new embedding jobs.
4. Keep ASK unavailable or lexical-only rather than serving malformed vector results.
5. Roll back application deployment to the previous version if API/web behavior regresses.
6. For database rollback, restore from a pre-migration snapshot rather than hand-editing partially migrated production schema.

## 20. Manual staging deployment setup needed

Because Codex currently lacks authenticated GitHub/deployment access, create staging services manually or restore deployment authentication.

Recommended staging API service:

- Provider: Render
- Service type: Web Service
- Name: `simforge-api-staging`
- Repository: `Skandan69/Simforge`
- Branch: Sprint 19 staging branch after it is created/pushed, or a manually selected branch containing Sprint 19
- Root directory: repository root
- Build command: `npm ci --include=dev && npm run render-build`
- Start command: `npm run start --workspace @simforge/api`
- Health check path: `/health`
- Environment:
  - `NODE_VERSION=22.16.0`
  - `NODE_ENV=production`
  - staging `DATABASE_URL`
  - staging `SUPABASE_URL`
  - staging `SUPABASE_PUBLISHABLE_KEY`
  - staging `SUPABASE_SERVICE_ROLE_KEY`
  - server-only `OPENAI_API_KEY`
  - `AI_PROVIDER=openai`
  - `EMBEDDING_PROVIDER=openai`
  - `OPENAI_EMBEDDING_MODEL=text-embedding-3-small`
  - `OPENAI_EMBEDDING_DIMENSIONS=1536`
  - `FRONTEND_URL=<staging frontend URL after created>`
  - `WEB_URL=<staging frontend URL after created>`

Recommended staging web service:

- Provider: Vercel
- Project name: `simforge-web-staging`
- Repository: `Skandan69/Simforge`
- Root directory: `apps/web`
- Build command: default or `npm run build`
- Environment:
  - `NEXT_PUBLIC_SUPABASE_URL=https://zyrxivxvywruyoogrmki.supabase.co`
  - staging `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `NEXT_PUBLIC_API_URL=<staging API URL>`

After both staging URLs exist:

1. Update staging API `FRONTEND_URL`/`WEB_URL` to the staging frontend URL.
2. Redeploy staging API.
3. Confirm `/health`.
4. Begin QA-only data creation and end-to-end validation.

Production release recommendation:

NOT READY FOR PRODUCTION DEPLOYMENT

Evidence:

- Staging database is ready.
- Local validation passed.
- Staging application deployment has not yet occurred.
- End-to-end ingestion, ASK, version lifecycle, tenant isolation, benchmark, and simulation regression tests remain pending.
