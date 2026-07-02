interface KnowledgeCandidate {
  id: string;
  title: string;
  summary: string;
  sectionType: string;
  importance: string;
  confidence: number;
  keywords: string[];
  capabilities: string[];
}

const terms = (value: string) => new Set(value.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]{2,}/gu) ?? []);

export function rankKnowledgeSections(candidates: KnowledgeCandidate[], query: string, limit: number) {
  const queryTerms = terms(query);
  return candidates.map((section) => {
    const searchable = terms(`${section.title} ${section.summary} ${section.keywords.join(" ")} ${section.capabilities.join(" ")}`);
    const overlap = [...queryTerms].filter((term) => searchable.has(term)).length;
    const importance = section.importance === "Critical" ? 2 : section.importance === "Important" ? 1 : 0;
    return { section, relevance: overlap * 3 + importance + section.confidence };
  }).sort((a, b) => b.relevance - a.relevance || b.section.confidence - a.section.confidence).slice(0, limit).map(({ section }) => section);
}
