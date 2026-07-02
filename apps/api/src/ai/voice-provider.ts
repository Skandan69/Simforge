import { getEnv } from "../config/env.js";
import { OpenAIVoiceProvider } from "./openai-voice-provider.js";
import type { VoiceProviders } from "./voice-types.js";

let providers: VoiceProviders | null | undefined;

export function getVoiceProviders(): VoiceProviders | null {
  if (providers !== undefined) return providers;
  const env = getEnv();
  if (env.AI_PROVIDER !== "openai" || !env.OPENAI_API_KEY) return providers = null;
  const provider = new OpenAIVoiceProvider({
    apiKey: env.OPENAI_API_KEY,
    baseUrl: env.OPENAI_BASE_URL,
    timeoutMs: env.VOICE_TIMEOUT_MS,
    transcriptionModel: env.OPENAI_TRANSCRIPTION_MODEL,
    speechModel: env.OPENAI_SPEECH_MODEL,
    voice: env.OPENAI_SPEECH_VOICE,
  });
  return providers = { speechToText: provider, textToSpeech: provider };
}
