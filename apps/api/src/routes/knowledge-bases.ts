import { Router } from "express";
import { z } from "zod";
import type { CreateKnowledgeBaseInput, KnowledgeDashboardResponse, UpdateKnowledgeBaseInput } from "@simforge/shared";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { requireAuth } from "../middleware/auth.js";
import { getWorkspaceRequest, requireKnowledgeWrite, requireWorkspace } from "../middleware/workspace.js";
import { knowledgeBaseSummary } from "../services/knowledge-mappers.js";
import { removeKnowledgeFiles } from "../services/storage.js";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(1000),
  department: z.string().trim().min(2).max(100),
}) satisfies z.ZodType<CreateKnowledgeBaseInput>;

const updateSchema = createSchema.partial().extend({
  status: z.enum(["Active", "Archived"]).optional(),
}) satisfies z.ZodType<UpdateKnowledgeBaseInput>;

const includeSummary = {
  creator: { select: { id: true, fullName: true, email: true } },
  _count: { select: { documents: true } },
} as const;

export const knowledgeBasesRouter = Router();
knowledgeBasesRouter.use(requireAuth, requireWorkspace);

knowledgeBasesRouter.get("/dashboard", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  const [knowledgeBases, totalDocuments, storage] = await Promise.all([
    prisma.knowledgeBase.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      include: includeSummary,
    }),
    prisma.document.count({ where: { knowledgeBase: { organizationId } } }),
    prisma.document.aggregate({ where: { knowledgeBase: { organizationId } }, _sum: { sizeBytes: true } }),
  ]);

  const payload: KnowledgeDashboardResponse = {
    canEdit: ["Owner", "Admin", "Trainer"].includes(role),
    role,
    totals: {
      knowledgeBases: knowledgeBases.length,
      activeKnowledgeBases: knowledgeBases.filter((item) => item.status === "Active").length,
      documents: totalDocuments,
      storageBytes: Number(storage._sum.sizeBytes ?? 0n),
    },
    knowledgeBases: knowledgeBases.map(knowledgeBaseSummary),
  };
  response.json(payload);
});

knowledgeBasesRouter.get("/", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const query = z.object({
    search: z.string().trim().max(120).optional(),
    department: z.string().trim().max(100).optional(),
    status: z.enum(["Active", "Archived"]).optional(),
  }).parse(request.query);

  const knowledgeBases = await prisma.knowledgeBase.findMany({
    where: {
      organizationId,
      status: query.status,
      department: query.department || undefined,
      OR: query.search ? [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ] : undefined,
    },
    orderBy: { updatedAt: "desc" },
    include: includeSummary,
  });
  response.json(knowledgeBases.map(knowledgeBaseSummary));
});

knowledgeBasesRouter.post("/", requireKnowledgeWrite, async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  const input = createSchema.parse(request.body);
  const duplicate = await prisma.knowledgeBase.findFirst({
    where: { organizationId, name: { equals: input.name, mode: "insensitive" } },
  });
  if (duplicate) throw new HttpError("A knowledge base with this name already exists", 409, "DUPLICATE_NAME");

  const created = await prisma.knowledgeBase.create({
    data: { ...input, organizationId, createdBy: user.id },
    include: includeSummary,
  });
  response.status(201).json(knowledgeBaseSummary(created));
});

knowledgeBasesRouter.get("/:id", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const id = z.string().uuid().parse(request.params.id);
  const knowledgeBase = await prisma.knowledgeBase.findFirst({
    where: { id, organizationId },
    include: includeSummary,
  });
  if (!knowledgeBase) throw new HttpError("Knowledge base not found", 404);
  response.json({ ...knowledgeBaseSummary(knowledgeBase), organizationId });
});

knowledgeBasesRouter.put("/:id", requireKnowledgeWrite, async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const id = z.string().uuid().parse(request.params.id);
  const input = updateSchema.parse(request.body);
  const existing = await prisma.knowledgeBase.findFirst({ where: { id, organizationId } });
  if (!existing) throw new HttpError("Knowledge base not found", 404);
  if (input.name) {
    const duplicate = await prisma.knowledgeBase.findFirst({
      where: { organizationId, id: { not: existing.id }, name: { equals: input.name, mode: "insensitive" } },
    });
    if (duplicate) throw new HttpError("A knowledge base with this name already exists", 409, "DUPLICATE_NAME");
  }
  const updated = await prisma.knowledgeBase.update({
    where: { id: existing.id },
    data: input,
    include: includeSummary,
  });
  response.json(knowledgeBaseSummary(updated));
});

knowledgeBasesRouter.delete("/:id", requireKnowledgeWrite, async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const id = z.string().uuid().parse(request.params.id);
  const existing = await prisma.knowledgeBase.findFirst({
    where: { id, organizationId },
    include: { documents: { include: { versions: { select: { storagePath: true } } } } },
  });
  if (!existing) throw new HttpError("Knowledge base not found", 404);
  await removeKnowledgeFiles(existing.documents.flatMap((document) => [document.storagePath, ...document.versions.map((version) => version.storagePath)]));
  await prisma.knowledgeBase.delete({ where: { id: existing.id } });
  response.status(204).send();
});
