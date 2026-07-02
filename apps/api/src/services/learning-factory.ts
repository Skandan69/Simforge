import { WORKFORCE_CAPABILITIES, type LearningFactoryAssetType, type LearningFactoryDraftStatus, type WorkforceCapability } from "@simforge/shared";

export interface LearningFactorySection {
  id: string;
  documentId: string | null;
  title: string;
  summary: string;
  sectionType: string;
  importance: "Critical" | "Important" | "Reference" | "Optional";
  confidence: number;
  capabilities: string[];
}

export interface LearningFactoryBlueprint {
  industry: string;
  primaryTrainingGoals: unknown;
  priorityCapabilities: unknown;
  successDefinition: string;
  costlyMistakes: string;
  nonNegotiables: string;
}

const supported = new Set<string>(WORKFORCE_CAPABILITIES);

function blueprintCapabilities(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as { capability?: unknown; priority?: unknown };
    return candidate.priority === "High" && typeof candidate.capability === "string" && supported.has(candidate.capability) ? [candidate.capability as WorkforceCapability] : [];
  });
}

export function mapDraftCapabilities(section: LearningFactorySection, blueprint: LearningFactoryBlueprint): WorkforceCapability[] {
  const direct = section.capabilities.filter((capability): capability is WorkforceCapability => supported.has(capability));
  if (direct.length) return [...new Set(direct)];
  const priorities = blueprintCapabilities(blueprint.priorityCapabilities);
  if (priorities.length) return priorities;
  if (["Policy", "Compliance"].includes(section.sectionType)) return ["Policy Compliance"];
  if (section.sectionType === "ProductInformation") return ["Product Knowledge"];
  if (section.sectionType === "Procedure") return ["Problem Solving", "Decision Making"];
  return ["Communication"];
}

const businessValue: Record<LearningFactoryAssetType, string> = {
  SIMULATION: "Creates a realistic practice scenario around a high-value knowledge requirement.",
  QUESTION_BANK: "Gives trainers reviewable questions for checking understanding before practice.",
  LEARNING_OBJECTIVE: "Turns source knowledge into a clear, observable workforce outcome.",
  COACHING_FOCUS: "Highlights a focused behavior trainers can reinforce after practice.",
};

export function buildLearningFactoryDrafts(blueprint: LearningFactoryBlueprint, sections: LearningFactorySection[]) {
  const prioritized = [...sections].filter((section) => section.importance === "Critical" || section.importance === "Important").sort((a, b) => (a.importance === b.importance ? b.confidence - a.confidence : a.importance === "Critical" ? -1 : 1));
  return prioritized.flatMap((section) => {
    const capabilities = mapDraftCapabilities(section, blueprint);
    const base = { sourceDocumentId: section.documentId, generatedFrom: `knowledge-intelligence:${section.id}:v1`, capabilityMappings: capabilities, importance: section.importance, confidence: section.confidence };
    return [
      { ...base, assetType: "SIMULATION" as const, title: `Practice: ${section.title}`, description: `Review-required scenario draft based on ${section.sectionType.toLowerCase()} knowledge.`, businessValue: businessValue.SIMULATION, payload: { generatedDraft: true, scenarioSetup: `A learner must apply “${section.title}” in a realistic ${blueprint.industry} workplace situation.`, objectives: [`Apply ${section.title} accurately`, `Explain the decision using approved guidance`], successCriteria: section.summary, suggestedDifficulty: section.importance === "Critical" ? "Advanced" : "Intermediate" } },
      { ...base, assetType: "LEARNING_OBJECTIVE" as const, title: `Objective: ${section.title}`, description: "Review-required learning objective draft.", businessValue: businessValue.LEARNING_OBJECTIVE, payload: { generatedDraft: true, objectives: [`Apply ${section.title} correctly in a realistic work situation`, `Recognize when ${section.title} requires escalation or verification`], successDefinition: blueprint.successDefinition } },
      { ...base, assetType: "QUESTION_BANK" as const, title: `Questions: ${section.title}`, description: "Review-required question bank draft.", businessValue: businessValue.QUESTION_BANK, payload: { generatedDraft: true, questions: [{ prompt: `How would you apply ${section.title} in this situation?`, expectedEvidence: section.summary }, { prompt: `What risk is reduced by following ${section.title}?`, expectedEvidence: blueprint.costlyMistakes || section.summary }] } },
      { ...base, assetType: "COACHING_FOCUS" as const, title: `Coaching: ${section.title}`, description: "Review-required coaching focus draft.", businessValue: businessValue.COACHING_FOCUS, payload: { generatedDraft: true, focusAreas: capabilities.map((capability) => ({ capability, coachingPrompt: `Ask the learner to show how ${capability.toLowerCase()} supports ${section.title}.` })), nonNegotiables: blueprint.nonNegotiables } },
    ];
  });
}

export function learningFactoryScope(id: string, organizationId: string) {
  return { id, organizationId } as const;
}

export function reviewDraftTransition(current: LearningFactoryDraftStatus, action: "approve" | "reject") {
  if (current === "PUBLISHED") throw new Error("Published drafts cannot be changed");
  return action === "approve" ? "APPROVED" as const : "REJECTED" as const;
}
