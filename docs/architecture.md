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

Simulation Studio, assessment workflows, invitations, queues, caching, observability vendors, and deployment providers are deliberately deferred until requirements justify them.

## Knowledge Studio foundation

Knowledge Studio stores governed metadata in PostgreSQL and original files in a private Supabase Storage bucket. The hierarchy is Organization → Knowledge Base → Document → Document Version. Owner, Admin, and Trainer roles can mutate knowledge content; Manager and Learner roles are read-only in both the API and Storage policies.

Uploads travel directly from the authenticated browser to Supabase Storage so the UI can report byte-level progress. The Express API validates the organization-scoped storage path and persists metadata only after Storage accepts the file. Deletion is coordinated by the API with a server-only service-role key so database rows and every stored version are removed together.

No document contents are parsed. Search uses PostgreSQL metadata fields only, and the schema intentionally has no embeddings, chunks, AI indexes, prompts, or conversations.
