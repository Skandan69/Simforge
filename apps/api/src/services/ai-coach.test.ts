import assert from "node:assert/strict";
import test from "node:test";
import { buildDeterministicCoaching, canReadCoaching, coachingIdentity, coachingReadiness, coachingScope, generateCoachingWithFallback, type CoachingInput } from "./ai-coach.js";

const capabilities = ["Communication", "Product Knowledge", "Policy Compliance", "Empathy", "Problem Solving", "Decision Making"] as const;
const input: CoachingInput = {
  evaluation: { overallScore: 70, strengths: ["Explained the next step"], improvementAreas: ["Verify policy"], recommendedNextPractice: "Repeat verification practice" },
  capabilityScores: capabilities.map((capabilityName, index) => ({ capabilityName, score: 78 - index * 4, evidence: `${capabilityName} was observed in two learner responses.`, recommendation: `Practice ${capabilityName.toLowerCase()} with explicit evidence.` })),
  capabilityChanges: [{ capabilityName: "Communication", currentScore: 74, previousScore: 72, change: 2 }],
  learnerMessages: ["I would acknowledge the customer, verify identity, and explain the policy before changing the account."],
  knowledgeSections: [{ title: "Identity verification policy", summary: "Use two approved factors before account changes.", capabilities: ["Policy Compliance"] }],
  learningDrafts: [{ title: "Practice: Identity verification", capabilityMappings: ["Policy Compliance"] }],
  blueprint: { successDefinition: "Make safe, customer-first decisions", nonNegotiables: "Never skip verification" },
};

test("coaching output is concise, evidence-based, and actionable", () => {
  const result = buildDeterministicCoaching(input);
  assert.ok(result.strengths.length <= 3);
  assert.ok(result.improvementAreas.length <= 3);
  assert.equal(result.nextBestAction.capability, "Decision Making");
  assert.equal(result.strengths.length, 1);
  assert.match(result.strengths[0]!.evidence, /Communication was observed/u);
  assert.match(result.estimatedImprovement.disclaimer, /Estimate only/u);
  assert.match(result.improvementAreas[0]!.recommendation, /Better response example/u);
  assert.equal(result.generatedBy, "DETERMINISTIC");
});

test("coaching connects low capability evidence to organization knowledge", () => {
  const result = buildDeterministicCoaching({ ...input, capabilityScores: input.capabilityScores.map((score) => score.capabilityName === "Policy Compliance" ? { ...score, score: 35 } : score) });
  assert.equal(result.knowledgeGaps[0]?.sourceTitle, "Identity verification policy");
  assert.equal(result.nextBestAction.title, "Practice: Identity verification");
});

test("unavailable AI generation falls back deterministically", async () => {
  const result = await generateCoachingWithFallback(input, async () => { throw new Error("provider unavailable"); });
  assert.equal(result.generatedBy, "DETERMINISTIC");
  assert.ok(result.summary.length > 0);
});

test("coaching scope preserves tenant isolation", () => {
  assert.deepEqual(coachingScope("session-a", "org-a"), { sessionId: "session-a", organizationId: "org-a" });
});

test("coaching requires evaluation and uses one stable session identity", () => {
  assert.equal(coachingReadiness("IN_PROGRESS", false).ready, false);
  assert.equal(coachingReadiness("COMPLETED", false).reason, "Simulation evaluation is required before coaching");
  assert.equal(coachingReadiness("COMPLETED", true).ready, true);
  assert.deepEqual(coachingIdentity("session-a"), coachingIdentity("session-a"));
});

test("learners access only their coaching while authorized training roles may review", () => {
  assert.equal(canReadCoaching("Learner", "learner-a", "learner-a"), true);
  assert.equal(canReadCoaching("Learner", "learner-b", "learner-a"), false);
  assert.equal(canReadCoaching("Owner", "owner-a", "learner-a"), true);
  assert.equal(canReadCoaching("Manager", "manager-a", "learner-a"), false);
});
