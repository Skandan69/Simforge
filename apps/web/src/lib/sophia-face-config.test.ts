import assert from "node:assert/strict";
import test from "node:test";
import { projectSophiaMouthToStage, SOPHIA_FACE_CONFIG } from "./sophia-face-config.js";

test("Sophia mouth anchor follows object-cover geometry on a wide desktop stage", () => {
  const mouth = projectSophiaMouthToStage({ width: 832, height: 420 });
  assert.equal(mouth.centerX, 416);
  assert.ok(mouth.centerY > 340 && mouth.centerY < 350);
  assert.ok(mouth.centerY / 420 > 0.8);
});

test("Sophia mouth anchor remains portrait-relative on smaller stages", () => {
  const mouth = projectSophiaMouthToStage({ width: 600, height: 400 });
  assert.equal(mouth.centerX, 300);
  assert.ok(mouth.centerY > 245 && mouth.centerY < 250);
  assert.ok(mouth.width > mouth.height);
  assert.equal(SOPHIA_FACE_CONFIG.transformOrigin, "center center");
  assert.equal(SOPHIA_FACE_CONFIG.objectPosition, "center top");
});
