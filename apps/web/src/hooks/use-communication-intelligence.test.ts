import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./use-communication-intelligence.ts", import.meta.url)), "utf8");

test("communication preference defaults on and persists a user override locally", () => {
  assert.match(source, /useSyncExternalStore/u);
  assert.match(source, /localStorage\.getItem/u);
  assert.match(source, /localStorage\.setItem/u);
  assert.match(source, /!== "false"/u);
  assert.match(source, /getServerSnapshot = \(\) => true/u);
});
