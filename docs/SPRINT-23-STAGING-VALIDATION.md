# Sprint 23 Staging Validation — Assessment Studio v1

Status: implementation-ready checklist. Do not mark staging pass until all items are verified in the existing SimForge staging environment.

## Deployment identity

- [ ] API `/health` reports branch `sprint23-assessment-studio`
- [ ] API `/health` reports the approved Sprint 23 commit
- [ ] Staging web deploy uses branch `sprint23-assessment-studio`
- [ ] Staging web points to staging API and staging Supabase only

## Assessment Studio acceptance

- [ ] Owner/Admin/Trainer can create a Draft assessment
- [ ] Assessment links exactly one same-organization Simulation
- [ ] Cross-tenant Simulation linking is rejected
- [ ] Passing threshold uses persisted 0–100 evaluation score scale
- [ ] Assessed capabilities persist and display
- [ ] Draft can activate only when linked Simulation is Active
- [ ] Archived assessments cannot be started
- [ ] Inactive simulations cannot be used for active assessment start
- [ ] Manager can assign an Active assessment to a learner
- [ ] Learner cannot create, edit, activate, archive, or assign assessments

## Learner assessment flow

- [ ] Learner sees only own assessment assignments
- [ ] Assigned assessment appears in `/assessments`
- [ ] Start creates one `AssessmentAttempt`
- [ ] Start creates one linked `SimulationSession`
- [ ] Continue reuses the existing session
- [ ] Repeated Start/Continue does not create duplicate sessions
- [ ] Completion updates `AssessmentAttempt` pass/fail from saved evaluation
- [ ] Completion updates `AssessmentAssignment` to `COMPLETED`
- [ ] Premium Report, AI Coach, Capability Profile, and Capability History remain available through the existing simulation report path

## Manager Intelligence readiness signal

- [ ] Manager overview shows open assessments
- [ ] Manager overview shows completed assessments
- [ ] Manager overview shows passed readiness signals
- [ ] Manager Intelligence continues to show PracticeAssignment recommendations and learner capability evidence

## Regression suite

- [ ] Sprint 19 Knowledge Studio upload/processing/Ask Sophia/citations/no-answer/version integrity
- [ ] Sprint 20 Manager Intelligence and PracticeAssignment lifecycle
- [ ] Sprint 21 Knowledge → Simulation provenance and Learning Factory publish flow
- [ ] Sprint 22 My Practice assigned/start/continue/complete/results
- [ ] Simulation → Evaluation → AI Coach → Capability Profile → Premium Report

## Security and data integrity

- [ ] Organization scope enforced on every Assessment query
- [ ] Tenant isolation verified for Assessment, AssessmentAssignment, and AssessmentAttempt
- [ ] New assessment tables do not expose direct anon/authenticated Data API access
- [ ] Existing production data is not required for staging validation
- [ ] No staging test writes occur outside QA TEST records
