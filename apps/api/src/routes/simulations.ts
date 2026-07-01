import { Router } from "express";
import { z } from "zod";
import {
  SIMULATION_DIFFICULTIES,
  SIMULATION_STATUSES,
  type SaveSimulationInput,
  type SimulationDashboardResponse,
  type SimulationDetail,
  type SimulationSummary,
} from "@simforge/shared";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { requireAuth } from "../middleware/auth.js";
import {
  getWorkspaceRequest,
  requireSimulationRead,
  requireSimulationWrite,
  requireWorkspace,
} from "../middleware/workspace.js";
import { archiveSimulationData, duplicateSimulationIdentity, scopedSimulationMutation, simulationRelations } from "../services/simulation-config.js";

const saveSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(2000),
  industry: z.string().trim().min(2).max(100),
  department: z.string().trim().min(2).max(100),
  jobRole: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(100),
  difficulty: z.enum(SIMULATION_DIFFICULTIES),
  status: z.enum(SIMULATION_STATUSES),
  estimatedMinutes: z.number().int().min(1).max(240),
  personaId: z.string().uuid().nullable().optional(),
  scenarioSetup: z.string().trim().min(10).max(10000),
  successCriteria: z.string().trim().min(5).max(5000),
  objectives: z.array(z.string().trim().min(2).max(300)).min(1).max(30),
  knowledgeBaseIds: z.array(z.string().uuid()).min(1).max(20),
  criterionIds: z.array(z.string().uuid()).min(1).max(30),
}) satisfies z.ZodType<SaveSimulationInput>;

const includeDetail = {
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
};

