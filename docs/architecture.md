# Architecture notes

## Repository shape

SimForge uses npm workspaces to keep deployable applications and reusable code in one repository.

- `apps/web` owns the browser experience.
- `apps/api` owns HTTP endpoints and future application services.
- `packages/shared` owns stable cross-application types and constants.
- `database/prisma` owns the database schema and migrations.

## Runtime boundaries

The web app and API are independently deployable. The web app communicates with the API over authenticated HTTP. The API verifies Supabase bearer tokens and owns Prisma database access; browser code never receives database credentials.

## Identity and authorization

Supabase Auth owns email/password identities, verification, password recovery, and cookie-backed web sessions. Prisma stores application profiles and organization membership. Every organization is created with an Owner membership; the role enum also includes Admin, Trainer, Manager, and Learner.

Protected Next.js route groups verify the Supabase user on the server. The Express API independently verifies the access token on every protected request, so UI route protection is never treated as an authorization boundary.

## Database connectivity

Supabase PostgreSQL provides persistence. Application traffic uses the pooled connection string, while Prisma migrations use the direct connection string configured in `prisma.config.ts`. Supabase Storage holds optional organization logos with a per-user upload policy.

## Intentional omissions

Knowledge Studio, Simulation Studio, assessment workflows, invitations, queues, caching, observability vendors, and deployment providers are deliberately deferred until requirements justify them.
