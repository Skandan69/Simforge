# SimForge

SimForge is an enterprise simulation-training platform foundation built as a TypeScript monorepo. Sprint 1 includes Supabase email/password authentication, protected routes, organization onboarding, role-aware persistence, and a responsive enterprise dashboard.

Knowledge Studio and Simulation Studio are navigation placeholders only; product functionality has not started.

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

5. Run [`database/supabase/storage.sql`](database/supabase/storage.sql) in the Supabase SQL editor. This creates the organization-logo bucket and its upload policy.

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
