import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./live-coaching-panel.tsx", import.meta.url)), "utf8");

test("live coaching panel renders qualitative indicators and authoritative-report guidance", () => {
  assert.match(source, /Live Coaching/u);
  assert.match(source, /indicators\.map/u);
  assert.match(source, /indicator\.state/u);
  assert.match(source, /final evaluation remains authoritative/u);
  assert.doesNotMatch(source, /%|percentage|score:/iu);
});

test("live coaching panel provides an accessible region", () => {
  assert.match(source, /aria-label="Live coaching indicators"/u);
});
