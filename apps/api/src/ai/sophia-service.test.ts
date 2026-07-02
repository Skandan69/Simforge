import assert from "node:assert/strict";
import test from "node:test";
import type { AIProvider, SophiaEvaluationResult } from "./types.js";
import { generateSophiaEvaluation, generateSophiaReply } from "./sophia-service.js";

const evaluation: SophiaEvaluationResult = { overallScore: 75, strengths: ["Clear response"], improvementAreas: ["Confirm policy"], evidence: [{ capability: "Communication", observation: "Explained the next step" }], recommendedNextPractice: "Practice verification", capabilityScores: ["Communication", "Product Knowledge", "Policy Compliance", "Empathy", "Problem Solving", "Decision Making"].map((capabilityName) => ({ capabilityName: capabilityName as SophiaEvaluationResult["capabilityScores"][number]["capabilityName"], score: 75, evidence: "Transcript evidence", recommendation: "Practice" })) };

test("mock provider supplies live Sophia conversation and evaluation results", async () => {
  const provider: AIProvider = { name: "mock", generateTrainerResponse: async () => "What would you verify next?", evaluateSimulation: async () => evaluation };
  assert.equal(await generateSophiaReply({ provider, systemPrompt: "trainer", messages: [], fallback: () => "fallback" }), "What would you verify next?");
  assert.equal((await generateSophiaEvaluation({ provider, systemPrompt: "trainer", transcript: [], fallback: () => ({ ...evaluation, overallScore: 40 }) })).overallScore, 75);
});

test("provider failures use deterministic fallbacks without exposing request content", async () => {
  const provider: AIProvider = { name: "mock", generateTrainerResponse: async () => { throw new Error("sensitive prompt"); }, evaluateSimulation: async () => { throw new Error("sensitive transcript"); } };
  const failures: unknown[] = [];
  assert.equal(await generateSophiaReply({ provider, systemPrompt: async () => "private", messages: [], fallback: () => "deterministic", onFailure: (error) => failures.push(error) }), "deterministic");
  assert.equal((await generateSophiaEvaluation({ provider, systemPrompt: "private", transcript: [], fallback: () => ({ ...evaluation, overallScore: 41 }), onFailure: (error) => failures.push(error) })).overallScore, 41);
  assert.equal(failures.length, 2);
});
