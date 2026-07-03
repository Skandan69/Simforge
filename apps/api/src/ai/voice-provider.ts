import { getEnv } from "../config/env.js";
import { OpenAIVoiceProvider } from "./openai-voice-provider.js";
import type { VoiceProviders } from "./voice-types.js";
import { resolveSophiaVoiceConfig } from "./sophia-voice-config.js";

let providers: VoiceProviders | null | undefined;

export function getVoiceProviders(): VoiceProviders | null {
  if (providers !== undefined) return providers;
  const env = getEnv();
  if (env.AI_PROVIDER !== "openai" || !env.OPENAI_API_KEY) return providers = null;
  const sophiaVoice = resolveSophiaVoiceConfig(env);
  const provider = new OpenAIVoiceProvider({
    apiKey: env.OPENAI_API_KEY,
    baseUrl: env.OPENAI_BASE_URL,
    timeoutMs: env.VOICE_TIMEOUT_MS,
    transcriptionModel: env.OPENAI_TRANSCRIPTION_MODEL,
    speechModel: env.OPENAI_SPEECH_MODEL,
    voice: sophiaVoice.voice,
    speechInstructions: sophiaVoice.instructions,
  });
  return providers = { speechToText: provider, textToSpeech: provider };
}

export function getVoiceProviderStatus() {
  const env = getEnv();
  const configured = env.AI_PROVIDER === "openai" && Boolean(env.OPENAI_API_KEY);
  return {
    sttConfigured: configured,
    ttsConfigured: configured,
    ttsVoice: resolveSophiaVoiceConfig(env).voice,
  };
}
