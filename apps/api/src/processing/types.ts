import type { DocumentFileType } from "@simforge/shared";

export type ExtractedBlockType = "heading" | "paragraph" | "table" | "list" | "slide" | "sheet-row" | "unknown";

export interface ExtractedBlock {
  text: string;
  blockType: ExtractedBlockType;
  headingPath: string[];
  pageNumber?: number;
  slideNumber?: number;
  sheetName?: string;
  rowStart?: number;
  rowEnd?: number;
  order: number;
}

export interface ExtractionResult {
  text: string;
  blocks?: ExtractedBlock[];
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
  sectionTitle?: string;
  headingPath?: string[];
  pageNumber?: number;
  slideNumber?: number;
  sheetName?: string;
  rowStart?: number;
  rowEnd?: number;
  contentHash: string;
  metadata: Record<string, unknown>;
}
