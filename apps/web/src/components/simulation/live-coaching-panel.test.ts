import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./live-coaching-panel.tsx", import.meta.url)), "utf8");

test("live coaching panel renders qualitative indicators and authoritative-report guidance", () => {
  assert.match(source, /Live Coaching/u);
  assert.match(source, /Behavioral Intelligence/u);
  assert.match(source, /Communication Intelligence/u);
  assert.match(source, /behavioralIndicators\.map/u);
  assert.match(source, /communicationIndicators\.map/u);
  assert.match(source, /indicator\.state/u);
  assert.match(source, /final evaluation remains authoritative/u);
  assert.doesNotMatch(source, /%|percentage|score:/iu);
});

test("live coaching panel provides an accessible region", () => {
  assert.match(source, /aria-label="Live coaching indicators"/u);
});

test("communication feedback can be hidden without hiding behavioral intelligence", () => {
  assert.match(source, /aria-pressed=\{showCommunication\}/u);
  assert.match(source, /showCommunication \? \(/u);
  assert.match(source, /Behavioral Intelligence/u);
  assert.match(source, /Behavioral coaching remains active/u);
});
