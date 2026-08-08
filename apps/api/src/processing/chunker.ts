import { createHash } from "node:crypto";
import type { ChunkInput, ExtractedBlock } from "./types.js";

export interface ChunkOptions { size?: number; overlap?: number; }

export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

export function contentHash(text: string, version = 1) {
  return createHash("sha256").update(`${version}:${text.replace(/\s+/gu, " ").trim()}`).digest("hex");
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
    if (value) chunks.push({ chunkNumber: chunks.length + 1, text: value, characterCount: value.length, estimatedTokens: estimateTokens(value), contentHash: contentHash(value), metadata: { startCharacter: start, endCharacter: end } });
    if (end === normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

function commonLocation(blocks: ExtractedBlock[]) {
  const first = blocks[0];
  const last = blocks.at(-1);
  if (!first) return {};
  const same = <T>(value: T | undefined, other: T | undefined) => value === other ? value : undefined;
  return {
    sectionTitle: first.headingPath.at(-1),
    headingPath: first.headingPath,
    pageNumber: same(first.pageNumber, last?.pageNumber),
    slideNumber: same(first.slideNumber, last?.slideNumber),
    sheetName: same(first.sheetName, last?.sheetName),
    rowStart: first.rowStart,
    rowEnd: last?.rowEnd ?? first.rowEnd,
  };
}

export function chunkBlocks(blocks: ExtractedBlock[], options: ChunkOptions & { documentVersion?: number } = {}): ChunkInput[] {
  const size = options.size ?? 4_000;
  const overlap = options.overlap ?? 400;
  if (size < 100 || overlap < 0 || overlap >= size) throw new Error("Invalid chunk configuration");
  const normalizedBlocks = blocks.map((block) => ({ ...block, text: block.text.replace(/[ \t]+/g, " ").trim() })).filter((block) => block.text);
  if (!normalizedBlocks.length) return [];
  const chunks: ChunkInput[] = [];
  let current: ExtractedBlock[] = [];
  let currentLength = 0;
  const flush = () => {
    if (!current.length) return;
    const text = current.map((block) => block.text).join("\n").trim();
    const location = commonLocation(current);
    chunks.push({
      chunkNumber: chunks.length + 1,
      text,
      characterCount: text.length,
      estimatedTokens: estimateTokens(text),
      contentHash: contentHash(text, options.documentVersion ?? 1),
      ...location,
      metadata: {
        blockStart: current[0]?.order,
        blockEnd: current.at(-1)?.order,
        blockTypes: [...new Set(current.map((block) => block.blockType))],
        ...location,
      },
    });
    const overlapBlocks: ExtractedBlock[] = [];
    let overlapLength = 0;
    for (const block of [...current].reverse()) {
      if (overlapLength >= overlap) break;
      overlapBlocks.unshift(block);
      overlapLength += block.text.length;
    }
    current = overlapBlocks;
    currentLength = overlapLength;
  };
  for (const block of normalizedBlocks) {
    if (current.length && currentLength + block.text.length > size) flush();
    current.push(block);
    currentLength += block.text.length;
  }
  current = current.filter((block, index, array) => index === 0 || block.order !== array[index - 1]?.order);
  flush();
  return chunks;
}
