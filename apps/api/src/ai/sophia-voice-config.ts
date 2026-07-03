export const DEFAULT_SOPHIA_TTS_VOICE = "coral";
export const DEFAULT_SOPHIA_TTS_INSTRUCTIONS = "Speak as a warm, confident female professional in her late twenties. Use clear international English, friendly energy, natural pauses, varied but calm intonation, and a measured conversational pace. Sound emotionally intelligent and fully in character, never robotic or theatrical.";

export function resolveSophiaVoiceConfig(input: {
  SOPHIA_TTS_VOICE?: string;
  OPENAI_TTS_VOICE?: string;
  OPENAI_SPEECH_VOICE?: string;
  SOPHIA_TTS_INSTRUCTIONS?: string;
}) {
  return {
    voice: input.SOPHIA_TTS_VOICE || input.OPENAI_TTS_VOICE || input.OPENAI_SPEECH_VOICE || DEFAULT_SOPHIA_TTS_VOICE,
    instructions: input.SOPHIA_TTS_INSTRUCTIONS || DEFAULT_SOPHIA_TTS_INSTRUCTIONS,
  };
}
