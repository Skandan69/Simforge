import { Router } from "express";
import { z } from "zod";
import type { KnowledgeSearchResponse } from "@simforge/shared";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getWorkspaceRequest, requireWorkspace } from "../middleware/workspace.js";
import { documentSummary, knowledgeBaseSummary } from "../services/knowledge-mappers.js";

export const knowledgeSearchRouter = Router();
knowledgeSearchRouter.use(requireAuth, requireWorkspace);

knowledgeSearchRouter.get("/", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const { q } = z.object({ q: z.string().trim().min(1).max(120) }).parse(request.query);
  const [documents, knowledgeBases] = await Promise.all([
    prisma.document.findMany({
      where: {
        knowledgeBase: { organizationId },
        OR: [
          { fileName: { contains: q, mode: "insensitive" } },
          { knowledgeBase: { name: { contains: q, mode: "insensitive" } } },
          { knowledgeBase: { department: { contains: q, mode: "insensitive" } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        uploader: { select: { id: true, fullName: true, email: true } },
        knowledgeBase: { select: { id: true, name: true, department: true } },
      },
    }),
    prisma.knowledgeBase.findMany({
      where: {
        organizationId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { department: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        creator: { select: { id: true, fullName: true, email: true } },
        _count: { select: { documents: true } },
      },
    }),
  ]);
  const payload: KnowledgeSearchResponse = {
    query: q,
    documents: documents.map(documentSummary),
    knowledgeBases: knowledgeBases.map(knowledgeBaseSummary),
  };
  response.json(payload);
});
