import assert from "node:assert/strict";
import test from "node:test";
import { chunkText, estimateTokens } from "./chunker.js";

test("chunking creates ordered, bounded, overlapping knowledge chunks", () => {
  const input = Array.from({ length: 120 }, (_, index) => `Paragraph ${index} contains durable product knowledge.`).join("\n");
  const chunks = chunkText(input, { size: 500, overlap: 50 });
  assert.ok(chunks.length > 1);
  chunks.forEach((chunk, index) => { assert.equal(chunk.chunkNumber, index + 1); assert.equal(chunk.characterCount, chunk.text.length); assert.equal(chunk.estimatedTokens, estimateTokens(chunk.text)); assert.ok(chunk.text.length <= 500); });
});

test("chunking handles empty input and rejects unsafe configuration", () => {
  assert.deepEqual(chunkText("  \n "), []);
  assert.throws(() => chunkText("content", { size: 100, overlap: 100 }), /Invalid chunk configuration/);
});
