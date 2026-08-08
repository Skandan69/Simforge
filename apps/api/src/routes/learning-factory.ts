import { Router, type RequestHandler } from "express";
import { z } from "zod";
import {
  SIMULATION_DIFFICULTIES,
  type LearningFactoryDraftResponse,
  type LearningFactoryGenerateResponse,
  type LearningFactoryDraftListResponse,
  type LearningFactoryPublishSimulationInput,
  type LearningFactoryPublishSimulationResponse,
  type SimulationDetail,
  type SimulationSummary,
  type UserRole,
  type WorkforceCapability,
} from "@simforge/shared";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { requireAuth } from "../middleware/auth.js";
import { getWorkspaceRequest, requireWorkspace } from "../middleware/workspace.js";
import { buildLearningFactoryDrafts, canPublishLearningFactorySimulation, learningFactoryScope, reviewDraftTransition } from "../services/learning-factory.js";
import { publishLearningFactorySimulationDraft } from "../services/learning-factory-publisher.js";

const assetTypes = ["SIMULATION", "QUESTION_BANK", "LEARNING_OBJECTIVE", "COACHING_FOCUS"] as const;
const statuses = ["DRAFT", "APPROVED", "REJECTED", "PUBLISHED"] as const;

export const requireLearningFactoryWrite: RequestHandler = (request, response, next) => {
  const { role } = getWorkspaceRequest(request).workspace;
  if (!(["Owner", "Admin"] as UserRole[]).includes(role)) {
    response.status(403).json({ error: "Only organization Owners and Admins can manage Learning Factory drafts", code: "LEARNING_FACTORY_WRITE_DENIED" });
    return;
  }
  next();
};

export const requireLearningFactorySimulationPublish: RequestHandler = (request, response, next) => {
  const { role } = getWorkspaceRequest(request).workspace;
  if (!canPublishLearningFactorySimulation(role)) {
    response.status(403).json({ error: "Only Owners, Admins, Trainers, and Managers can create simulations from approved drafts", code: "LEARNING_FACTORY_PUBLISH_DENIED" });
    return;
  }
  next();
};

function mapDraft(record: any): LearningFactoryDraftResponse {
  return { id: record.id, sourceDocumentId: record.sourceDocumentId, publishedSimulationId: record.publishedSimulationId ?? null, publishedAt: record.publishedAt ? record.publishedAt.toISOString() : null, title: record.title, description: record.description, assetType: record.assetType, status: record.status, generatedFrom: record.generatedFrom, capabilityMappings: record.capabilityMappings as WorkforceCapability[], importance: record.importance, confidence: record.confidence, businessValue: record.businessValue, payload: record.payload as Record<string, unknown>, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() };
}

function simulationSummary(record: any): SimulationSummary {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    industry: record.industry,
    department: record.department,
    jobRole: record.jobRole,
    category: record.category,
    difficulty: record.difficulty,
    status: record.status,
    estimatedMinutes: record.estimatedMinutes,
    persona: record.persona ? { id: record.persona.id, name: record.persona.name, role: record.persona.role } : null,
    objectiveCount: record._count.objectives,
    knowledgeBaseCount: record._count.knowledgeBases,
    criterionCount: record._count.evaluationCriteria,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapSimulationDetail(record: any): SimulationDetail {
  return {
    ...simulationSummary(record),
    scenarioSetup: record.scenarioSetup,
    successCriteria: record.successCriteria,
    objectives: record.objectives,
    knowledgeBases: record.knowledgeBases.map((link: any) => ({ id: link.knowledgeBase.id, name: link.knowledgeBase.name, department: link.knowledgeBase.department })),
    evaluationCriteria: record.evaluationCriteria.map((link: any) => ({
      id: link.criterion.id,
      name: link.criterion.name,
      description: link.criterion.description,
      isDefault: link.criterion.isDefault,
      updatedAt: link.criterion.updatedAt.toISOString(),
    })),
    canEdit: true,
  };
}

const publishSimulationSchema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  industry: z.string().trim().min(2).max(100).optional(),
  department: z.string().trim().min(2).max(100).optional(),
  jobRole: z.string().trim().min(2).max(120).optional(),
  category: z.string().trim().min(2).max(100).optional(),
  difficulty: z.enum(SIMULATION_DIFFICULTIES).optional(),
  estimatedMinutes: z.number().int().min(1).max(240).optional(),
  personaId: z.string().uuid().nullable().optional(),
  scenarioSetup: z.string().trim().min(10).max(10000).optional(),
  successCriteria: z.string().trim().min(5).max(5000).optional(),
  objectives: z.array(z.string().trim().min(2).max(300)).min(1).max(30).optional(),
  criterionIds: z.array(z.string().uuid()).min(1).max(30).optional(),
}) satisfies z.ZodType<LearningFactoryPublishSimulationInput>;

