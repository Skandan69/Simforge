# SimForge

SimForge is an enterprise simulation-training platform foundation built as a TypeScript monorepo. It includes Supabase authentication, organization workspaces, role-aware access, and Knowledge Studio for governed document storage and metadata management.

Simulation Studio remains a navigation placeholder. The Knowledge Processing Engine deterministically extracts and chunks supported files for future modules. It contains no AI, embeddings, vector storage, RAG, summaries, or generated content.

## Repository structure

```text
apps/
  web/          Next.js 16, Tailwind CSS 4, shadcn/ui, Supabase SSR
  api/          Express 5, Supabase token verification, Prisma
database/
  prisma/       Schema and foundation migration
  supabase/     Storage bucket and policy setup
packages/
  shared/       Shared contracts, roles, and constants
docs/           Product and architecture notes
```

## Prerequisites

- Node.js 20.9 or newer
- A Supabase project with email/password authentication enabled
- Supabase PostgreSQL connection strings

## Local setup

1. Install dependencies from the repository root:

   ```bash
   npm install
   ```

2. Copy the environment templates:

   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

3. Add your Supabase project URL and publishable key to both app environment files. Add the pooled PostgreSQL URL to `DATABASE_URL` and the direct URL to `DIRECT_URL` in the root `.env`.

4. Apply the database migration:

   ```bash
   npm run db:migrate
   ```

5. Run [`database/supabase/storage.sql`](database/supabase/storage.sql), [`database/supabase/knowledge-storage.sql`](database/supabase/knowledge-storage.sql), and [`database/supabase/processing-rls.sql`](database/supabase/processing-rls.sql) in the Supabase SQL editor. These configure private storage and keep processing tables accessible only through the authenticated API.

6. In Supabase Authentication URL Configuration, add these local redirect URLs:

   ```text
   http://localhost:3000/auth/callback
   http://localhost:3000/reset-password
   ```

   Configure a custom SMTP provider before production use so confirmation and password-recovery emails are delivered reliably.

7. Start both applications:

   ```bash
   npm run dev
   ```

The web app runs at `http://localhost:3000`, the API at `http://localhost:4000`, and the health check at `http://localhost:4000/health`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run shared types, web, and API in watch mode |
| `npm run dev:web` | Run only the Next.js app |
| `npm run dev:api` | Run only the Express API |
| `npm run build` | Generate Prisma Client and build every workspace |
| `npm run typecheck` | Type-check every workspace |
| `npm run lint` | Lint workspaces that define linting |
| `npm run db:validate` | Validate the Prisma schema |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Apply development migrations |

## Authentication and first login

Registration uses Supabase’s email-confirmation flow. After the first successful login, SimForge creates the user profile lazily and routes the user to organization setup. Organization creation assigns the creator the `Owner` role. The remaining supported roles are `Admin`, `Trainer`, `Manager`, and `Learner`.

All workspace pages are protected in Next.js, and the API independently validates the Supabase access token before returning organization data.

## Knowledge Studio

Knowledge Studio supports multiple departmental knowledge bases, PDF/DOCX/PPTX/XLSX uploads up to 50 MB, real upload progress, notes, version replacement, private downloads, archiving, deletion, and metadata search. Owner, Admin, and Trainer can make changes. Manager and Learner are read-only.

Add `SUPABASE_SERVICE_ROLE_KEY` only to the API environment. It is used for trusted Storage cleanup and must never be exposed through a `NEXT_PUBLIC_` variable.

## Knowledge Processing Engine

Every new or replaced PDF, DOCX, PPTX, or XLSX file is queued automatically. The API worker downloads the private source, validates its signature, extracts plain text, captures document metadata, splits text into configurable internal chunks, and records progress and failures. Processing can be cancelled, retried, or rerun from Knowledge Studio.

The source-centric `KnowledgeSource` and `KnowledgeChunk` contracts are independent of the UI. Future Simulation Studio and AI services should consume completed chunks through the processing API rather than reading uploaded files directly. Future source types are represented in the schema for websites, media, OCR, SharePoint, Confluence, and APIs, but their adapters are intentionally deferred.
