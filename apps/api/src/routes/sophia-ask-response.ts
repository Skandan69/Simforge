import type { AskSophiaResponse } from "@simforge/shared";
import type { KnowledgeRetrievalResult } from "../knowledge-retrieval/service.js";

export function insufficientEvidenceAskResponse(
  retrieval: Pick<KnowledgeRetrievalResult, "confidence">,
  debugTimings?: AskSophiaResponse["debugTimings"],
): AskSophiaResponse {
  return {
    mode: "ASK",
    answer:
      "I couldn't find sufficient information in your organization's knowledge to answer that confidently.",
    sources: [],
    insufficientEvidence: true,
    confidence: retrieval.confidence,
    debugTimings,
  };
}
