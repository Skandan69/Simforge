import assert from "node:assert/strict";
import test from "node:test";
import { resolveSophiaAvatarState, SOPHIA_AVATAR_PRESENTATION } from "./sophia-avatar.js";

test("Sophia avatar follows runtime listening, thinking, speaking, idle, and error states", () => {
  assert.equal(resolveSophiaAvatarState({ voiceState: "Ready", sending: false, hasError: false }), "idle");
  assert.equal(resolveSophiaAvatarState({ voiceState: "Listening", sending: false, hasError: false }), "listening");
  assert.equal(resolveSophiaAvatarState({ voiceState: "Ready", sending: true, hasError: false }), "thinking");
  assert.equal(resolveSophiaAvatarState({ voiceState: "Speaking", sending: false, hasError: false }), "speaking");
  assert.equal(resolveSophiaAvatarState({ voiceState: "Ready", sending: false, hasError: true }), "error");
});

test("every avatar state exposes an accessible Sophia status label", () => {
  for (const state of ["idle", "listening", "thinking", "speaking", "error"] as const) {
    assert.match(SOPHIA_AVATAR_PRESENTATION[state].label, /^Sophia is/u);
  }
});
