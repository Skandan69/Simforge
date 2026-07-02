import assert from "node:assert/strict";
import test from "node:test";
import type {
  CapabilityScoreResponse,
  SimulationMessageResponse,
} from "@simforge/shared";
import {
  conversationRoleLabel,
  sortCapabilityScores,
  visibleConversationMessages,
} from "./simulation-session.js";

test("conversation hides internal system messages and labels participants", () => {
  const messages = [
    {
      id: "1",
      sessionId: "session",
      role: "system",
      content: "Internal",
      createdAt: "2026-01-01",
    },
    {
      id: "2",
      sessionId: "session",
      role: "ai",
      content: "Welcome",
      createdAt: "2026-01-01",
    },
  ] satisfies SimulationMessageResponse[];
  assert.deepEqual(
    visibleConversationMessages(messages).map((message) => message.id),
    ["2"],
  );
  assert.equal(conversationRoleLabel("ai"), "Sophia");
  assert.equal(conversationRoleLabel("learner"), "You");
});

test("capability scores follow the product-defined report order", () => {
  const score = (
    capabilityName: CapabilityScoreResponse["capabilityName"],
  ): CapabilityScoreResponse => ({
    id: capabilityName,
    capabilityName,
    score: 70,
    evidence: "Evidence",
    recommendation: "Recommendation",
    createdAt: "2026-01-01",
  });
  const sorted = sortCapabilityScores([
    score("Decision Making"),
    score("Communication"),
    score("Empathy"),
  ]);
  assert.deepEqual(
    sorted.map((item) => item.capabilityName),
    ["Communication", "Empathy", "Decision Making"],
  );
});
