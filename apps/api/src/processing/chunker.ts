import type { ChunkInput } from "./types.js";

export interface ChunkOptions { size?: number; overlap?: number; }

export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

export function chunkText(text: string, options: ChunkOptions = {}): ChunkInput[] {
  const size = options.size ?? 4_000;
  const overlap = options.overlap ?? 400;
  if (size < 100 || overlap < 0 || overlap >= size) throw new Error("Invalid chunk configuration");
  const normalized = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!normalized) return [];
  const chunks: ChunkInput[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + size, normalized.length);
    if (end < normalized.length) {
      const boundary = Math.max(normalized.lastIndexOf("\n", end), normalized.lastIndexOf(" ", end));
      if (boundary > start + size * 0.6) end = boundary;
    }
    const value = normalized.slice(start, end).trim();
    if (value) chunks.push({ chunkNumber: chunks.length + 1, text: value, characterCount: value.length, estimatedTokens: estimateTokens(value), metadata: { startCharacter: start, endCharacter: end } });
    if (end === normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}
