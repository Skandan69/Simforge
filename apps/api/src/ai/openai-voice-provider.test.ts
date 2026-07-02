import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { OpenAIVoiceProvider } from "./openai-voice-provider.js";

const requests: Array<{ url: string; authorization?: string; contentType?: string }> = [];
const server = createServer((request, response) => {
  requests.push({ url: request.url ?? "", authorization: request.headers.authorization, contentType: request.headers["content-type"] });
  request.resume();
  if (request.url === "/audio/transcriptions") {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ text: "I need help with this refund." }));
    return;
  }
  response.setHeader("Content-Type", "audio/mpeg");
  response.end(Buffer.from([1, 2, 3, 4]));
});
server.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

const provider = new OpenAIVoiceProvider({
  apiKey: "server-only-test-key",
  baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
  timeoutMs: 5_000,
  transcriptionModel: "transcribe-test",
  speechModel: "speech-test",
  voice: "alloy",
});

test("OpenAI-compatible voice provider transcribes audio server-side", async () => {
  assert.equal(await provider.transcribe({ audio: new Uint8Array([1, 2]), mimeType: "audio/webm", fileName: "recording.webm" }), "I need help with this refund.");
  assert.equal(requests[0]?.url, "/audio/transcriptions");
  assert.equal(requests[0]?.authorization, "Bearer server-only-test-key");
  assert.match(requests[0]?.contentType ?? "", /^multipart\/form-data/u);
});

test("OpenAI-compatible voice provider returns synthesized audio", async () => {
  const result = await provider.synthesize({ text: "I understand your concern." });
  assert.deepEqual([...result.audio], [1, 2, 3, 4]);
  assert.equal(result.contentType, "audio/mpeg");
  assert.equal(requests[1]?.url, "/audio/speech");
});
