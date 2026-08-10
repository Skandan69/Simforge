# Sprint 22 Staging Validation — Learner Practice Experience / My Practice v1

Status: Ready for staging after local implementation validation.

## Scope

Sprint 22 adds a learner-facing My Practice experience that uses the existing Sprint 20 `PracticeAssignment` lifecycle and existing Sophia Runtime/reporting flow. It does not add a new engine, database model, or migration.

## Staging target

- Branch: `sprint22-my-practice`
- Backend route: `GET /api/my-practice`
- Frontend route: `/my-practice`

## Acceptance checklist

- [ ] Staging API `/health` returns the deployed Sprint 22 branch/commit.
- [ ] Staging frontend points to staging API and staging Supabase.
- [ ] Learner can authenticate and load protected dashboard.
- [ ] Dashboard shows My Practice card with outstanding, in-progress, and completed counts.
- [ ] Sidebar shows My Practice.
- [ ] Learner can open `/my-practice`.
- [ ] Empty state appears when learner has no assignments.
- [ ] Assigned practice appears under Needs Attention.
- [ ] In-progress practice appears under In Progress.
- [ ] Completed/cancelled practice appears under Completed.
- [ ] Start Practice creates an assignment-linked Sophia session.
- [ ] Continue Practice loads the existing session and does not create a duplicate session.
- [ ] Completed practice links to the existing premium simulation report.
- [ ] Report shows Evaluation, AI Coach, and Capability Profile evidence where available.
- [ ] Capability Profile/history remain sourced from completed simulation evaluations only.
- [ ] Learner cannot access another learner's assignments.
- [ ] Cross-tenant assignment access is denied.
- [ ] Owner/Admin/Trainer/Manager assignment creation from Manager Intelligence still works.
- [ ] Assignment lifecycle remains `ASSIGNED → IN_PROGRESS → COMPLETED`.
- [ ] Sprint 19 Ask Sophia regression passes.
- [ ] Sprint 20 Manager Intelligence and PracticeAssignment regression passes.

## Notes for QA

Use QA-only records. Do not delete or alter customer/founder demo data. Keep test assignment names/reasons prefixed with `QA TEST -` where practical.