function summary(record: any): SimulationSummary {
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
    persona: record.persona
      ? {
          id: record.persona.id,
          name: record.persona.name,
          role: record.persona.role,
        }
      : null,
    objectiveCount: record._count.objectives,
    knowledgeBaseCount: record._count.knowledgeBases,
    criterionCount: record._count.evaluationCriteria,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
function detail(record: any, canEdit: boolean): SimulationDetail {
  return {
    ...summary(record),
    scenarioSetup: record.scenarioSetup,
    successCriteria: record.successCriteria,
    objectives: record.objectives,
    knowledgeBases: record.knowledgeBases.map((link: any) => ({
      id: link.knowledgeBase.id,
      name: link.knowledgeBase.name,
      department: link.knowledgeBase.department,
    })),
    evaluationCriteria: record.evaluationCriteria.map((link: any) => ({
      id: link.criterion.id,
      name: link.criterion.name,
      description: link.criterion.description,
      isDefault: link.criterion.isDefault,
      updatedAt: link.criterion.updatedAt.toISOString(),
    })),
    canEdit,
  };
}
async function validateLinks(
  input: SaveSimulationInput,
  organizationId: string,
) {
  const [personas, bases, criteria] = await Promise.all([
    input.personaId
      ? prisma.simulationPersona.count({
          where: { id: input.personaId, organizationId },
        })
      : 1,
    prisma.knowledgeBase.count({
      where: {
        id: { in: input.knowledgeBaseIds },
        organizationId,
        status: "Active",
      },
    }),
    prisma.simulationEvaluationCriterion.count({
      where: { id: { in: input.criterionIds }, organizationId },
    }),
  ]);
  if (
    !personas ||
    bases !== new Set(input.knowledgeBaseIds).size ||
    criteria !== new Set(input.criterionIds).size
  )
    throw new HttpError(
      "One or more selected resources are unavailable",
      400,
      "INVALID_SIMULATION_LINK",
    );
}
const nestedData = (input: SaveSimulationInput) => ({
  title: input.title,
  description: input.description,
  industry: input.industry,
  department: input.department,
  jobRole: input.jobRole,
  category: input.category,
  difficulty: input.difficulty,
  status: input.status,
  estimatedMinutes: input.estimatedMinutes,
  personaId: input.personaId ?? null,
  scenarioSetup: input.scenarioSetup,
  successCriteria: input.successCriteria,
});

export const simulationsRouter = Router();
simulationsRouter.use(requireAuth, requireWorkspace, requireSimulationRead);
simulationsRouter.get("/dashboard", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  const simulations = await prisma.simulation.findMany({
    where: { organizationId },
    include: includeDetail,
    orderBy: { updatedAt: "desc" },
  });
  const payload: SimulationDashboardResponse = {
    canEdit: ["Owner", "Admin", "Trainer"].includes(role),
    totals: {
      total: simulations.length,
      draft: simulations.filter((item) => item.status === "Draft").length,
      active: simulations.filter((item) => item.status === "Active").length,
      archived: simulations.filter((item) => item.status === "Archived").length,
    },
    simulations: simulations.map(summary),
  };
  response.json(payload);
});
simulationsRouter.get("/", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const query = z
    .object({
      department: z.string().max(100).optional(),
      difficulty: z.enum(SIMULATION_DIFFICULTIES).optional(),
      status: z.enum(SIMULATION_STATUSES).optional(),
      search: z.string().max(120).optional(),
    })
    .parse(request.query);
  const records = await prisma.simulation.findMany({
    where: {
      organizationId,
      department: query.department || undefined,
      difficulty: query.difficulty,
      status: query.status,
      OR: query.search
        ? [
            { title: { contains: query.search, mode: "insensitive" } },
            { description: { contains: query.search, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: includeDetail,
    orderBy: { updatedAt: "desc" },
  });
  response.json(records.map(summary));
});
simulationsRouter.post(
  "/",
  requireSimulationWrite,
  async (request, response) => {
    const { organizationId } = getWorkspaceRequest(request).workspace;
    const user = getWorkspaceRequest(request).authUser;
    const input = saveSchema.parse(request.body);
    await validateLinks(input, organizationId);
    const record = await prisma.simulation.create({
      data: {
        ...nestedData(input),
        organizationId,
        createdBy: user.id,
        ...simulationRelations(input),
        versions: { create: { version: 1, snapshot: input as any } },
      },
      include: includeDetail,
    });
    response.status(201).json(detail(record, true));
  },
);
simulationsRouter.get("/:id", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  const id = z.string().uuid().parse(request.params.id);
  const record = await prisma.simulation.findFirst({
    where: { id, organizationId },
    include: includeDetail,
  });
  if (!record) throw new HttpError("Simulation not found", 404);
  response.json(detail(record, ["Owner", "Admin", "Trainer"].includes(role)));
});
simulationsRouter.put(
  "/:id",
  requireSimulationWrite,
  async (request, response) => {
    const { organizationId } = getWorkspaceRequest(request).workspace;
    const id = z.string().uuid().parse(request.params.id);
    const input = saveSchema.parse(request.body);
    await validateLinks(input, organizationId);
    const existing = await prisma.simulation.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { versions: true } } },
    });
    if (!existing) throw new HttpError("Simulation not found", 404);
    const record = await prisma.$transaction(async (tx) => {
      await tx.simulationObjective.deleteMany({ where: { simulationId: id } });
      await tx.simulationKnowledgeBase.deleteMany({
        where: { simulationId: id },
      });
      await tx.simulationCriterionLink.deleteMany({
        where: { simulationId: id },
      });
      return tx.simulation.update({
        where: { id },
        data: {
          ...nestedData(input),
          ...simulationRelations(input),
          versions: {
            create: {
              version: existing._count.versions + 1,
              snapshot: input as any,
            },
          },
        },
        include: includeDetail,
      });
    });
    response.json(detail(record, true));
  },
);
simulationsRouter.post(
  "/:id/duplicate",
  requireSimulationWrite,
  async (request, response) => {
    const { organizationId } = getWorkspaceRequest(request).workspace;
    const user = getWorkspaceRequest(request).authUser;
    const id = z.string().uuid().parse(request.params.id);
    const source = await prisma.simulation.findFirst({
      where: { id, organizationId },
      include: includeDetail,
    });
    if (!source) throw new HttpError("Simulation not found", 404);
    const record = await prisma.simulation.create({
      data: {
        organizationId,
        createdBy: user.id,
        ...duplicateSimulationIdentity(source.title),
        description: source.description,
        industry: source.industry,
        department: source.department,
        jobRole: source.jobRole,
        category: source.category,
        difficulty: source.difficulty,
        estimatedMinutes: source.estimatedMinutes,
        personaId: source.personaId,
        scenarioSetup: source.scenarioSetup,
        successCriteria: source.successCriteria,
        objectives: {
          create: source.objectives.map((item) => ({
            title: item.title,
            sortOrder: item.sortOrder,
          })),
        },
        knowledgeBases: {
          create: source.knowledgeBases.map((item) => ({
            knowledgeBaseId: item.knowledgeBaseId,
          })),
        },
        evaluationCriteria: {
          create: source.evaluationCriteria.map((item) => ({
            criterionId: item.criterionId,
          })),
        },
        versions: {
          create: { version: 1, snapshot: { duplicatedFrom: source.id } },
        },
      },
      include: includeDetail,
    });
    response.status(201).json(detail(record, true));
  },
);
simulationsRouter.post(
  "/:id/archive",
  requireSimulationWrite,
  async (request, response) => {
    const { organizationId } = getWorkspaceRequest(request).workspace;
    const id = z.string().uuid().parse(request.params.id);
  const result = await prisma.simulation.updateMany({
    ...scopedSimulationMutation(id, organizationId),
    data: archiveSimulationData,
    });
    if (!result.count) throw new HttpError("Simulation not found", 404);
    response.json({ status: "Archived" });
  },
);
simulationsRouter.delete(
  "/:id",
  requireSimulationWrite,
  async (request, response) => {
    const { organizationId } = getWorkspaceRequest(request).workspace;
    const id = z.string().uuid().parse(request.params.id);
  const result = await prisma.simulation.deleteMany({
    ...scopedSimulationMutation(id, organizationId),
    });
    if (!result.count) throw new HttpError("Simulation not found", 404);
    response.status(204).send();
  },
);
simulationsRouter.post(
  "/:id/knowledge-bases/:knowledgeBaseId",
  requireSimulationWrite,
  async (request, response) => {
    const { organizationId } = getWorkspaceRequest(request).workspace;
    const id = z.string().uuid().parse(request.params.id);
    const knowledgeBaseId = z
      .string()
      .uuid()
      .parse(request.params.knowledgeBaseId);
    const [simulation, base] = await Promise.all([
      prisma.simulation.count({ where: { id, organizationId } }),
      prisma.knowledgeBase.count({
        where: { id: knowledgeBaseId, organizationId },
      }),
    ]);
    if (!simulation || !base)
      throw new HttpError("Simulation or knowledge base not found", 404);
    await prisma.simulationKnowledgeBase.upsert({
      where: {
        simulationId_knowledgeBaseId: { simulationId: id, knowledgeBaseId },
      },
      create: { simulationId: id, knowledgeBaseId },
      update: {},
    });
    response.status(204).send();
  },
);
simulationsRouter.delete(
  "/:id/knowledge-bases/:knowledgeBaseId",
  requireSimulationWrite,
  async (request, response) => {
    const { organizationId } = getWorkspaceRequest(request).workspace;
    const id = z.string().uuid().parse(request.params.id);
    const knowledgeBaseId = z
      .string()
      .uuid()
      .parse(request.params.knowledgeBaseId);
    const simulation = await prisma.simulation.count({
      where: { id, organizationId },
    });
    if (!simulation) throw new HttpError("Simulation not found", 404);
    await prisma.simulationKnowledgeBase.deleteMany({
      where: { simulationId: id, knowledgeBaseId },
    });
    response.status(204).send();
  },
);

