import type { AIConversationMessage, AIProvider, SophiaEvaluationResult } from "./types.js";

function logFailure(provider: AIProvider, operation: string, error: unknown) {
  console.error("Sophia AI provider failure", { provider: provider.name, operation, errorType: error instanceof Error ? error.name : "UnknownError" });
}

type PromptInput = string | (() => Promise<string>);
const resolvePrompt = (prompt: PromptInput) => typeof prompt === "string" ? Promise.resolve(prompt) : prompt();

export async function generateSophiaReply(input: { provider: AIProvider | null; systemPrompt: PromptInput; messages: AIConversationMessage[]; fallback: () => string; onFailure?: (error: unknown) => void }) {
  if (!input.provider) return input.fallback();
  try { return await input.provider.generateTrainerResponse({ systemPrompt: await resolvePrompt(input.systemPrompt), messages: input.messages }); }
  catch (error) { (input.onFailure ?? ((caught) => logFailure(input.provider!, "conversation", caught)))(error); return input.fallback(); }
}

export async function generateSophiaEvaluation(input: { provider: AIProvider | null; systemPrompt: PromptInput; transcript: AIConversationMessage[]; fallback: () => SophiaEvaluationResult; onFailure?: (error: unknown) => void }) {
  if (!input.provider) return input.fallback();
  try { return await input.provider.evaluateSimulation({ systemPrompt: await resolvePrompt(input.systemPrompt), transcript: input.transcript }); }
  catch (error) { (input.onFailure ?? ((caught) => logFailure(input.provider!, "evaluation", caught)))(error); return input.fallback(); }
}
