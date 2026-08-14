# Sprint 24 Staging Validation — Development Paths / My Development v1

Status: Not started.

Target branch: `sprint24-development-paths`

## Scope

Validate that Development Paths orchestrate existing SimForge evidence systems:

Manager identifies capability gap → assigns Development Path → learner sees My Development → completes ordered Practice / Assessment steps → existing Evaluation, AI Coach, Capability Profile, Premium Report, and Manager Intelligence update.

## Migration gate

- [ ] Apply `20260814120000_development_paths_v1` to staging only.
- [ ] Verify `DevelopmentPathStatus`, `DevelopmentPathStepType`, and `DevelopmentPathAssignmentStatus` enums.
- [ ] Verify `DevelopmentPath`, `DevelopmentPathStep`, `DevelopmentPathAssignment`, and `DevelopmentPathStepProgress`.
- [ ] Verify RLS enabled.
- [ ] Verify direct `anon` and `authenticated` table grants revoked.
- [ ] Verify existing Sprint 19–23 schema remains intact.

## Acceptance tests

- [ ] Owner/Admin/Trainer can create Development Path draft.
- [ ] Ordered PRACTICE and ASSESSMENT steps are saved.
- [ ] Empty active path is blocked.
- [ ] Cross-tenant Simulation link is rejected.
- [ ] Cross-tenant Assessment link is rejected.
- [ ] Active path requires active Simulation and active Assessment.
- [ ] Owner/Admin/Trainer can activate/archive.
- [ ] Manager can assign active path to learner.
- [ ] Duplicate open path assignment is reused/prevented.
- [ ] Learner sees only own assigned paths in `/my-development`.
- [ ] Step 2 is locked until required Step 1 completes.
- [ ] PRACTICE step creates/reuses existing `PracticeAssignment`.
- [ ] PRACTICE step Start/Continue reuses existing Sophia runtime and session behavior.
- [ ] ASSESSMENT step creates/reuses existing `AssessmentAssignment`.
- [ ] ASSESSMENT Start/Continue reuses Sprint 23 `AssessmentAttempt` and `SimulationSession`.
- [ ] Completed practice step updates path progress.
- [ ] Passed assessment step completes required step.
- [ ] Failed assessment shows Needs Reassessment and does not complete the required step.
- [ ] Path moves ASSIGNED → IN_PROGRESS → COMPLETED from evidence.
- [ ] Cancelled path assignment cannot start steps.
- [ ] Manager Intelligence shows path progress/readiness signals.
- [ ] Dashboard shows My Development entry.

## Regression tests

- [ ] Sprint 19: Knowledge Studio, embeddings, Ask Sophia, citations, no-answer, active chunks missing embeddings = 0.
- [ ] Sprint 20: Manager Intelligence, PracticeAssignment, Capability Profile/history, AI Coach.
- [ ] Sprint 21: Learning Factory → Simulation bridge, provenance.
- [ ] Sprint 22: My Practice, Start/Continue, same-session reuse.
- [ ] Sprint 23: Assessment Studio, My Assessments, AssessmentAttempt, score/pass-fail, Premium Report.

## Performance observations

- [ ] Development Paths dashboard latency.
- [ ] My Development latency.
- [ ] Step start latency for Practice.
- [ ] Step start latency for Assessment.
- [ ] Manager Intelligence path summary latency.

## Final staging classification

Choose one:

- `SPRINT 24 STAGING PASS — READY FOR PRODUCTION MERGE REVIEW`
- `SPRINT 24 STAGING PASS WITH MINOR ISSUES`
- `SPRINT 24 STAGING FAIL — FIX REQUIRED`
