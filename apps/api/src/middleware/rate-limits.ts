import { createHash } from "node:crypto";
import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

/**
 * Rate-limit key for authenticated traffic. Uses the JWT `sub` claim (the
 * Supabase user id) when a bearer token is present, so each user gets their
 * own bucket instead of everyone behind one proxy/NAT sharing a single one.
 * The token is not verified here: a forged token only buys a bucket for
 * requests that the auth middleware will reject anyway (no AI cost).
 */
export function userRateLimitKey(request: Request): string {
  const header = request.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token) {
    const payload = token.split(".")[1];
    if (payload) {
      try {
        const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: unknown };
        if (typeof claims.sub === "string" && claims.sub.length > 0 && claims.sub.length <= 128)
          return `user:${claims.sub}`;
      } catch {
        // fall through to token hash
      }
    }
    return `token:${createHash("sha256").update(token).digest("hex").slice(0, 32)}`;
  }
  return `ip:${ipKeyGenerator(request.ip ?? "unknown")}`;
}

export function createApiRateLimit(limitPerMinute: number) {
  return rateLimit({
    windowMs: 60_000,
    limit: limitPerMinute,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: userRateLimitKey,
  });
}

/** Tighter per-user budget for endpoints that call paid AI models (chat, voice, grading, coaching, generation). */
export function createAiRateLimit(limitPerMinute: number) {
  return rateLimit({
    windowMs: 60_000,
    limit: limitPerMinute,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: userRateLimitKey,
    skip: (request) => request.method !== "POST",
    message: { error: "Too many AI requests. Please wait a moment and try again.", code: "AI_RATE_LIMITED" },
  });
}
