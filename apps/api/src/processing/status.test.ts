import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionProcessingStatus, isTerminalProcessingStatus } from "./status.js";

test("processing lifecycle permits queue, execution, completion, retry, and cancellation", () => {
  assert.equal(canTransitionProcessingStatus("Uploaded", "Queued"), true);
  assert.equal(canTransitionProcessingStatus("Queued", "Processing"), true);
  assert.equal(canTransitionProcessingStatus("Processing", "Completed"), true);
  assert.equal(canTransitionProcessingStatus("Failed", "Queued"), true);
  assert.equal(canTransitionProcessingStatus("Processing", "Uploaded"), false);
  assert.equal(isTerminalProcessingStatus("Completed"), true);
  assert.equal(isTerminalProcessingStatus("Processing"), false);
});
