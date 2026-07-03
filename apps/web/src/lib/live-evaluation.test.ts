import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveLiveCoachingIndicators,
  LIVE_COACHING_CAPABILITIES,
  liveCoachingState,
} from "./live-evaluation.js";

const indicator = (messages: string[], capability: string) =>
  deriveLiveCoachingIndicators(messages).find((item) => item.capability === capability)!;

test("neutral indicators contain all capabilities without numeric learner scores", () => {
  const result = deriveLiveCoachingIndicators([]);
  assert.deepEqual(result.map((item) => item.capability), LIVE_COACHING_CAPABILITIES);
  assert.ok(result.every((item) => item.state === "Not observed yet"));
});

test("detects empathy evidence and dismissive empathy risk", () => {
  assert.equal(indicator(["I understand how frustrating that must be."], "Empathy").state, "Observed");
  const risk = indicator(["That's not my concern. Calm down."], "Empathy");
  assert.equal(risk.state, "Needs attention");
  assert.match(risk.helper, /dismiss/u);
});

test("detects active listening evidence and listening risk", () => {
  assert.equal(indicator(["If I understand correctly, you saw two charges. Is that correct?"], "Active Listening").state, "Observed");
  assert.equal(indicator(["That is not relevant. Let's move on."], "Active Listening").state, "Needs attention");
});

test("detects verification evidence and skipped verification risk", () => {
  assert.equal(indicator(["Can I confirm the date of both charges?"], "Verification").state, "Observed");
  assert.equal(indicator(["There is no need for verification."], "Verification").state, "Needs attention");
});

test("detects knowledge usage and policy compliance evidence", () => {
  const messages = ["Our refund policy requires identity verification before we can review an exception."];
  assert.equal(indicator(messages, "Knowledge Usage").state, "Observed");
  assert.equal(indicator(messages, "Policy Compliance").state, "Observed");
});

test("detects policy compliance risk", () => {
  assert.equal(indicator(["We can ignore the policy and process the refund anyway."], "Policy Compliance").state, "Needs attention");
});

test("maps accumulated evidence to qualitative states", () => {
  assert.equal(liveCoachingState(0, 0), "Not observed yet");
  assert.equal(liveCoachingState(1, 0), "Observed");
  assert.equal(liveCoachingState(2, 0), "Improving");
  assert.equal(liveCoachingState(3, 0), "Consistent");
  assert.equal(liveCoachingState(4, 0), "Strong");
  assert.equal(liveCoachingState(1, 1), "Developing");
  assert.equal(liveCoachingState(0, 1), "Needs attention");
});
