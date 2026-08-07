import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./ask-sophia-view.tsx", import.meta.url)), "utf8");

test("Ask Sophia view keeps the v1 UX grounded in answers and sources", () => {
  assert.match(source, /Ask Sophia/u);
  assert.match(source, /\/api\/sophia\/ask/u);
  assert.match(source, /Sources/u);
  assert.match(source, /insufficientEvidence/u);
  assert.match(source, /This is not a separate chatbot/u);
});
