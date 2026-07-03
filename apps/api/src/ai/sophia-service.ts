import type { AIConversationMessage, AIProvider, SophiaEvaluationResult } from "./types.js";
import { roleIntegrityRecovery, validatePersonaResponse } from "./role-integrity.js";

export type SophiaAIEvent = {
  status: "called" | "succeeded" | "failed" | "fallback";
  provider: string;
  operation: "conversation" | "evaluation";
  reason?: "credentials_missing" | "provider_failure" | "timeout";
  errorType?: string;
};

function logEvent(event: SophiaAIEvent) {
  const message = event.status === "fallback"
    ? "Sophia deterministic fallback activated"
    : `Sophia AI provider ${event.status}`;
  const details = { provider: event.provider, operation: event.operation, reason: event.reason, errorType: event.errorType };
  if (event.status === "failed") console.error(message, details);
  else if (event.status === "fallback") console.warn(message, details);
  else console.info(message, details);
}

function failureReason(error: unknown): "provider_failure" | "timeout" {
  return error instanceof Error && error.name === "AbortError" ? "timeout" : "provider_failure";
}

type PromptInput = string | (() => Promise<string>);
const resolvePrompt = (prompt: PromptInput) => typeof prompt === "string" ? Promise.resolve(prompt) : prompt();

export async function generateSophiaReply(input: { provider: AIProvider | null; systemPrompt: PromptInput; messages: AIConversationMessage[]; fallback: () => string; personaRole?: string | null; onFailure?: (error: unknown) => void; onEvent?: (event: SophiaAIEvent) => void }) {
  const emit = input.onEvent ?? logEvent;
  if (!input.provider) {
    emit({ status: "fallback", provider: "none", operation: "conversation", reason: "credentials_missing" });
    return input.fallback();
  }
  try {
    const systemPrompt = await resolvePrompt(input.systemPrompt);
    emit({ status: "called", provider: input.provider.name, operation: "conversation" });
    const response = await input.provider.generateTrainerResponse({ systemPrompt, messages: input.messages });
    const integrity = validatePersonaResponse(response, input.personaRole);
    if (!integrity.valid) {
      console.warn("Sophia role integrity guard activated", {
        provider: input.provider.name,
        roleType: integrity.roleType,
        violations: integrity.violations,
      });
      emit({ status: "succeeded", provider: input.provider.name, operation: "conversation" });
      return roleIntegrityRecovery(input.personaRole);
    }
    emit({ status: "succeeded", provider: input.provider.name, operation: "conversation" });
    return response;
  } catch (error) {
    const reason = failureReason(error);
    emit({ status: "failed", provider: input.provider.name, operation: "conversation", reason, errorType: error instanceof Error ? error.name : "UnknownError" });
    input.onFailure?.(error);
    emit({ status: "fallback", provider: input.provider.name, operation: "conversation", reason });
    return input.fallback();
  }
}

export async function generateSophiaEvaluation(input: { provider: AIProvider | null; systemPrompt: PromptInput; transcript: AIConversationMessage[]; fallback: () => SophiaEvaluationResult; onFailure?: (error: unknown) => void; onEvent?: (event: SophiaAIEvent) => void }) {
  const emit = input.onEvent ?? logEvent;
  if (!input.provider) {
    emit({ status: "fallback", provider: "none", operation: "evaluation", reason: "credentials_missing" });
    return input.fallback();
  }
  try {
    const systemPrompt = await resolvePrompt(input.systemPrompt);
    emit({ status: "called", provider: input.provider.name, operation: "evaluation" });
    const response = await input.provider.evaluateSimulation({ systemPrompt, transcript: input.transcript });
    emit({ status: "succeeded", provider: input.provider.name, operation: "evaluation" });
    return response;
  } catch (error) {
    const reason = failureReason(error);
    emit({ status: "failed", provider: input.provider.name, operation: "evaluation", reason, errorType: error instanceof Error ? error.name : "UnknownError" });
    input.onFailure?.(error);
    emit({ status: "fallback", provider: input.provider.name, operation: "evaluation", reason });
    return input.fallback();
  }
}
