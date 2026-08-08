import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./simulation-coaching.ts", import.meta.url)), "utf8");

test("coaching loads simulation sessions by id and organization scope", () => {
  assert.match(source, /prisma\.simulationSession\.findFirst\(\{\s*where: simulationSessionCoachingScope\(id, organizationId\)/u);
  assert.doesNotMatch(source, /prisma\.simulationSession\.findFirst\(\{\s*where: coachingScope\(id, organizationId\)/u);
});

test("coaching route still persists insights by stable session identity", () => {
  assert.match(source, /prisma\.simulationCoachingInsight\.findUnique\(\{\s*where: coachingIdentity\(session\.id\)/u);
  assert.match(source, /prisma\.simulationCoachingInsight\.upsert\(\{\s*where: coachingIdentity\(session\.id\)/u);
});
