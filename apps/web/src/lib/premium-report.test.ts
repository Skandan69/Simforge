import assert from "node:assert/strict";
import test from "node:test";
import type { SimulationSessionResponse } from "@simforge/shared";
import { buildPremiumReport, evidenceForCapability, qualitativePerformance } from "./premium-report.js";

const session: SimulationSessionResponse = {
  id: "session-1", organizationId: "org-1", simulationId: "simulation-1", learnerId: "learner-1", status: "COMPLETED", startedAt: "2026-01-01T10:00:00.000Z", completedAt: "2026-01-01T10:10:00.000Z", overallScore: 76, createdAt: "2026-01-01T10:00:00.000Z", updatedAt: "2026-01-01T10:10:00.000Z",
  simulation: { id: "simulation-1", title: "Duplicate billing", description: "Resolve a billing concern", scenarioSetup: "A customer reports two charges", estimatedMinutes: 10, status: "Active", persona: null },
  messages: [
    { id: "m1", sessionId: "session-1", role: "ai", content: "I was charged twice and I need this fixed.", createdAt: "2026-01-01T10:00:00.000Z" },
    { id: "m2", sessionId: "session-1", role: "learner", content: "I understand how frustrating that must be. Can I confirm the date of both charges?", createdAt: "2026-01-01T10:01:00.000Z" },
    { id: "m3", sessionId: "session-1", role: "learner", content: "Our refund policy requires verification before we review an exception.", createdAt: "2026-01-01T10:02:00.000Z" },
  ],
  evaluation: { id: "evaluation-1", overallScore: 76, strengths: ["Acknowledged the customer concern"], improvementAreas: ["Clarify the escalation path"], evidence: [{ capability: "Empathy", observation: "The learner acknowledged the customer's frustration." }], recommendedNextPractice: "Practice explaining escalation ownership.", createdAt: "2026-01-01T10:10:00.000Z" },
  capabilityScores: [
    { id: "c1", capabilityName: "Empathy", score: 84, evidence: "Acknowledged frustration", recommendation: "Keep the acknowledgement concise", createdAt: "2026-01-01T10:10:00.000Z" },
    { id: "c2", capabilityName: "Decision Making", score: 62, evidence: "Escalation ownership was unclear", recommendation: "State who owns the escalation", createdAt: "2026-01-01T10:10:00.000Z" },
  ],
};

test("premium report composes every evidence-backed section from existing session data", () => {
  const report = buildPremiumReport(session);
  assert.equal(report.overallRating, "Consistent");
  assert.match(report.executiveSummary.primaryStrength, /Empathy/u);
  assert.match(report.executiveSummary.priorityArea, /Decision Making/u);
  assert.ok(report.timeline.some((moment) => moment.title === "Empathy demonstrated"));
  assert.match(report.observations[0].evidence, /frustrating/u);
  assert.ok(report.strengths[0].evidence.length > 0);
  assert.ok(report.missedOpportunities[0].recommendation.length > 0);
  assert.equal(report.knowledgeUsage.state, "Observed");
  assert.match(report.recommendedNextSimulation.title, /Decision Making/u);
});

test("capability snapshot uses qualitative states rather than raw percentages", () => {
  const report = buildPremiumReport(session);
  assert.equal(report.capabilitySnapshot.length, 6);
  assert.equal(report.communicationSnapshot.length, 6);
  assert.ok(report.communicationSnapshot.every((item) => !item.state.includes("%")));
  assert.ok(report.capabilitySnapshot.every((item) => !item.state.includes("%")));
  assert.equal(qualitativePerformance(89), "Strong");
  assert.equal(qualitativePerformance(77), "Consistent");
  assert.equal(qualitativePerformance(65), "Developing");
  assert.equal(qualitativePerformance(40), "Needs attention");
});

test("conversation timeline highlights meaningful moments instead of replaying every message", () => {
  const report = buildPremiumReport(session);
  assert.ok(report.timeline.length <= 6);
  assert.ok(report.timeline.length < session.messages.length + 1);
  assert.ok(report.timeline.every((moment) => moment.evidence.length > 0));
});

test("generic reassurance is not reused for unrelated capability evidence", () => {
  const messages = [{ id: "reassurance", sessionId: "session-1", role: "learner" as const, content: "sure dont worry i am here to help you, i will definitely try and resolve this issue for you.", createdAt: "2026-01-01T10:03:00.000Z" }];
  assert.match(evidenceForCapability(messages, "Empathy"), /dont worry/u);
  assert.match(evidenceForCapability(messages, "Communication"), /here to help/u);
  assert.equal(evidenceForCapability(messages, "Product Knowledge"), "No strong evidence observed.");
  assert.equal(evidenceForCapability(messages, "Policy Compliance"), "No strong evidence observed.");
  assert.equal(evidenceForCapability(messages, "Decision Making"), "No strong evidence observed.");
});

test("knowledge usage stays not observed and missed opportunities include a better response", () => {
  const reassuranceOnly = { ...session, messages: session.messages.filter((message) => message.role !== "learner").concat({ id: "m4", sessionId: session.id, role: "learner", content: "I am here to help and will try to resolve this for you.", createdAt: "2026-01-01T10:04:00.000Z" }) };
  const report = buildPremiumReport(reassuranceOnly);
  assert.equal(report.knowledgeUsage.state, "Not observed yet");
  assert.equal(report.knowledgeUsage.evidence, "No strong evidence observed.");
  assert.ok(report.missedOpportunities.every((item) => item.betterResponse.length > 20));
});
