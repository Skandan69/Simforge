# Database

The database layer uses Prisma 7 with Supabase PostgreSQL.

- `DATABASE_URL` uses the Supabase transaction pooler for API traffic.
- `DIRECT_URL` uses a direct connection for Prisma migrations.
- `prisma/schema.prisma` defines organizations, memberships, roles, knowledge bases, documents, versions, and activity.
- `prisma/migrations` contains the versioned Sprint 1 and Sprint 2 migrations.
- `supabase/storage.sql` configures the public logo bucket and an authenticated upload policy.
- `supabase/knowledge-storage.sql` configures private documents and organization-role policies.

Run Prisma commands from the repository root so `prisma.config.ts` is discovered. Apply both Supabase storage SQL files separately in the SQL editor because storage objects live outside the Prisma-owned application schema.
