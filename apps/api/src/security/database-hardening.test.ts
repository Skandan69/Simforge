import assert from "node:assert/strict";
import test from "node:test";
import {
  API_OWNED_SECURITY_TABLES,
  DIRECT_AUTHENTICATED_TABLES,
  RLS_REQUIRED_TABLES,
  securityHardeningStatements,
} from "./database-hardening.js";

test("production hardening covers every Prisma business table", () => {
  const expectedTables = [
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
    "Membership",
    "Activity",
  ];

  assert.deepEqual([...RLS_REQUIRED_TABLES].sort(), [...expectedTables].sort());
  assert.deepEqual(DIRECT_AUTHENTICATED_TABLES, ["Membership"]);
  assert.equal(API_OWNED_SECURITY_TABLES.includes("Membership" as never), false);
});

test("security hardening enables RLS everywhere and revokes direct access from API-owned tables", () => {
  const statements = securityHardeningStatements();

  assert.equal(
    statements.length,
    RLS_REQUIRED_TABLES.length + API_OWNED_SECURITY_TABLES.length * 2,
  );

  for (const table of RLS_REQUIRED_TABLES) {
    assert.ok(
      statements.includes(
        `ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY`,
      ),
    );
  }

  for (const table of API_OWNED_SECURITY_TABLES) {
    assert.ok(
      statements.includes(
        `REVOKE ALL PRIVILEGES ON TABLE public."${table}" FROM anon`,
      ),
    );
    assert.ok(
      statements.includes(
        `REVOKE ALL PRIVILEGES ON TABLE public."${table}" FROM authenticated`,
      ),
    );
  }

  assert.equal(
    statements.includes(
      'REVOKE ALL PRIVILEGES ON TABLE public."Membership" FROM authenticated',
    ),
    false,
  );
});
