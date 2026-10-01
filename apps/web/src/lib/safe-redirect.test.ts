import assert from "node:assert/strict";
import test from "node:test";
import { safeNextPath } from "./safe-redirect";

test("keeps same-origin paths", () => {
  assert.equal(safeNextPath("/my-practice?tab=1"), "/my-practice?tab=1");
  assert.equal(safeNextPath("/reset-password"), "/reset-password");
});

test("blocks off-site redirects", () => {
  for (const value of ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "evil.com", "/\tevil", "", null, undefined])
    assert.equal(safeNextPath(value as string), "/dashboard");
});
