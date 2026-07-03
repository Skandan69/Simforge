import assert from "node:assert/strict";
import test from "node:test";
import { amplitudeToMouthOpen } from "./sophia-lip-sync.js";

test("lip sync maps silence to a closed mouth", () => {
  assert.equal(amplitudeToMouthOpen(new Uint8Array(32).fill(128)), 0);
});

test("lip sync maps stronger audio amplitude to greater mouth openness with smoothing", () => {
  const quiet = amplitudeToMouthOpen(new Uint8Array([126, 130, 127, 129]));
  const speech = amplitudeToMouthOpen(new Uint8Array([80, 176, 92, 164]), quiet);
  assert.ok(speech > quiet);
  assert.ok(speech <= 1);
});
