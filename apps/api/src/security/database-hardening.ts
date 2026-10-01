import { prisma } from "../lib/prisma.js";

/**
 * Every Prisma business table is required to have RLS enabled in production.
 *
 * Membership is the single intentional browser-readable exception because the
 * Supabase Storage policies use the authenticated user's own membership row to
 * authorize private knowledge-document access. It therefore keeps its narrow
 * authenticated SELECT policy instead of having direct authenticated access
 * revoked wholesale.
 */
export const DIRECT_AUTHENTICATED_TABLES = ["Membership"] as const;

export const API_OWNED_SECURITY_TABLES = [
  "Profile",
  "Organization",
  "OrganizationBlueprint",
  "KnowledgeBase",
  "Simulation",
  "SimulationPersona",
  "SimulationObjective",
  "SimulationEvaluationCriterion",
  "SimulationCriterionLink",
  "SimulationKnowledgeBase",
  "SimulationVersion",
  "SimulationSession",
  "PracticeAssignment",
  "Assessment",
  "AssessmentAssignment",
  "AssessmentAttempt",
  "DevelopmentPath",
  "DevelopmentPathStep",
  "DevelopmentPathAssignment",
  "DevelopmentPathStepProgress",
  "SimulationCoachingInsight",
  "LearnerCapabilityProfile",
  "LearnerCapability",
  "CapabilityAssessmentHistory",
  "SimulationMessage",
  "SimulationEvaluation",
  "CapabilityScore",
  "Document",
  "LearningFactoryDraft",
  "KnowledgeSource",
  "KnowledgeIntelligenceSection",
  "ProcessingJob",
  "KnowledgeChunk",
  "KnowledgeChunkEmbedding",
  "ProcessingLog",
  "DocumentVersion",
  "Activity",
] as const;

export const RLS_REQUIRED_TABLES = [
  ...API_OWNED_SECURITY_TABLES,
  ...DIRECT_AUTHENTICATED_TABLES,
] as const;

export function securityHardeningStatements() {
  return [
    ...RLS_REQUIRED_TABLES.map(
      (table) => `ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY`,
    ),
    ...API_OWNED_SECURITY_TABLES.flatMap((table) => [
      `REVOKE ALL PRIVILEGES ON TABLE public."${table}" FROM anon`,
      `REVOKE ALL PRIVILEGES ON TABLE public."${table}" FROM authenticated`,
    ]),
  ];
}

export async function enforceApiOwnedTableSecurity() {
  for (const statement of securityHardeningStatements()) {
    await prisma.$executeRawUnsafe(statement);
  }
}
