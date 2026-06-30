# Database

The database layer uses Prisma 7 with Supabase PostgreSQL.

- `DATABASE_URL` uses the Supabase transaction pooler for API traffic.
- `DIRECT_URL` uses a direct connection for Prisma migrations.
- `prisma/schema.prisma` defines profiles, organizations, memberships, roles, and activity.
- `prisma/migrations` contains the versioned foundation migration.
- `supabase/storage.sql` configures the public logo bucket and an authenticated upload policy.

Run Prisma commands from the repository root so `prisma.config.ts` is discovered. Apply `storage.sql` separately in the Supabase SQL editor because storage objects live outside the Prisma-owned application schema.
