export const DEFAULT_SOPHIA_TTS_VOICE = "coral";
export const DEFAULT_SOPHIA_TTS_INSTRUCTIONS = "Speak with a warm, professional, clear feminine voice suitable for an enterprise simulation. Sound natural and fully in character.";

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
