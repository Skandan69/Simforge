import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SOPHIA_TTS_VOICE, resolveSophiaVoiceConfig } from "./sophia-voice-config.js";

test("Sophia defaults to the central enterprise-friendly voice", () => {
  const config = resolveSophiaVoiceConfig({});
  assert.equal(config.voice, DEFAULT_SOPHIA_TTS_VOICE);
  assert.match(config.instructions, /warm, professional, clear feminine voice/u);
});

test("Sophia voice supports env override precedence without code changes", () => {
  assert.equal(resolveSophiaVoiceConfig({ OPENAI_TTS_VOICE: "nova" }).voice, "nova");
  assert.equal(resolveSophiaVoiceConfig({ SOPHIA_TTS_VOICE: "shimmer", OPENAI_TTS_VOICE: "nova" }).voice, "shimmer");
  assert.equal(resolveSophiaVoiceConfig({ OPENAI_SPEECH_VOICE: "alloy" }).voice, "alloy");
});
