const FALLBACK = "/dashboard";

/**
 * Returns a same-origin relative path, or the fallback.
 * Blocks protocol-relative ("//evil.com"), backslash ("/\evil.com"),
 * absolute and scheme URLs that would redirect users off-site.
 */
export function safeNextPath(next: string | null | undefined, fallback = FALLBACK): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  // Browsers treat control characters and backslashes leniently; reject them outright.
  if (/[\u0000-\u001f\\]/.test(next)) return fallback;
  try {
    const base = "https://simforge.invalid";
    const resolved = new URL(next, base);
    if (resolved.origin !== base) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
