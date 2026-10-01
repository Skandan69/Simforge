import ExcelJS from "exceljs";
import { franc } from "franc";
import JSZip from "jszip";
import mammoth from "mammoth";
import type { DocumentFileType } from "@simforge/shared";
import type { ExtractedBlock, ExtractionResult, SourceExtractor } from "./types.js";

export const OPEN_XML_LIMITS = { maxEntries: 20_000, maxUncompressedBytes: 500 * 1024 * 1024 } as const;
export const MAX_PDF_PAGES = 2_000;

/**
 * Reads the ZIP central directory (without decompressing anything) and rejects
 * archives whose declared uncompressed size or entry count is unreasonable.
 * This stops "zip bombs" - tiny uploads that expand to gigabytes in memory.
 */
export function inspectZipArchive(buffer: Buffer, limits: { maxEntries: number; maxUncompressedBytes: number } = OPEN_XML_LIMITS) {
  const EOCD = 0x06054b50; const CENTRAL = 0x02014b50;
  const searchStart = Math.max(0, buffer.length - (22 + 0xffff));
  let eocd = -1;
  for (let offset = buffer.length - 22; offset >= searchStart; offset--) {
    if (buffer.readUInt32LE(offset) === EOCD) { eocd = offset; break; }
  }
  if (eocd < 0) throw new Error("Invalid Open XML file");
  const entries = buffer.readUInt16LE(eocd + 10);
  const directoryOffset = buffer.readUInt32LE(eocd + 16);
  if (entries === 0xffff || directoryOffset === 0xffffffff) throw new Error("Document archive is too large to process");
  if (entries > limits.maxEntries) throw new Error("Document contains too many embedded files to process safely");
  let offset = directoryOffset; let total = 0;
  for (let index = 0; index < entries; index++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== CENTRAL) throw new Error("Invalid Open XML file");
    const uncompressed = buffer.readUInt32LE(offset + 24);
    if (uncompressed === 0xffffffff) throw new Error("Document archive is too large to process");
    total += uncompressed;
    if (total > limits.maxUncompressedBytes) throw new Error("Document expands to more content than can be processed safely");
    offset += 46 + buffer.readUInt16LE(offset + 28) + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
  return { entries, uncompressedBytes: total };
}

function assertZip(buffer: Buffer) {
  if (buffer.length < 22 || buffer.subarray(0, 2).toString() !== "PK") throw new Error("Invalid Open XML file");
  inspectZipArchive(buffer);
}
function decodeXml(value: string) { return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"); }

const docx: SourceExtractor = {
  supports: "DOCX", validate: assertZip,
  async extract(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    const blocks = result.value.split(/\n\s*\n/u).map((text, index) => text.trim()).filter(Boolean).map((text, index): ExtractedBlock => {
      const isHeading = text.length <= 100 && !/[.!?](?:\s|$)/u.test(text);
      return { text, blockType: isHeading ? "heading" : "paragraph", headingPath: isHeading ? [text] : [], order: index + 1 };
    });
    return { text: result.value, blocks, metadata: { warnings: result.messages.length } };
  },
};

const pptx: SourceExtractor = {
  supports: "PPTX", validate: assertZip,
  async extract(buffer) {
    const zip = await JSZip.loadAsync(buffer);
    const slides = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const text: string[] = [];
    const blocks: ExtractedBlock[] = [];
    for (const [index, slide] of slides.entries()) {
      const xml = await zip.file(slide)!.async("text");
      const value = xml.match(/<a:t(?: [^>]*)?>([\s\S]*?)<\/a:t>/g)?.map((node) => decodeXml(node.replace(/<[^>]+>/g, ""))).join(" ").trim() ?? "";
      text.push(value);
      if (value) blocks.push({ text: value, blockType: "slide", headingPath: [`Slide ${index + 1}`], slideNumber: index + 1, order: index + 1 });
    }
    return { text: text.map((value, index) => `Slide ${index + 1}\n${value}`).join("\n\n"), blocks, unitCount: slides.length, unitName: "slides" };
  },
};

const xlsx: SourceExtractor = {
  supports: "XLSX", validate: assertZip,
  async extract(buffer) {
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(buffer as never);
    const sheets: string[] = [];
    const blocks: ExtractedBlock[] = [];
    let order = 1;
    workbook.eachSheet((sheet) => {
      const rows: string[] = [];
      sheet.eachRow((row, rowNumber) => {
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];
        const text = values.map((cell) => typeof cell === "object" && cell && "text" in cell ? String(cell.text) : String(cell ?? "")).join("\t").trim();
        rows.push(text);
        if (text) blocks.push({ text, blockType: "sheet-row", headingPath: [sheet.name], sheetName: sheet.name, rowStart: rowNumber, rowEnd: rowNumber, order: order++ });
      });
      sheets.push(`Sheet: ${sheet.name}\n${rows.join("\n")}`);
    });
    return { text: sheets.join("\n\n"), blocks, unitCount: workbook.worksheets.length, unitName: "sheets" };
  },
};

const pdf: SourceExtractor = {
  supports: "PDF",
  validate(buffer) { if (buffer.subarray(0, 5).toString() !== "%PDF-") throw new Error("Invalid PDF file"); },
  async extract(buffer) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer), useWorkerFetch: false });
    const document = await loadingTask.promise;
    if (document.numPages > MAX_PDF_PAGES) { await loadingTask.destroy(); throw new Error(`PDF has more than ${MAX_PDF_PAGES} pages and cannot be processed`); }
    const pages: string[] = [];
    const blocks: ExtractedBlock[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map((item) => "str" in item ? item.str : "").join(" ").trim();
      pages.push(`Page ${pageNumber}\n${text}`);
      if (text) blocks.push({ text, blockType: "paragraph", headingPath: [`Page ${pageNumber}`], pageNumber, order: pageNumber });
    }
    return { text: pages.join("\n\n"), blocks, unitCount: document.numPages, unitName: "pages" };
  },
};

const extractors = new Map<DocumentFileType, SourceExtractor>([pdf, docx, pptx, xlsx].map((extractor) => [extractor.supports, extractor]));
export function getExtractor(type: DocumentFileType) { const extractor = extractors.get(type); if (!extractor) throw new Error(`Unsupported source type: ${type}`); return extractor; }
export function detectLanguage(text: string) { return text.length < 50 ? "und" : franc(text, { minLength: 50 }); }
