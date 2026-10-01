-- Security hardening: these tables were created without row level security.
-- All access goes through the authenticated API (service role), so direct
-- PostgREST access for anon/authenticated is removed, matching the other
-- API-only tables.
ALTER TABLE public."CapabilityAssessmentHistory" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."CapabilityAssessmentHistory" FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public."CapabilityAssessmentHistory" FROM authenticated;
ALTER TABLE public."KnowledgeIntelligenceSection" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."KnowledgeIntelligenceSection" FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public."KnowledgeIntelligenceSection" FROM authenticated;
ALTER TABLE public."LearnerCapability" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."LearnerCapability" FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public."LearnerCapability" FROM authenticated;
ALTER TABLE public."LearnerCapabilityProfile" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."LearnerCapabilityProfile" FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public."LearnerCapabilityProfile" FROM authenticated;
ALTER TABLE public."LearningFactoryDraft" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."LearningFactoryDraft" FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public."LearningFactoryDraft" FROM authenticated;
ALTER TABLE public."OrganizationBlueprint" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."OrganizationBlueprint" FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public."OrganizationBlueprint" FROM authenticated;
ALTER TABLE public."SimulationCoachingInsight" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."SimulationCoachingInsight" FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public."SimulationCoachingInsight" FROM authenticated;
