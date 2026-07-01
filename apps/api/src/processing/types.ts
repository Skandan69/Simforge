import type { DocumentFileType } from "@simforge/shared";

export interface ExtractionResult {
  text: string;
  title?: string;
  unitCount?: number;
  unitName?: "pages" | "slides" | "sheets";
  metadata?: Record<string, unknown>;
}

export interface SourceExtractor {
  supports: DocumentFileType;
  validate(buffer: Buffer): void;
  extract(buffer: Buffer): Promise<ExtractionResult>;
}

export interface ChunkInput {
  chunkNumber: number;
  text: string;
  characterCount: number;
  estimatedTokens: number;
  metadata: Record<string, unknown>;
}
