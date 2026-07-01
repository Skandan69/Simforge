import ExcelJS from "exceljs";
import { franc } from "franc";
import JSZip from "jszip";
import mammoth from "mammoth";
import type { DocumentFileType } from "@simforge/shared";
import type { ExtractionResult, SourceExtractor } from "./types.js";

function assertZip(buffer: Buffer) { if (buffer.subarray(0, 2).toString() !== "PK") throw new Error("Invalid Open XML file"); }
function decodeXml(value: string) { return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"); }

const docx: SourceExtractor = {
  supports: "DOCX", validate: assertZip,
  async extract(buffer) { const result = await mammoth.extractRawText({ buffer }); return { text: result.value, metadata: { warnings: result.messages.length } }; },
};

const pptx: SourceExtractor = {
  supports: "PPTX", validate: assertZip,
  async extract(buffer) {
    const zip = await JSZip.loadAsync(buffer);
    const slides = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const text: string[] = [];
    for (const slide of slides) { const xml = await zip.file(slide)!.async("text"); text.push(xml.match(/<a:t(?: [^>]*)?>([\s\S]*?)<\/a:t>/g)?.map((node) => decodeXml(node.replace(/<[^>]+>/g, ""))).join(" ") ?? ""); }
    return { text: text.map((value, index) => `Slide ${index + 1}\n${value}`).join("\n\n"), unitCount: slides.length, unitName: "slides" };
  },
};

const xlsx: SourceExtractor = {
  supports: "XLSX", validate: assertZip,
  async extract(buffer) {
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(buffer as never);
    const sheets: string[] = [];
    workbook.eachSheet((sheet) => { const rows: string[] = []; sheet.eachRow((row) => { const values = Array.isArray(row.values) ? row.values.slice(1) : []; rows.push(values.map((cell) => typeof cell === "object" && cell && "text" in cell ? String(cell.text) : String(cell ?? "")).join("\t")); }); sheets.push(`Sheet: ${sheet.name}\n${rows.join("\n")}`); });
    return { text: sheets.join("\n\n"), unitCount: workbook.worksheets.length, unitName: "sheets" };
  },
};

const pdf: SourceExtractor = {
  supports: "PDF",
  validate(buffer) { if (buffer.subarray(0, 5).toString() !== "%PDF-") throw new Error("Invalid PDF file"); },
  async extract(buffer) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const document = await pdfjs.getDocument({ data: new Uint8Array(buffer), useWorkerFetch: false }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) { const page = await document.getPage(pageNumber); const content = await page.getTextContent(); pages.push(`Page ${pageNumber}\n${content.items.map((item) => "str" in item ? item.str : "").join(" ")}`); }
    return { text: pages.join("\n\n"), unitCount: document.numPages, unitName: "pages" };
  },
};

const extractors = new Map<DocumentFileType, SourceExtractor>([pdf, docx, pptx, xlsx].map((extractor) => [extractor.supports, extractor]));
export function getExtractor(type: DocumentFileType) { const extractor = extractors.get(type); if (!extractor) throw new Error(`Unsupported source type: ${type}`); return extractor; }
export function detectLanguage(text: string) { return text.length < 50 ? "und" : franc(text, { minLength: 50 }); }
