import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";
import { userRateLimitKey } from "./rate-limits.js";

function fakeRequest(authorization?: string, ip = "203.0.113.9") {
  return { headers: authorization ? { authorization } : {}, ip } as unknown as Request;
}
function jwt(claims: object) {
  return `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.s`;
}

test("rate limit keys are per user when a bearer token is present", () => {
  assert.equal(userRateLimitKey(fakeRequest(`Bearer ${jwt({ sub: "user-a" })}`)), "user:user-a");
  assert.notEqual(userRateLimitKey(fakeRequest(`Bearer ${jwt({ sub: "user-a" })}`)), userRateLimitKey(fakeRequest(`Bearer ${jwt({ sub: "user-b" })}`)));
});

test("malformed tokens and anonymous requests still get a stable key", () => {
  assert.match(userRateLimitKey(fakeRequest("Bearer not-a-jwt")), /^token:[0-9a-f]{32}$/);
  assert.match(userRateLimitKey(fakeRequest()), /^ip:/);
});
