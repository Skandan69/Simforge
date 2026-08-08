import type { LearningFactoryPublishSimulationInput, WorkforceCapability } from "@simforge/shared";
import { WORKFORCE_CAPABILITIES } from "@simforge/shared";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { simulationRelations } from "./simulation-config.js";
import { criterionNamesForCapabilities, mapDraftToSimulationInput, publishEligibility } from "./learning-factory.js";

const includePublishedSimulation = {
  persona: true,
  objectives: { orderBy: { sortOrder: "asc" as const } },
  knowledgeBases: { include: { knowledgeBase: true } },
  evaluationCriteria: { include: { criterion: true } },
  _count: {
    select: {
      objectives: true,
      knowledgeBases: true,
      evaluationCriteria: true,
    },
  },
} as const;

export const publishedSimulationInclude = includePublishedSimulation;

function capabilities(value: unknown): WorkforceCapability[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is WorkforceCapability => typeof item === "string" && WORKFORCE_CAPABILITIES.includes(item as WorkforceCapability)))];
}

async function resolveCriteria(input: {
  organizationId: string;
  userId: string;
  requestedCriterionIds?: string[];
  capabilityMappings: unknown;
}) {
  if (input.requestedCriterionIds?.length) {
    const records = await prisma.simulationEvaluationCriterion.findMany({
      where: { organizationId: input.organizationId, id: { in: [...new Set(input.requestedCriterionIds)] } },
      select: { id: true },
    });
    if (records.length !== new Set(input.requestedCriterionIds).size) {
      throw new HttpError("One or more evaluation criteria are unavailable", 400, "INVALID_SIMULATION_LINK");
    }
    return records.map((record) => record.id);
  }
  const desiredNames = criterionNamesForCapabilities(capabilities(input.capabilityMappings));
  const existing = await prisma.simulationEvaluationCriterion.findMany({
    where: { organizationId: input.organizationId, name: { in: desiredNames } },
    select: { id: true, name: true },
  });
  const existingNames = new Set(existing.map((record) => record.name));
  const missingNames = desiredNames.filter((name) => !existingNames.has(name));
  if (missingNames.length) {
    await prisma.simulationEvaluationCriterion.createMany({
      data: missingNames.map((name) => ({
        organizationId: input.organizationId,
        createdBy: input.userId,
        name,
        description: `Trainer-review criterion generated for knowledge-grounded ${name.toLowerCase()} practice.`,
        isDefault: false,
      })),
      skipDuplicates: true,
    });
  }
  const records = await prisma.simulationEvaluationCriterion.findMany({
    where: { organizationId: input.organizationId, name: { in: desiredNames } },
    select: { id: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  return records.map((record) => record.id);
}

export async function publishLearningFactorySimulationDraft(input: {
  draftId: string;
  organizationId: string;
  userId: string;
  overrides?: LearningFactoryPublishSimulationInput;
}) {
  const draft = await prisma.learningFactoryDraft.findFirst({
    where: { id: input.draftId, organizationId: input.organizationId },
    include: {
      sourceDocument: { select: { id: true, knowledgeBaseId: true, knowledgeBase: { select: { id: true, name: true, department: true, status: true, organizationId: true } } } },
      publishedSimulation: { include: includePublishedSimulation },
    },
  });
  if (!draft) throw new HttpError("Learning Factory draft not found", 404, "LEARNING_FACTORY_DRAFT_NOT_FOUND");
  if (draft.publishedSimulationId && draft.publishedSimulation) {
    return { draft, simulation: draft.publishedSimulation, alreadyPublished: true };
  }
  const eligibility = publishEligibility(draft);
  if (!eligibility.eligible) throw new HttpError(eligibility.message, eligibility.code === "DRAFT_ALREADY_PUBLISHED" ? 409 : 400, eligibility.code);
  if (!draft.sourceDocument || draft.sourceDocument.knowledgeBase.organizationId !== input.organizationId || draft.sourceDocument.knowledgeBase.status !== "Active") {
    throw new HttpError("The source knowledge for this draft is no longer available", 409, "SOURCE_KNOWLEDGE_UNAVAILABLE");
  }

  const [blueprint, criteriaIds] = await Promise.all([
    prisma.organizationBlueprint.findFirst({ where: { organizationId: input.organizationId, status: "APPROVED" }, select: { industry: true } }),
    resolveCriteria({
      organizationId: input.organizationId,
      userId: input.userId,
      requestedCriterionIds: input.overrides?.criterionIds,
      capabilityMappings: draft.capabilityMappings,
    }),
  ]);
  if (!criteriaIds.length) throw new HttpError("At least one evaluation criterion is required", 409, "EVALUATION_CRITERIA_REQUIRED");

  const simulationInput = mapDraftToSimulationInput({
    draft: { title: draft.title, description: draft.description, capabilityMappings: draft.capabilityMappings, payload: draft.payload as Record<string, unknown> },
    blueprint,
    source: { knowledgeBaseId: draft.sourceDocument.knowledgeBaseId, knowledgeBase: draft.sourceDocument.knowledgeBase },
    criteriaIds,
    overrides: input.overrides,
  });

  const result = await prisma.$transaction(async (transaction) => {
    const fresh = await transaction.learningFactoryDraft.findFirst({
      where: { id: input.draftId, organizationId: input.organizationId },
      select: { id: true, status: true, publishedSimulationId: true },
    });
    if (!fresh) throw new HttpError("Learning Factory draft not found", 404, "LEARNING_FACTORY_DRAFT_NOT_FOUND");
    if (fresh.publishedSimulationId || fresh.status === "PUBLISHED") {
      throw new HttpError("This draft has already created a simulation.", 409, "DRAFT_ALREADY_PUBLISHED");
    }
    const simulation = await transaction.simulation.create({
      data: {
        title: simulationInput.title,
        description: simulationInput.description,
        industry: simulationInput.industry,
        department: simulationInput.department,
        jobRole: simulationInput.jobRole,
        category: simulationInput.category,
        difficulty: simulationInput.difficulty,
        status: "Draft",
        estimatedMinutes: simulationInput.estimatedMinutes,
        personaId: simulationInput.personaId ?? null,
        scenarioSetup: simulationInput.scenarioSetup,
        successCriteria: simulationInput.successCriteria,
        organizationId: input.organizationId,
        createdBy: input.userId,
        ...simulationRelations(simulationInput),
        versions: {
          create: {
            version: 1,
            snapshot: {
              ...simulationInput,
              provenance: {
                source: "LearningFactoryDraft",
                draftId: draft.id,
                sourceDocumentId: draft.sourceDocumentId,
                generatedFrom: draft.generatedFrom,
                capabilityMappings: draft.capabilityMappings,
                note: "Generated from Knowledge Intelligence and trainer review. Saved as Draft for Simulation Studio review.",
              },
            },
          },
        },
      },
      include: includePublishedSimulation,
    });
    const updatedDraft = await transaction.learningFactoryDraft.update({
      where: { id: draft.id },
      data: { status: "PUBLISHED", publishedSimulationId: simulation.id, publishedAt: new Date() },
      include: { publishedSimulation: { include: includePublishedSimulation } },
    });
    await transaction.activity.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.userId,
        action: "Simulation created from Learning Factory",
        description: `Created draft simulation "${simulation.title}" from approved knowledge-grounded draft.`,
      },
    });
    return { draft: updatedDraft, simulation, alreadyPublished: false };
  });
  return result;
}
