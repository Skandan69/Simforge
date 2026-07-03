import assert from "node:assert/strict";
import test from "node:test";
import { nextBlinkDelay } from "./use-sophia-presence.js";

test("natural blink intervals vary within a calm bounded range", () => {
  assert.equal(nextBlinkDelay(() => 0), 2_800);
  assert.equal(nextBlinkDelay(() => 1), 6_600);
  assert.notEqual(nextBlinkDelay(() => 0.25), nextBlinkDelay(() => 0.75));
});
