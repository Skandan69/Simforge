import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, test } from "node:test";
import {
  ACTIVE_RETRIEVAL_EMBEDDING_DIMENSIONS,
  EmbeddingConfigurationError,
  OpenAIEmbeddingProvider,
  assertActiveEmbeddingDimensions,
} from "./embedding-provider.js";

test("active retrieval embedding dimension accepts the migration index dimension", () => {
  assert.doesNotThrow(() => assertActiveEmbeddingDimensions(ACTIVE_RETRIEVAL_EMBEDDING_DIMENSIONS));
});

test("active retrieval embedding dimension rejects mismatched configured dimensions", () => {
  assert.throws(() => assertActiveEmbeddingDimensions(3_072), EmbeddingConfigurationError);
});

const server = createServer((request, response) => {
  request.resume();
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }] }));
});
server.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

test("OpenAI-compatible embedding provider rejects malformed embedding lengths before vector writes", async () => {
  const provider = new OpenAIEmbeddingProvider({
    apiKey: "server-only-test-key",
    baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    dimensions: ACTIVE_RETRIEVAL_EMBEDDING_DIMENSIONS,
    model: "text-embedding-3-small",
    timeoutMs: 5_000,
  });

  await assert.rejects(
    provider.embed(["refund policy"]),
    /invalid embedding shape/u,
  );
});
