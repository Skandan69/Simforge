const audioExtensions: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/x-m4a": "m4a",
};

export const recordingTooShortMessage = "Recording was too short. Please hold the microphone and speak for at least 1–2 seconds.";
export const transcriptionFailureMessage = "The recording could not be transcribed. Please try again, speak clearly for at least 1–2 seconds, or continue in text mode.";

export class VoiceRecordingError extends Error {
  constructor(message: string, public code: "AUDIO_TOO_SHORT" | "UNSUPPORTED_AUDIO_TYPE") {
    super(message);
  }
}

export function normalizeAudioMimeType(value: string) {
  return value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

export function audioExtensionForMimeType(value: string) {
  return audioExtensions[normalizeAudioMimeType(value)];
}

export function validateVoiceRecording(input: { mimeType: string; byteSize: number; durationMs?: number; minimumBytes: number; minimumDurationMs: number }) {
  const mimeType = normalizeAudioMimeType(input.mimeType);
  const extension = audioExtensionForMimeType(mimeType);
  if (!extension) throw new VoiceRecordingError("This audio format is not supported. Please use WebM, MP4, MP3, or WAV, or continue in text mode.", "UNSUPPORTED_AUDIO_TYPE");
  if (input.byteSize < input.minimumBytes || (input.durationMs !== undefined && input.durationMs < input.minimumDurationMs)) {
    throw new VoiceRecordingError(recordingTooShortMessage, "AUDIO_TOO_SHORT");
  }
  return { mimeType, extension };
}
