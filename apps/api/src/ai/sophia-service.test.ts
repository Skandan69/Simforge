import assert from "node:assert/strict";
import test from "node:test";
import type { AIProvider, SophiaEvaluationResult } from "./types.js";
import { generateSophiaEvaluation, generateSophiaReply, type SophiaAIEvent } from "./sophia-service.js";

const evaluation: SophiaEvaluationResult = { overallScore: 75, strengths: ["Clear response"], improvementAreas: ["Confirm policy"], evidence: [{ capability: "Communication", observation: "Explained the next step" }], recommendedNextPractice: "Practice verification", capabilityScores: ["Communication", "Product Knowledge", "Policy Compliance", "Empathy", "Problem Solving", "Decision Making"].map((capabilityName) => ({ capabilityName: capabilityName as SophiaEvaluationResult["capabilityScores"][number]["capabilityName"], score: 75, evidence: "Transcript evidence", recommendation: "Practice" })) };

test("mock provider supplies live Sophia conversation and evaluation results", async () => {
  const provider: AIProvider = { name: "mock", generateTrainerResponse: async () => "What would you verify next?", evaluateSimulation: async () => evaluation };
  const events: SophiaAIEvent[] = [];
  assert.equal(await generateSophiaReply({ provider, systemPrompt: "trainer", messages: [], fallback: () => "fallback", onEvent: (event) => events.push(event) }), "What would you verify next?");
  assert.equal((await generateSophiaEvaluation({ provider, systemPrompt: "trainer", transcript: [], fallback: () => ({ ...evaluation, overallScore: 40 }), onEvent: (event) => events.push(event) })).overallScore, 75);
  assert.deepEqual(events.map((event) => `${event.operation}:${event.status}`), ["conversation:called", "conversation:succeeded", "evaluation:called", "evaluation:succeeded"]);
});

test("provider failures use deterministic fallbacks without exposing request content", async () => {
  const provider: AIProvider = { name: "mock", generateTrainerResponse: async () => { throw new Error("sensitive prompt"); }, evaluateSimulation: async () => { throw new Error("sensitive transcript"); } };
  const failures: unknown[] = [];
  const events: SophiaAIEvent[] = [];
  assert.equal(await generateSophiaReply({ provider, systemPrompt: async () => "private", messages: [], fallback: () => "deterministic", onFailure: (error) => failures.push(error), onEvent: (event) => events.push(event) }), "deterministic");
  assert.equal((await generateSophiaEvaluation({ provider, systemPrompt: "private", transcript: [], fallback: () => ({ ...evaluation, overallScore: 41 }), onFailure: (error) => failures.push(error), onEvent: (event) => events.push(event) })).overallScore, 41);
  assert.equal(failures.length, 2);
  assert.equal(events.filter((event) => event.status === "failed" && event.reason === "provider_failure").length, 2);
  assert.equal(events.filter((event) => event.status === "fallback" && event.reason === "provider_failure").length, 2);
  assert.equal(JSON.stringify(events).includes("sensitive"), false);
});

test("missing credentials and timeouts activate fallback with safe reasons", async () => {
  const events: SophiaAIEvent[] = [];
  assert.equal(await generateSophiaReply({ provider: null, systemPrompt: "private", messages: [], fallback: () => "missing-key fallback", onEvent: (event) => events.push(event) }), "missing-key fallback");
  const timeout = new Error("request exceeded deadline");
  timeout.name = "AbortError";
  const provider: AIProvider = { name: "mock", generateTrainerResponse: async () => { throw timeout; }, evaluateSimulation: async () => evaluation };
  assert.equal(await generateSophiaReply({ provider, systemPrompt: "private", messages: [], fallback: () => "timeout fallback", onEvent: (event) => events.push(event) }), "timeout fallback");
  assert.equal(events.some((event) => event.status === "fallback" && event.reason === "credentials_missing"), true);
  assert.equal(events.some((event) => event.status === "fallback" && event.reason === "timeout"), true);
});
