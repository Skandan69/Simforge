# SimForge

SimForge is an AI Workforce Intelligence Platform that turns governed organization knowledge into practice, assessments, coaching, development paths, and measurable capability improvement.

The production workflow is:

**Organization Blueprint → Knowledge Studio → Knowledge Intelligence → Learning Factory → Simulation / Sophia → Evaluation → AI Coach → Capability Profile → Manager Intelligence → Practice / Assessment / Development Paths → Reports**

## Repository

```text
apps/
  web/          Next.js 16 browser application
  api/          Express 5 API and AI/runtime services
database/
  prisma/       Prisma schema and migrations
  supabase/     Storage/RLS setup scripts
packages/
  shared/       Shared contracts, constants, roles
docs/           Architecture, product, and release notes
```

## Runtime

- Node.js 22.13+
- Supabase Auth, PostgreSQL, Storage
- Prisma 7
- OpenAI-compatible AI, embeddings, transcription and speech providers
- Next.js web app
- Express API

The browser authenticates with Supabase. All tenant-sensitive application data is accessed through the SimForge API, which independently verifies the bearer token and organization membership.

## Product capabilities

- Organization onboarding and Blueprint
- Owner/Admin workspace member administration and invitations
- Knowledge Studio for PDF, DOCX, PPTX and XLSX
- resilient processing, chunking, embeddings and governed version lifecycle
- hybrid knowledge retrieval and grounded Ask Sophia with citations/no-answer behavior
- Learning Factory draft generation and approved simulation publishing
- Simulation Studio, personas, objectives and evaluation criteria
- Sophia AI roleplay with text/voice runtime
- evaluation, capability scores, AI Coach and premium reports
- learner Capability Profile and history
- Manager Intelligence and practice assignment
- My Practice
- Assessment Studio and My Assessments
- Development Paths and My Development
- evidence-derived manager Reports with CSV export

SimForge is intentionally **not** an LMS. It does not attempt to provide SCORM delivery, course catalogs, attendance, or generic content hosting as the core product.

## Local setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy environment templates:

   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

3. Configure Supabase/PostgreSQL and server-only provider keys.

4. Generate Prisma Client and apply migrations to the intended development database:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. Start the platform:

   ```bash
   npm run dev
   ```

Web: `http://localhost:3000`  
API: `http://localhost:4000`  
Health: `http://localhost:4000/health`

## Validation

```bash
npm run db:validate
npm run db:generate
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
```

GitHub CI runs the same release gates on pull requests to `main`.

## Security boundaries

- Supabase Auth owns identity.
- Prisma Membership owns organization authorization.
- API routes enforce role and tenant scope server-side.
- API-owned public-schema tables use RLS/grant hardening to prevent direct anonymous/authenticated Data API access.
- service-role credentials and AI keys stay server-side.
- uploads are signature/size validated and document processing applies archive/PDF safety limits.
- AI-cost routes are rate-limited.
- public `/health` exposes liveness only; detailed diagnostics require the health token.

## Deployment

The API is deployed to the existing Render production service and the web app to the existing Vercel production project. New feature work must be validated on staging and then merged into the same production SimForge rather than creating parallel permanent applications.

See `docs/architecture.md` and `docs/product.md` for the current product and architecture boundaries.
