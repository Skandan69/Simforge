export type SophiaAvatarState = "idle" | "listening" | "thinking" | "speaking" | "error";

export const SOPHIA_AVATAR_PRESENTATION: Record<SophiaAvatarState, { label: string; description: string }> = {
  idle: { label: "Sophia is ready", description: "Ready for your response" },
  listening: { label: "Sophia is listening", description: "Speak naturally and release when finished" },
  thinking: { label: "Sophia is thinking", description: "Considering your response" },
  speaking: { label: "Sophia is speaking", description: "Listen to the scenario response" },
  error: { label: "Sophia is available by text", description: "Voice or avatar presentation is temporarily unavailable" },
};

export function resolveSophiaAvatarState(input: { voiceState: string; sending: boolean; hasError: boolean }): SophiaAvatarState {
  if (input.hasError || input.voiceState === "Error") return "error";
  if (input.voiceState === "Listening") return "listening";
  if (input.sending || input.voiceState === "Thinking" || input.voiceState === "Uploading" || input.voiceState === "Transcribing") return "thinking";
  if (input.voiceState === "Speaking") return "speaking";
  return "idle";
}
