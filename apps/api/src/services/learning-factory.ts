import { DEFAULT_EVALUATION_CRITERIA, WORKFORCE_CAPABILITIES, type LearningFactoryAssetType, type LearningFactoryDraftStatus, type LearningFactoryPublishSimulationInput, type SaveSimulationInput, type SimulationDifficulty, type UserRole, type WorkforceCapability } from "@simforge/shared";

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

export const LEARNING_FACTORY_PUBLISH_ROLES: UserRole[] = ["Owner", "Admin", "Trainer", "Manager"];

export function canPublishLearningFactorySimulation(role: UserRole) {
  return LEARNING_FACTORY_PUBLISH_ROLES.includes(role);
}

export function publishEligibility(input: {
  assetType: LearningFactoryAssetType;
  status: LearningFactoryDraftStatus;
  publishedSimulationId?: string | null;
}) {
  if (input.publishedSimulationId || input.status === "PUBLISHED") return { eligible: false as const, code: "DRAFT_ALREADY_PUBLISHED", message: "This draft has already created a simulation." };
  if (input.assetType !== "SIMULATION") return { eligible: false as const, code: "DRAFT_ASSET_TYPE_NOT_SUPPORTED", message: "Only simulation drafts can create simulations." };
  if (input.status !== "APPROVED") return { eligible: false as const, code: "DRAFT_NOT_APPROVED", message: "Approve this simulation draft before creating a simulation." };
  return { eligible: true as const };
}

const text = (value: unknown, fallback: string, max = 2000) => {
  const candidate = typeof value === "string" ? value.trim() : "";
  return (candidate || fallback).slice(0, max);
};

const numberValue = (value: unknown, fallback: number, min: number, max: number) => {
  const candidate = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.max(min, Math.min(max, candidate));
};

const arrayText = (value: unknown) => Array.isArray(value) ? value.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean) : [];

export function mapDraftToSimulationInput(input: {
  draft: {
    title: string;
    description: string;
    capabilityMappings: unknown;
    payload: Record<string, unknown>;
  };
  blueprint?: { industry?: string | null } | null;
  source?: { knowledgeBaseId: string; knowledgeBase: { name: string; department: string } } | null;
  criteriaIds: string[];
  overrides?: LearningFactoryPublishSimulationInput;
}): SaveSimulationInput {
  const payload = input.draft.payload ?? {};
  const overrides = input.overrides ?? {};
  const capabilities = Array.isArray(input.draft.capabilityMappings) ? input.draft.capabilityMappings.filter((item): item is WorkforceCapability => typeof item === "string" && WORKFORCE_CAPABILITIES.includes(item as WorkforceCapability)) : [];
  const objectives = overrides.objectives?.map((item) => item.trim()).filter(Boolean)
    ?? arrayText(payload.objectives);
  const sourceName = input.source?.knowledgeBase.name ?? "Company knowledge";
  return {
    title: text(overrides.title, input.draft.title.replace(/^Practice:\s*/iu, ""), 160),
    description: text(overrides.description, input.draft.description, 2000),
    industry: text(overrides.industry, input.blueprint?.industry ?? "General", 100),
    department: text(overrides.department, input.source?.knowledgeBase.department ?? "General", 100),
    jobRole: text(overrides.jobRole, "Learner", 120),
    category: text(overrides.category, capabilities[0] ?? "Knowledge-grounded practice", 100),
    difficulty: overrides.difficulty ?? (payload.suggestedDifficulty as SimulationDifficulty | undefined) ?? "Intermediate",
    status: "Draft",
    estimatedMinutes: numberValue(overrides.estimatedMinutes, 10, 1, 240),
    personaId: overrides.personaId ?? null,
    scenarioSetup: text(overrides.scenarioSetup, text(payload.scenarioSetup, `Practice applying guidance from ${sourceName}.`, 10000), 10000),
    successCriteria: text(overrides.successCriteria, text(payload.successCriteria, "The learner applies approved company guidance accurately and explains the next step clearly.", 5000), 5000),
    objectives: objectives.length ? objectives.slice(0, 30) : ["Apply approved knowledge accurately", "Explain the decision using company guidance"],
    knowledgeBaseIds: input.source ? [input.source.knowledgeBaseId] : [],
    criterionIds: input.criteriaIds,
  };
}

export const capabilityCriterionHints: Record<WorkforceCapability, string[]> = {
  Communication: ["Communication", "Professionalism", "Confidence"],
  "Product Knowledge": ["Knowledge accuracy", "Product Knowledge"],
  "Policy Compliance": ["Compliance", "Process adherence", "Policy Compliance"],
  Empathy: ["Empathy", "Communication"],
  "Problem Solving": ["Problem solving", "Problem Solving"],
  "Decision Making": ["Process adherence", "Problem solving", "Decision Making"],
};

export function criterionNamesForCapabilities(capabilities: WorkforceCapability[]) {
  const names = new Set<string>();
  for (const capability of capabilities.length ? capabilities : ["Communication" as WorkforceCapability]) {
    for (const name of capabilityCriterionHints[capability]) names.add(name);
  }
  if (!names.size) DEFAULT_EVALUATION_CRITERIA.slice(0, 2).forEach((name) => names.add(name));
  return [...names].slice(0, 8);
}