export const simulationPersonasRouter = Router();
simulationPersonasRouter.use(
  requireAuth,
  requireWorkspace,
  requireSimulationRead,
);
simulationPersonasRouter.get("/", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  response.json(
    await prisma.simulationPersona.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
    }),
  );
});
simulationPersonasRouter.post(
  "/",
  requireSimulationWrite,
  async (request, response) => {
    const { organizationId } = getWorkspaceRequest(request).workspace;
    const user = getWorkspaceRequest(request).authUser;
  const input = z
      .object({
        name: z.string().trim().min(2).max(120),
        role: z.string().trim().min(2).max(120),
        personality: z.string().trim().min(2).max(500),
        tone: z.string().trim().min(2).max(200),
        difficultyBehavior: z.string().trim().min(2).max(2000),
        backgroundContext: z.string().trim().min(2).max(5000),
    })
    .parse(request.body);
  const duplicate = await prisma.simulationPersona.count({ where: { organizationId, name: { equals: input.name, mode: "insensitive" } } });
  if (duplicate) throw new HttpError("A persona with this name already exists", 409, "DUPLICATE_PERSONA");
  const record = await prisma.simulationPersona.create({
      data: { ...input, organizationId, createdBy: user.id },
    });
    response.status(201).json(record);
  },
);

export const simulationCriteriaRouter = Router();
simulationCriteriaRouter.use(
  requireAuth,
  requireWorkspace,
  requireSimulationRead,
);
simulationCriteriaRouter.get("/", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  response.json(
    await prisma.simulationEvaluationCriterion.findMany({
      where: { organizationId },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
  );
});
simulationCriteriaRouter.post(
  "/",
  requireSimulationWrite,
  async (request, response) => {
    const { organizationId } = getWorkspaceRequest(request).workspace;
    const user = getWorkspaceRequest(request).authUser;
  const input = z
      .object({
        name: z.string().trim().min(2).max(120),
        description: z.string().trim().min(2).max(1000),
    })
    .parse(request.body);
  const duplicate = await prisma.simulationEvaluationCriterion.count({ where: { organizationId, name: { equals: input.name, mode: "insensitive" } } });
  if (duplicate) throw new HttpError("An evaluation criterion with this name already exists", 409, "DUPLICATE_CRITERION");
  const record = await prisma.simulationEvaluationCriterion.create({
      data: { ...input, organizationId, createdBy: user.id },
    });
    response.status(201).json(record);
  },
);
