-- Simulation configuration is API-only. Service-role requests enforce organization membership and role permissions.
alter table public."Simulation" enable row level security;
alter table public."SimulationPersona" enable row level security;
alter table public."SimulationObjective" enable row level security;
alter table public."SimulationEvaluationCriterion" enable row level security;
alter table public."SimulationCriterionLink" enable row level security;
alter table public."SimulationKnowledgeBase" enable row level security;
alter table public."SimulationVersion" enable row level security;
alter table public."SimulationSession" enable row level security;
alter table public."SimulationMessage" enable row level security;
alter table public."SimulationEvaluation" enable row level security;
alter table public."CapabilityScore" enable row level security;
