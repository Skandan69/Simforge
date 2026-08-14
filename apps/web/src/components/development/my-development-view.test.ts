import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./my-development-view.tsx", import.meta.url)), "utf8");

test("My Development renders assigned paths and starts steps through the API", () => {
  assert.match(source, /\/api\/my-development/u);
  assert.match(source, /\/steps\/\$\{step\.step\.id\}\/start/u);
  assert.match(source, /Development path/u);
});

test("My Development preserves sequential locks and failed assessment messaging", () => {
  assert.match(source, /Locked/u);
  assert.match(source, /Needs reassessment/u);
  assert.match(source, /progress\.percentComplete/u);
});

test("My Development links to existing runtime and report destinations", () => {
  assert.match(source, /actionHref/u);
  assert.doesNotMatch(source, /simulationSession\.create/u);
});
