import type { SaveSimulationInput } from "@simforge/shared";

export function simulationRelations(input: Pick<SaveSimulationInput, "objectives" | "knowledgeBaseIds" | "criterionIds">) {
  return {
    objectives: { create: input.objectives.map((title, sortOrder) => ({ title: title.trim(), sortOrder })).filter((item) => item.title) },
    knowledgeBases: { create: [...new Set(input.knowledgeBaseIds)].map((knowledgeBaseId) => ({ knowledgeBaseId })) },
    evaluationCriteria: { create: [...new Set(input.criterionIds)].map((criterionId) => ({ criterionId })) },
  };
}

export function duplicateSimulationIdentity(title: string) {
  return { title: `${title} (Copy)`, status: "Draft" as const };
}

export function scopedSimulationMutation(id: string, organizationId: string) {
  return { where: { id, organizationId } };
}

export function isKnowledgeBaseSelectionValid(selectedIds: string[], matchedActiveCount: number, availableActiveCount: number) {
  const selectedCount = new Set(selectedIds).size;
  return selectedCount ? matchedActiveCount === selectedCount : availableActiveCount === 0;
}

export const archiveSimulationData = { status: "Archived" as const };
