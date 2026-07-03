import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const builder = readFileSync(fileURLToPath(new URL("./simulation-builder.tsx", import.meta.url)), "utf8");
const library = readFileSync(fileURLToPath(new URL("./persona-library.tsx", import.meta.url)), "utf8");

test("simulation builder loads, installs, and selects persona templates", () => {
  assert.match(builder, /\/api\/simulation-personas\/templates/u);
  assert.match(builder, /selectPersonaTemplate/u);
  assert.match(builder, /patch\("personaId", installed\.id\)/u);
  assert.match(builder, /communication style/u);
  assert.match(builder, /challenge/u);
  assert.match(builder, /industry/u);
});

test("persona library presents enterprise templates without replacing workspace personas", () => {
  assert.match(library, /Enterprise starter library/u);
  assert.match(library, /Workspace personas/u);
  assert.match(library, /template\.description/u);
  assert.match(library, /template\.challengeLevel/u);
  assert.match(library, /template\.industry/u);
  assert.match(library, /Add to workspace/u);
});
