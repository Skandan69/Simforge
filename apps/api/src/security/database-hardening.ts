import { prisma } from "../lib/prisma.js";

export const API_OWNED_SECURITY_TABLES = [
  "CapabilityAssessmentHistory",
  "KnowledgeIntelligenceSection",
  "LearnerCapability",
  "LearnerCapabilityProfile",
  "LearningFactoryDraft",
  "OrganizationBlueprint",
  "SimulationCoachingInsight",
] as const;

export function securityHardeningStatements() {
  return API_OWNED_SECURITY_TABLES.flatMap((table) => [
    `ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY`,
    `REVOKE ALL PRIVILEGES ON TABLE public."${table}" FROM anon`,
    `REVOKE ALL PRIVILEGES ON TABLE public."${table}" FROM authenticated`,
  ]);
}

export async function enforceApiOwnedTableSecurity() {
  for (const statement of securityHardeningStatements()) {
    await prisma.$executeRawUnsafe(statement);
  }
}
