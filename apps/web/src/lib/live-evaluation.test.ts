import assert from "node:assert/strict";
import test from "node:test";
import {
  communicationQualityState,
  deriveCommunicationIndicators,
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

const communication = (messages: string[], signal: string) =>
  deriveCommunicationIndicators(messages).find((item) => item.signal === signal)!;

test("strong professional communication produces supportive strong signals", () => {
  const message = "I understand how frustrating this must be. Let me verify the duplicate charge dates and check what options are available.";
  const result = deriveCommunicationIndicators([message]);
  assert.ok(result.every((item) => item.state === "Strong"));
  assert.equal(indicator([message], "Empathy").state, "Observed");
  assert.equal(indicator([message], "Verification").state, "Observed");
  assert.equal(indicator([message], "Confidence").state, "Observed");
});

test("grammar and punctuation issues receive precise non-judgmental feedback", () => {
  assert.equal(communication(["You is charged twice"], "Grammar").state, "Needs attention");
  const punctuation = communication(["i will check this for you"], "Punctuation");
  assert.equal(punctuation.state, "Needs attention");
  assert.match(punctuation.helper, /capitalization/u);
  assert.equal(communication(["i will check this for you"], "Sentence Clarity").state, "Needs attention");
});

test("obvious spelling issues are detected without broad language correction", () => {
  const spelling = communication(["I will definately recieve the adress."], "Spelling");
  assert.equal(spelling.state, "Needs attention");
  assert.match(spelling.helper, /spelling/u);
});

test("unprofessional tone and weak word choice remain supportive", () => {
  const message = "thats none of my concern whatever";
  assert.equal(communication([message], "Professional Tone").state, "Needs attention");
  assert.equal(communication([message], "Word Choice").state, "Needs attention");
  assert.equal(indicator([message], "Empathy").state, "Needs attention");
});

test("vague or incomplete wording is marked for clarity development", () => {
  assert.equal(communication(["Handle it."], "Sentence Clarity").state, "Needs attention");
  assert.match(communication(["We can do something."], "Sentence Clarity").helper, /specifically/u);
});

test("communication signals accumulate qualitatively across learner turns", () => {
  const messages = [
    "I understand your concern.",
    "I will confirm the transaction details.",
    "The next step is a policy review.",
  ];
  assert.ok(deriveCommunicationIndicators(messages).every((item) => item.state === "Excellent"));
  assert.equal(communicationQualityState(2, 1), "Good");
  assert.equal(communicationQualityState(1, 1), "Developing");
});

test("communication intelligence remains neutral before learner evidence", () => {
  assert.ok(deriveCommunicationIndicators([]).every((item) => item.state === "Not observed yet"));
});
