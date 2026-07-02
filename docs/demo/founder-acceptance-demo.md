# Founder Acceptance Demo

This demo exercises the real SimForge data model and product flow for a customer-support use case. It does not inject frontend-only fixtures, create Supabase Auth credentials, run migrations, create completed sessions, or prefill learner scores.

## Demo content

The repeatable seed creates the organization **SimForge Customer Support Academy** with:

- an approved Organization Blueprint for customer service, policy compliance, communication, and escalation handling;
- a **Customer Support Operations** knowledge base;
- five processed knowledge records:
  - Refund Policy;
  - Escalation SOP;
  - Customer Empathy Guidelines;
  - Shipping Delay Response Guide;
  - Customer Identity Verification SOP;
- ten Knowledge Intelligence sections marked Critical or Important, with capability mappings and confidence;
- an **Angry customer** simulation persona;
- Communication, Policy Compliance, Empathy, Decision Making, and Problem Solving evaluation criteria;
- the active simulation **Angry customer requesting refund after return window**.

The processed text, chunks, and intelligence sections are database-backed and are consumed by Sophia, Learning Factory, Capability Intelligence, and AI Coach through their normal services.

## Prerequisites

1. Apply all repository Prisma migrations to the target Supabase project outside Codex.
2. Create a dedicated founder-demo user through the normal registration flow. Do not reuse a user that already belongs to another organization.
3. Sign in once. The `/api/me` request creates the matching application Profile. Stop at organization onboarding; do not create a workspace manually.
4. Ensure the local API environment contains the normal database and Supabase values.
5. Set `DEMO_OWNER_EMAIL` to the dedicated user's exact email address.

The seed deliberately refuses to continue when the profile is missing or already belongs to a different organization. It never creates or prints credentials.

## Seed the demo

From the repository root:

```powershell
$env:DEMO_OWNER_EMAIL="founder-demo@example.com"
npm run demo:seed
```

The command is idempotent. Re-running it updates the controlled demo records and preserves the same organization, document, knowledge, persona, and simulation identities.

Expected confirmation:

```text
Founder demo ready: SimForge Customer Support Academy; 5 knowledge documents; simulation “Angry customer requesting refund after return window”.
```

## Manual founder setup

- Sign in with the dedicated Supabase Auth user used by `DEMO_OWNER_EMAIL`.
- Configure `AI_PROVIDER=openai` and a server-only `OPENAI_API_KEY` on the API deployment only if live Sophia responses are required. Deterministic fallbacks still allow the workflow to complete without it.
- The seed creates document metadata, extracted text, chunks, and intelligence sections but does not upload source binaries to Supabase Storage. Document download/replace is therefore not part of this seeded demo. Upload a real DOCX through Knowledge Studio when testing storage or extraction separately.

## Founder acceptance flow

1. **Dashboard** — confirm the organization name and that the Organization Blueprint is ready.
2. **Organization Blueprint** — review goals, capability priorities, costly mistakes, and non-negotiables.
3. **Knowledge Studio** — open Customer Support Operations and review the five documents. Open a document to inspect Knowledge Intelligence classifications, confidence, importance, summaries, and capability mappings.
4. **Learning Factory** — select **Generate drafts**. Confirm that Critical and Important sections produce review-required simulation, objective, question-bank, and coaching-focus drafts. Approve or reject at least one draft. Generate again and confirm duplicates are skipped.
5. **Simulation Studio** — open **Angry customer requesting refund after return window** and start the simulation.
6. **Sophia Simulation** — respond as a Customer Support Associate. Demonstrate empathy, explain the 30-day refund policy, avoid promising an exception, and offer a supervisor escalation with context.
7. **Capability report** — end and evaluate the simulation. Confirm six capability scores, evidence, strengths, improvement areas, and the recommended practice.
8. **AI Coach** — confirm the report adds concise coaching, linked knowledge gaps, one next action, capability changes, and an estimated improvement clearly labeled as an estimate.
9. **Capability Profile** — confirm the completed simulation contributes to the learner's persistent profile. Repeat the simulation to demonstrate history and score changes.

## Expected outcome

The acceptance run should demonstrate one connected story:

> Approved organizational priorities and governed knowledge produce practice drafts; Sophia runs a realistic scenario; the evaluation updates capability history; AI Coach turns evidence into a focused next action.

## Intentional limitations

- No demo user or password is created by the seed.
- No source document binary is uploaded to Storage.
- No simulation session, evaluation, capability profile, or coaching insight is pre-generated; the founder creates these through real product actions.
- Learning Factory drafts are generated through the real UI/API after seeding, so duplicate prevention and review controls are exercised during acceptance.
- The seed is for a dedicated demo environment or dedicated demo organization, not an existing customer workspace.
