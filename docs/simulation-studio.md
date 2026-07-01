# Simulation Studio foundation

Simulation Studio is the trainer-facing configuration layer for structured practice. A simulation belongs to one organization and combines scenario context, difficulty, duration, reusable persona, learning objectives, evaluation criteria, and one or more active knowledge bases.

## Permissions

- Owner, Admin, and Trainer: create and fully manage simulations, personas, and criteria.
- Manager: browse and preview configuration only.
- Learner: no Simulation Studio access until learner attempts exist.

The API enforces these rules independently of the web interface and scopes every read and mutation to the caller’s organization.

## Versioning and future runtime

Each create and update stores a JSON configuration snapshot in `SimulationVersion`. The preview is static configuration—not an execution runtime. A future attempt engine can load active simulation configuration and consume completed `KnowledgeChunk` data through the Knowledge Processing Engine.

No conversation model, avatar, voice, video, live AI roleplay, coaching, learner UI, or analytics capability is included.

## Sophia MVP runtime foundation

The backend now persists organization-scoped simulation sessions, learner and placeholder AI messages, session evaluations, and six workforce capability scores. The evaluation service is deterministic until an approved server-side AI provider is added; its route and persistence contracts are designed to remain stable when that adapter is introduced.

Demo data is not seeded automatically. A usable demo requires an authenticated user with an organization membership and one `Active` simulation linked to its existing persona, objectives, evaluation criteria, and knowledge bases. Start the session through `POST /api/simulation-sessions` so learner ownership and organization scope are assigned by the API.

Current runtime limitations: placeholder AI replies do not conduct a real conversation, deterministic scores are not production evaluation, failed-session transitions are not exposed, and no learner attempt UI or analytics aggregation is included.
