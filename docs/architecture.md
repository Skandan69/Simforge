# SimForge architecture

## Shape

SimForge is an npm-workspaces TypeScript monorepo:

- `apps/web`: Next.js browser experience.
- `apps/api`: Express API, AI orchestration and processing runtime.
- `packages/shared`: stable cross-app types/constants.
- `database/prisma`: schema and migrations.
- `database/supabase`: storage and security setup.

## Trust boundary

```text
Browser
  ↓ Supabase session / bearer token
Next.js
  ↓ authenticated HTTP
Express API
  ↓ tenant + role authorization
Prisma
  ↓
Supabase PostgreSQL / Storage
```

The browser does not receive database credentials or the service-role key. Protected Next.js routes improve UX, but the Express API is the authorization boundary and revalidates every protected request.

## Identity and tenancy

Supabase Auth owns identity. `Profile` and `Membership` map authenticated users into one organization and one of five roles:

- Owner
- Admin
- Trainer
- Manager
- Learner

Owner/Admin member-management APIs use Supabase Admin invitations plus server-side Profile/Membership writes. Role changes/removals invalidate cached workspace authorization immediately.

All business queries are organization-scoped. API-owned tables exposed through the public schema are hardened with RLS and revoked direct `anon`/`authenticated` privileges so trusted server access remains the intended path.

## Knowledge

Knowledge Studio stores private originals in Supabase Storage and governed metadata in PostgreSQL.

Processing validates source signatures and actual byte size, extracts PDF/DOCX/PPTX/XLSX content, applies archive/PDF safety limits, creates chunks, and records recoverable job state. Stale processing work can be safely recovered.

Knowledge retrieval combines lexical and vector evidence, supports governed version lifecycle, and returns machine-controlled citations/no-answer behavior.

## Simulation and capability runtime

Simulation Studio stores scenarios, personas, objectives, linked knowledge and evaluation criteria.

Sophia runtime creates tenant-scoped sessions/messages and can use text or voice AI. Evaluation is idempotent/transactional so a completed session cannot be silently regraded. Evaluations feed:

- CapabilityScore
- LearnerCapabilityProfile
- CapabilityAssessmentHistory
- SimulationCoachingInsight

## Orchestration

Manager Intelligence reads capability/evaluation evidence and supports PracticeAssignment.

Assessment Studio reuses SimulationSession/Evaluation rather than creating a separate scoring engine.

Development Paths orchestrate ordered PRACTICE and ASSESSMENT steps and derive progress from underlying evidence rather than manual completion flags.

Reports reuse Manager Intelligence evidence instead of introducing a separate analytics store for the pilot.

## Operations

- Render hosts the existing production API.
- Vercel hosts the existing production web app.
- GitHub Actions validates Prisma generation, typecheck, lint, tests, build, diff integrity and critical dependency audit.
- public `/health` is intentionally minimal.
- protected `/health/details` exposes provider/deployment diagnostics only when the configured token is supplied.
- API and AI-cost endpoints have per-user rate limits.

The platform intentionally avoids extra permanent per-sprint services. Staging validates release candidates; successful work merges back into the existing production SimForge.
