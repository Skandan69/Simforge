import type {
  KnowledgeImportance,
  KnowledgeSectionType,
  WorkforceCapability,
} from "@simforge/shared";

export interface IntelligenceSectionInput {
  sectionNumber: number;
  title: string;
  summary: string;
  sectionType: KnowledgeSectionType;
  confidence: number;
  keywords: string[];
  importance: KnowledgeImportance;
  capabilities: Array<WorkforceCapability | "Unknown">;
  isAiSuggestion: true;
  analysisVersion: "heuristic-v0.1";
}

const typeSignals: Array<[KnowledgeSectionType, RegExp]> = [
  ["Compliance", /\b(compliance|regulation|regulatory|audit|legal|mandatory|prohibited)\b/giu],
  ["Policy", /\b(policy|must|shall|requirement|guideline|standard)\b/giu],
  ["Procedure", /\b(procedure|process|step|workflow|first|next|then)\b/giu],
  ["FAQ", /\b(faq|frequently asked|question|answer|how do i|what is)\b/giu],
  ["BestPractice", /\b(best practice|recommended|tip|should|avoid|effective)\b/giu],
  ["ProductInformation", /\b(product|feature|service|specification|pricing|plan|benefit)\b/giu],
  ["GeneralReference", /\b(overview|introduction|reference|background|definition|glossary)\b/giu],
];

const stopWords = new Set(["about", "after", "also", "and", "are", "been", "before", "being", "between", "can", "from", "have", "into", "must", "not", "should", "that", "the", "their", "then", "there", "these", "they", "this", "those", "through", "with", "will", "your"]);

function splitSections(text: string) {
  const paragraphs = text.replace(/\r\n/g, "\n").split(/\n\s*\n+/u).map((value) => value.trim()).filter(Boolean);
  const sections: string[] = [];
  let current = "";
  for (const paragraph of paragraphs.length ? paragraphs : [text.trim()]) {
    const heading = paragraph.length <= 100 && !/[.!?](?:\s|$)/u.test(paragraph);
    if (current && (current.length + paragraph.length > 2_000 || heading)) {
      sections.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) sections.push(current);
  return sections;
}

function titleFor(section: string, index: number) {
  const firstLine = section.split("\n", 1)[0]?.trim() ?? "";
  if (firstLine.length >= 3 && firstLine.length <= 100) return firstLine.replace(/[:.]$/u, "");
  const firstSentence = section.match(/^(.{3,100}?)(?:[.!?]|$)/u)?.[1];
  return firstSentence?.trim() || `Section ${index + 1}`;
}

function keywordsFor(text: string) {
  const counts = new Map<string, number>();
  for (const token of text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]{2,}/gu) ?? []) {
    if (stopWords.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6).map(([token]) => token);
}

function classify(text: string) {
  const ranked = typeSignals.map(([type, pattern]) => [type, text.match(pattern)?.length ?? 0] as const).sort((a, b) => b[1] - a[1]);
  const [sectionType, hits] = ranked[0] ?? ["Unknown", 0];
  if (hits === 0) return { sectionType: "Unknown" as const, confidence: 0.35 };
  return { sectionType, confidence: Math.min(0.95, 0.55 + hits * 0.08) };
}

function capabilitiesFor(type: KnowledgeSectionType, text: string): Array<WorkforceCapability | "Unknown"> {
  const capabilities = new Set<WorkforceCapability>();
  if (["ProductInformation", "GeneralReference"].includes(type)) capabilities.add("Product Knowledge");
  if (["Policy", "Compliance"].includes(type)) capabilities.add("Policy Compliance");
  if (["Procedure", "BestPractice"].includes(type)) { capabilities.add("Problem Solving"); capabilities.add("Decision Making"); }
  if (/\b(communicat|explain|listen|question|tone|conversation)\w*\b/iu.test(text)) capabilities.add("Communication");
  if (/\b(empathy|empathetic|emotion|customer feeling|understand the customer)\b/iu.test(text)) capabilities.add("Empathy");
  return capabilities.size ? [...capabilities] : ["Unknown"];
}

function importanceFor(type: KnowledgeSectionType, text: string): KnowledgeImportance {
  if (/\b(critical|must not|mandatory|prohibited|legal requirement|safety)\b/iu.test(text)) return "Critical";
  if (["Policy", "Procedure", "Compliance"].includes(type)) return "Important";
  if (type === "Unknown") return "Optional";
  return "Reference";
}

export function analyzeKnowledge(text: string): IntelligenceSectionInput[] {
  return splitSections(text).map((section, index) => {
    const { sectionType, confidence } = classify(section);
    const compact = section.replace(/\s+/gu, " ").trim();
    return {
      sectionNumber: index + 1,
      title: titleFor(section, index),
      summary: compact.length > 280 ? `${compact.slice(0, 277).trimEnd()}...` : compact,
      sectionType,
      confidence,
      keywords: keywordsFor(section),
      importance: importanceFor(sectionType, section),
      capabilities: capabilitiesFor(sectionType, section),
      isAiSuggestion: true,
      analysisVersion: "heuristic-v0.1",
    };
  });
}
