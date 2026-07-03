import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "../generated/prisma/client.js";
import { calculateCapabilityUpdate, capabilityConfidence, capabilityProfileScope, capabilityTrend, prepareCapabilityProfileUpdate, sessionHistoryScope, updateLearnerCapabilityProfile } from "./capability-profile.js";

test("first capability assessment creates a baseline without artificial change", () => {
  assert.deepEqual(calculateCapabilityUpdate(null, 0, 72), { currentScore: 72, previousScore: null, change: 0, assessmentCount: 1 });
});

test("repeated assessments update the rolling profile and preserve previous score", () => {
  assert.deepEqual(calculateCapabilityUpdate(72, 1, 82), { currentScore: 77, previousScore: 72, change: 5, assessmentCount: 2 });
  assert.deepEqual(calculateCapabilityUpdate(77, 2, 71), { currentScore: 75, previousScore: 77, change: -2, assessmentCount: 3 });
});

test("profile trend and confidence explain the available evidence", () => {
  assert.equal(capabilityTrend(null, 70), "NEW");
  assert.equal(capabilityTrend(70, 72), "IMPROVING");
  assert.equal(capabilityTrend(72, 71.5), "STABLE");
  assert.equal(capabilityTrend(72, 69), "DECLINING");
  assert.equal(capabilityConfidence(1), "LOW");
  assert.equal(capabilityConfidence(3), "MEDIUM");
  assert.equal(capabilityConfidence(6), "HIGH");
});

test("profile and history scopes preserve tenant and session isolation", () => {
  assert.deepEqual(capabilityProfileScope("org-a", "learner-a"), { organizationId_learnerId: { organizationId: "org-a", learnerId: "learner-a" } });
  assert.deepEqual(sessionHistoryScope("session-a"), { sessionId: "session-a" });
});

test("re-evaluating one session does not duplicate history or profile counts", async () => {
  const history: Array<{ sessionId: string; capabilityName: string }> = [];
  const capabilities: Array<{ capabilityName: string; currentScore: number; assessmentCount: number }> = [];
  const profile = { id: "profile-a", organizationId: "org-a", learnerId: "learner-a", overallScore: 0, simulationCount: 0, capabilities };
  const transaction = {
    capabilityAssessmentHistory: {
      findFirst: async ({ where }: { where: { sessionId: string } }) => history.find((item) => item.sessionId === where.sessionId) ? { id: "history" } : null,
      createMany: async ({ data }: { data: Array<{ sessionId: string; capabilityName: string }> }) => { history.push(...data); return { count: data.length }; },
    },
    learnerCapabilityProfile: {
      upsert: async () => profile,
      update: async ({ data }: { data: { overallScore: number; simulationCount: number } }) => { Object.assign(profile, data); return profile; },
    },
    learnerCapability: {
      upsert: async ({ create, update }: { create: { capabilityName: string; currentScore: number; assessmentCount: number }; update: { currentScore: number; assessmentCount: number } }) => {
        const existing = capabilities.find((item) => item.capabilityName === create.capabilityName);
        if (existing) Object.assign(existing, update); else capabilities.push({ capabilityName: create.capabilityName, currentScore: create.currentScore, assessmentCount: create.assessmentCount });
      },
    },
  } as unknown as Prisma.TransactionClient;
  const input = { organizationId: "org-a", learnerId: "learner-a", sessionId: "session-a", assessedAt: new Date(), scores: [{ capabilityName: "Communication" as const, score: 70 }, { capabilityName: "Empathy" as const, score: 80 }] };
  const prepared = prepareCapabilityProfileUpdate(profile, false, input.scores);

  assert.equal(await updateLearnerCapabilityProfile(transaction, input, prepared), true);
  assert.equal(history.length, 2);
  assert.equal(profile.simulationCount, 1);
  assert.equal(await updateLearnerCapabilityProfile(transaction, input, prepared), false);
  assert.equal(history.length, 2);
  assert.equal(profile.simulationCount, 1);
});

test("capability calculations are prepared before persistence and retain fallback scores", () => {
  const prepared = prepareCapabilityProfileUpdate(null, false, [
    { capabilityName: "Communication", score: 54 },
    { capabilityName: "Policy Compliance", score: 49 },
  ]);
  assert.equal(prepared.profileId, null);
  assert.equal(prepared.simulationCount, 1);
  assert.equal(prepared.overallScore, 51.5);
  assert.deepEqual(prepared.updates.map((item) => item.currentScore), [54, 49]);
});
