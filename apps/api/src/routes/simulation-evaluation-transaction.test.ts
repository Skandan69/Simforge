import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./simulation-sessions.ts", import.meta.url)), "utf8");
const start = source.indexOf('simulationSessionsRouter.post("/:id/evaluate"');
const route = source.slice(start);

test("evaluation provider and profile preparation run before the write transaction", () => {
  const providerCall = route.indexOf("generateSophiaEvaluation");
  const profileRead = route.indexOf("prisma.learnerCapabilityProfile.findUnique");
  const preparation = route.indexOf("prepareCapabilityProfileUpdate");
  const transaction = route.indexOf("prisma.$transaction");
  assert.ok(providerCall > -1 && providerCall < transaction);
  assert.ok(profileRead > providerCall && profileRead < transaction);
  assert.ok(preparation > profileRead && preparation < transaction);
});

test("evaluation transaction contains writes only and uses a secondary timeout safeguard", () => {
  const transaction = route.slice(route.indexOf("prisma.$transaction"));
  assert.doesNotMatch(transaction, /generateSophiaEvaluation|loadSophiaPromptContext/u);
  assert.match(transaction, /updateLearnerCapabilityProfile/u);
  assert.match(transaction, /timeout: 15_000/u);
});
