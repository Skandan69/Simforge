import { getEnv } from "../config/env.js";
import { OpenAIProvider } from "./openai-provider.js";
import type { AIProvider } from "./types.js";

let provider: AIProvider | null | undefined;

export function getAIProvider(): AIProvider | null {
  if (provider !== undefined) return provider;
  const env = getEnv();
  if (env.AI_PROVIDER !== "openai" || !env.OPENAI_API_KEY) return provider = null;
  return provider = new OpenAIProvider({ apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL, baseUrl: env.OPENAI_BASE_URL, timeoutMs: env.AI_TIMEOUT_MS, maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS });
}
