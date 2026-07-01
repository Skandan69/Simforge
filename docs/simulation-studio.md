# Simulation Studio foundation

Simulation Studio is the trainer-facing configuration layer for structured practice. A simulation belongs to one organization and combines scenario context, difficulty, duration, reusable persona, learning objectives, evaluation criteria, and one or more active knowledge bases.

## Permissions

- Owner, Admin, and Trainer: create and fully manage simulations, personas, and criteria.
- Manager: browse and preview configuration only.
- Learner: no Simulation Studio access until learner attempts exist.

The API enforces these rules independently of the web interface and scopes every read and mutation to the caller’s organization.

## Versioning and future runtime

Each create and update stores a JSON configuration snapshot in `SimulationVersion`. The preview is static configuration—not an execution runtime. A future attempt engine can load active simulation configuration and consume completed `KnowledgeChunk` data through the Knowledge Processing Engine.

No conversation model, avatar, voice, video, roleplay session, scoring, coaching, attempt, or analytics capability is included.