export const learningFactoryRouter = Router();
learningFactoryRouter.use(requireAuth, requireWorkspace);

learningFactoryRouter.post("/generate", requireLearningFactoryWrite, async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const { documentId } = z.object({ documentId: z.string().uuid().optional() }).parse(request.body ?? {});
  const blueprint = await prisma.organizationBlueprint.findFirst({ where: { organizationId, status: "APPROVED" }, select: { industry: true, primaryTrainingGoals: true, priorityCapabilities: true, successDefinition: true, costlyMistakes: true, nonNegotiables: true } });
  if (!blueprint) throw new HttpError("Approve the Organization Blueprint before generating drafts", 409, "APPROVED_BLUEPRINT_REQUIRED");
  const sections = await prisma.knowledgeIntelligenceSection.findMany({
    where: { importance: { in: ["Critical", "Important"] }, source: { organizationId, status: "Completed", documentId } },
    select: { id: true, title: true, summary: true, sectionType: true, importance: true, confidence: true, capabilities: true, source: { select: { documentId: true } } },
    orderBy: [{ importance: "asc" }, { confidence: "desc" }], take: 12,
  });
  if (!sections.length) throw new HttpError("No Critical or Important knowledge sections are available for generation", 409, "PRIORITIZED_KNOWLEDGE_REQUIRED");
  const drafts = buildLearningFactoryDrafts(blueprint, sections.map((section) => ({ ...section, documentId: section.source.documentId })));
  const created = await prisma.learningFactoryDraft.createMany({ data: drafts.map((draft) => ({ ...draft, organizationId, status: "DRAFT" })), skipDuplicates: true });
  const records = await prisma.learningFactoryDraft.findMany({ where: { organizationId, generatedFrom: { in: [...new Set(drafts.map((draft) => draft.generatedFrom))] } }, orderBy: [{ importance: "asc" }, { createdAt: "desc" }] });
  const payload: LearningFactoryGenerateResponse = { generated: created.count, skippedDuplicates: drafts.length - created.count, drafts: records.map(mapDraft) };
  response.status(201).json(payload);
});

learningFactoryRouter.get("/drafts", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  const query = z.object({ assetType: z.enum(assetTypes).optional(), status: z.enum(statuses).optional() }).parse(request.query);
  const drafts = await prisma.learningFactoryDraft.findMany({ where: { organizationId, assetType: query.assetType, status: query.status }, orderBy: [{ importance: "asc" }, { updatedAt: "desc" }], take: 100 });
  const payload: LearningFactoryDraftListResponse = { canManage: ["Owner", "Admin"].includes(role), canPublishSimulation: canPublishLearningFactorySimulation(role), drafts: drafts.map(mapDraft) };
  response.json(payload);
});

learningFactoryRouter.get("/drafts/:id", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const id = z.string().uuid().parse(request.params.id);
  const draft = await prisma.learningFactoryDraft.findFirst({ where: learningFactoryScope(id, organizationId) });
  if (!draft) throw new HttpError("Learning Factory draft not found", 404);
  response.json(mapDraft(draft));
});

learningFactoryRouter.post("/drafts/:id/publish-simulation", requireLearningFactorySimulationPublish, async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  const id = z.string().uuid().parse(request.params.id);
  const overrides = publishSimulationSchema.parse(request.body ?? {});
  const result = await publishLearningFactorySimulationDraft({ draftId: id, organizationId, userId: user.id, overrides });
  const payload: LearningFactoryPublishSimulationResponse = {
    draft: mapDraft(result.draft),
    simulation: mapSimulationDetail(result.simulation),
    alreadyPublished: result.alreadyPublished,
  };
  response.status(result.alreadyPublished ? 200 : 201).json(payload);
});

for (const action of ["approve", "reject"] as const) {
  learningFactoryRouter.post(`/drafts/:id/${action}`, requireLearningFactoryWrite, async (request, response) => {
    const { organizationId } = getWorkspaceRequest(request).workspace;
    const id = z.string().uuid().parse(request.params.id);
    const draft = await prisma.learningFactoryDraft.findFirst({ where: learningFactoryScope(id, organizationId) });
    if (!draft) throw new HttpError("Learning Factory draft not found", 404);
    let status: "APPROVED" | "REJECTED";
    try { status = reviewDraftTransition(draft.status, action); }
    catch { throw new HttpError("Published drafts cannot be changed", 409, "PUBLISHED_DRAFT_LOCKED"); }
    const updated = await prisma.learningFactoryDraft.update({ where: { id: draft.id }, data: { status } });
    response.json(mapDraft(updated));
  });
}
