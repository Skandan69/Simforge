import assert from "node:assert/strict";
import test from "node:test";
import { insufficientEvidenceAskResponse } from "./sophia-ask-response.js";

test("insufficient-evidence ASK responses hide low-confidence candidate sources", () => {
  const response = insufficientEvidenceAskResponse(
    { confidence: "LOW" },
    {
      requestTotalMs: 25,
      stages: [],
      retrieval: {
        totalMs: 20,
        dbRoundTrips: 2,
        externalCalls: 1,
        cacheHit: false,
        exactLookup: false,
        stages: [],
      },
      answerGeneration: { invoked: false, durationMs: 0 },
    },
  );

  assert.equal(response.insufficientEvidence, true);
  assert.deepEqual(response.sources, []);
  assert.equal(response.confidence, "LOW");
  assert.ok(response.debugTimings?.answerGeneration);
  assert.equal(response.debugTimings?.answerGeneration.invoked, false);
});
