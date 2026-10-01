import assert from "node:assert/strict";
import test from "node:test";
import { API_OWNED_SECURITY_TABLES, securityHardeningStatements } from "./database-hardening.js";

test("security hardening mirrors the canonical RLS migration", () => {
  assert.deepEqual(API_OWNED_SECURITY_TABLES, [
    "CapabilityAssessmentHistory",
    "KnowledgeIntelligenceSection",
    "LearnerCapability",
    "LearnerCapabilityProfile",
    "LearningFactoryDraft",
    "OrganizationBlueprint",
    "SimulationCoachingInsight",
  ]);

  const statements = securityHardeningStatements();
  assert.equal(statements.length, API_OWNED_SECURITY_TABLES.length * 3);
  for (const table of API_OWNED_SECURITY_TABLES) {
    assert.ok(statements.includes(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY`));
    assert.ok(statements.includes(`REVOKE ALL PRIVILEGES ON TABLE public."${table}" FROM anon`));
    assert.ok(statements.includes(`REVOKE ALL PRIVILEGES ON TABLE public."${table}" FROM authenticated`));
  }
});
