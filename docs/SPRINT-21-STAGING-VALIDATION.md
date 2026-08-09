# Sprint 21 Staging Validation — Knowledge-Grounded Simulation Authoring Bridge v1

Status: implementation ready for staging validation after local checks pass.

## Scope

Sprint 21 connects approved Learning Factory simulation drafts to the existing Simulation Studio authoring workflow.

Validated flow:

Knowledge Studio → Knowledge Intelligence → Learning Factory SIMULATION draft → Trainer Review → Create Simulation → Simulation Studio → Sophia Practice → Evaluation → AI Coach → Capability Profile → Manager Intelligence → Practice Assignment

## Staging setup checklist

- [ ] Apply migration `20260809120000_knowledge_grounded_simulation_authoring_bridge` to staging only.
- [ ] Verify `LearningFactoryDraft.publishedSimulationId` exists.
- [ ] Verify `LearningFactoryDraft.publishedAt` exists.
- [ ] Verify `publishedSimulationId` is unique.
- [ ] Verify FK references `Simulation(id)` with `ON DELETE SET NULL`.
- [ ] Confirm production Supabase is untouched.

## Functional acceptance

- [ ] Generate Learning Factory drafts from approved Blueprint and processed Knowledge Intelligence sections.
- [ ] Approve a SIMULATION draft.
- [ ] Review and edit the draft in Learning Factory before publishing.
- [ ] Create a Simulation Studio Draft from the approved draft.
- [ ] Confirm the created simulation links to the source Knowledge Base.
- [ ] Confirm objectives map from the draft payload.
- [ ] Confirm evaluation criteria map from draft capabilities.
- [ ] Confirm Simulation Studio detail page opens for the created simulation.
- [ ] Confirm the simulation remains editable as a Draft.
- [ ] Confirm the draft becomes `PUBLISHED`.
- [ ] Confirm duplicate publish attempts return/open the existing simulation rather than creating a duplicate.

## Security acceptance

- [ ] Owner can create a simulation from an approved draft.
- [ ] Admin can create a simulation from an approved draft.
- [ ] Trainer can create a simulation from an approved draft.
- [ ] Manager can create a simulation from an approved draft for assignment/review workflows.
- [ ] Learner cannot publish from Learning Factory.
- [ ] A draft from another organization cannot be read or published.
- [ ] A source document/knowledge base from another organization cannot be linked.
- [ ] Archived or missing source knowledge blocks publishing.

## Regression checks

### Sprint 19

- [ ] Knowledge Studio document processing still completes.
- [ ] Knowledge chunks and embeddings still activate only for active document versions.
- [ ] Ask Sophia answers grounded questions with citations.
- [ ] Ask Sophia returns no-answer behavior without unrelated citations.
- [ ] Superseded document versions are not retrieved.

### Sprint 20

- [ ] Manager Intelligence overview loads.
- [ ] PracticeAssignment can assign an existing simulation.
- [ ] Learner can start assigned practice.
- [ ] Assignment transitions `ASSIGNED → IN_PROGRESS → COMPLETED`.
- [ ] Simulation evaluation completes.
- [ ] AI Coach insight generates.
- [ ] Capability Profile and Capability History update.
- [ ] Premium Report remains accessible.

## Evidence log

| Area | Result | Evidence |
| --- | --- | --- |
| Migration | Pending | Staging migration not yet applied. |
| Draft publish | Pending |  |
| Duplicate prevention | Pending |  |
| Tenant isolation | Pending |  |
| Sprint 19 regression | Pending |  |
| Sprint 20 regression | Pending |  |

## Known limitations

- Publishing creates a Simulation Studio `Draft`; trainers still need to review/edit/activate the simulation before broad learner use.
- The bridge does not create a new authoring engine. It intentionally reuses existing Simulation Studio models, routes, and runtime.
- Persona selection remains optional in v1; trainers can add or change personas in the existing Simulation Builder.
