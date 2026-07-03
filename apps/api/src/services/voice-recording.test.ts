import assert from "node:assert/strict";
import test from "node:test";
import { audioExtensionForMimeType, recordingTooShortMessage, transcriptionFailureMessage, validateVoiceRecording, VoiceRecordingError } from "./voice-recording.js";

test("browser audio MIME types map to OpenAI-supported file extensions", () => {
  assert.equal(audioExtensionForMimeType("audio/webm;codecs=opus"), "webm");
  assert.equal(audioExtensionForMimeType("audio/mp4"), "mp4");
  assert.equal(audioExtensionForMimeType("audio/mpeg"), "mp3");
  assert.equal(audioExtensionForMimeType("audio/wav"), "wav");
});

test("empty and short recordings are rejected before provider upload", () => {
  assert.throws(() => validateVoiceRecording({ mimeType: "audio/webm", byteSize: 0, durationMs: 0, minimumBytes: 1_000, minimumDurationMs: 1_000 }), (error: unknown) => error instanceof VoiceRecordingError && error.code === "AUDIO_TOO_SHORT" && error.message === recordingTooShortMessage);
});

test("unsupported recordings are rejected with a safe user-facing error", () => {
  assert.throws(() => validateVoiceRecording({ mimeType: "audio/ogg", byteSize: 4_000, durationMs: 2_000, minimumBytes: 1_000, minimumDurationMs: 1_000 }), (error: unknown) => error instanceof VoiceRecordingError && error.code === "UNSUPPORTED_AUDIO_TYPE" && !error.message.includes("audio content"));
  assert.match(transcriptionFailureMessage, /try again/u);
  assert.doesNotMatch(transcriptionFailureMessage, /provider|OpenAI|stack/iu);
});
