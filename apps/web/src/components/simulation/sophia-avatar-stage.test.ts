import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SophiaAvatarFallback, SophiaAvatarStage } from "./sophia-avatar-stage.js";

test("Sophia avatar stage renders the local asset and accessible runtime status", () => {
  const controls = createElement("button", { "aria-label": "Mute Sophia" }, "Mute");
  const markup = renderToStaticMarkup(createElement(SophiaAvatarStage, { state: "speaking", controls, mouthOpen: 0.7 }));
  assert.match(markup, /sophia-avatar-v1\.png/u);
  assert.match(markup, /Sophia is speaking/u);
  assert.match(markup, /aria-live="polite"/u);
  assert.match(markup, /aria-label="Mute Sophia"/u);
  assert.match(markup, /Sophia, professional AI simulation trainer/u);
});

test("Sophia avatar fallback preserves a usable non-avatar identity", () => {
  const markup = renderToStaticMarkup(createElement(SophiaAvatarFallback));
  assert.match(markup, /Sophia, AI simulation trainer/u);
  assert.match(markup, /AI simulation trainer/u);
});
