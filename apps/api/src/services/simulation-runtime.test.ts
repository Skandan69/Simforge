import assert from "node:assert/strict";
import test from "node:test";
import { WORKFORCE_CAPABILITIES } from "@simforge/shared";
import {
  buildDeterministicEvaluation,
  canEvaluateSession,
  canReadSession,
  canStartSimulation,
  createPlaceholderAiResponse,
  createPlaceholderOpeningMessage,
  sessionScope,
} from "./simulation-runtime.js";

test("session scopes always include the organization boundary", () => {
  assert.deepEqual(sessionScope("session-1", "organization-1"), {
    id: "session-1",
    organizationId: "organization-1",
  });
});

test("learners can read only their sessions while management can read organization sessions", () => {
  assert.equal(canReadSession("Learner", "learner-1", "learner-1"), true);
  assert.equal(canReadSession("Learner", "learner-2", "learner-1"), false);
  assert.equal(canReadSession("Manager", "manager-1", "learner-1"), true);
});

test("evaluation is limited to the learner owner or simulation editors", () => {
  assert.equal(canEvaluateSession("Learner", "learner-1", "learner-1"), true);
  assert.equal(canEvaluateSession("Manager", "manager-1", "learner-1"), false);
  assert.equal(canEvaluateSession("Trainer", "trainer-1", "learner-1"), true);
});

test("active simulations are runnable while draft runs are limited to demo roles", () => {
  assert.equal(canStartSimulation("Learner", "Active"), true);
  assert.equal(canStartSimulation("Manager", "Active"), true);
  assert.equal(canStartSimulation("Owner", "Draft"), true);
  assert.equal(canStartSimulation("Admin", "Draft"), true);
  assert.equal(canStartSimulation("Trainer", "Draft"), true);
  assert.equal(canStartSimulation("Learner", "Draft"), false);
  assert.equal(canStartSimulation("Owner", "Archived"), false);
});

test("deterministic evaluation produces all v1 capabilities and bounded scores", () => {
  const result = buildDeterministicEvaluation([
    "I would verify the account and acknowledge the concern before explaining the policy.",
  ]);
  assert.deepEqual(
    result.capabilityScores.map((item) => item.capabilityName),
    [...WORKFORCE_CAPABILITIES],
  );
  assert.ok(result.overallScore >= 0 && result.overallScore <= 100);
  assert.ok(
    result.capabilityScores.every(
      (item) => item.score >= 0 && item.score <= 100,
    ),
  );
});

test("placeholder response is deterministic and scenario-specific", () => {
  assert.match(
    createPlaceholderAiResponse("Billing escalation"),
    /Billing escalation/,
  );
  assert.match(
    createPlaceholderOpeningMessage("Billing escalation"),
    /Billing escalation/,
  );
  assert.match(
    createPlaceholderOpeningMessage("Billing escalation", "frustrated customer"),
    /frustrated customer/,
  );
});
