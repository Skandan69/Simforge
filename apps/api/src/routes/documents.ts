import { Router } from "express";
import { z } from "zod";
import {
  DOCUMENT_FILE_TYPES,
  DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  type CreateDocumentInput,
  type UpdateDocumentInput,
} from "@simforge/shared";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { requireAuth } from "../middleware/auth.js";
import { getWorkspaceRequest, requireKnowledgeWrite, requireWorkspace } from "../middleware/workspace.js";
import { documentDetail, documentSummary, versionSummary } from "../services/knowledge-mappers.js";
import { removeKnowledgeFiles } from "../services/storage.js";
import { processingEngine } from "../processing/engine.js";

const metadataSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileType: z.enum(DOCUMENT_FILE_TYPES),
  mimeType: z.string().trim().min(1).max(150),
  sizeBytes: z.number().int().positive().max(MAX_DOCUMENT_SIZE_BYTES),
  storagePath: z.string().trim().min(10).max(600),
  notes: z.string().trim().max(4000).optional(),
}).superRefine((value, context) => {
  if (DOCUMENT_MIME_TYPES[value.fileType] !== value.mimeType) {
    context.addIssue({ code: "custom", path: ["mimeType"], message: "File type and MIME type do not match" });
  }
}) satisfies z.ZodType<CreateDocumentInput>;

const updateSchema = z.object({
  fileName: z.string().trim().min(1).max(255).optional(),
  notes: z.string().trim().max(4000).optional(),
  status: z.enum(["Ready", "Archived", "Failed"]).optional(),
}) satisfies z.ZodType<UpdateDocumentInput>;

const includeDocument = {
  uploader: { select: { id: true, fullName: true, email: true } },
  knowledgeBase: { select: { id: true, name: true, department: true } },
  knowledgeSource: { select: { id: true, status: true, progress: true, failureReason: true, processedAt: true } },
} as const;

const includeVersion = {
  uploader: { select: { id: true, fullName: true, email: true } },
} as const;

function validateStoragePath(path: string, organizationId: string, knowledgeBaseId: string) {
  if (!path.startsWith(`${organizationId}/${knowledgeBaseId}/`) || path.includes("..")) {
    throw new HttpError("Invalid document storage path", 400, "INVALID_STORAGE_PATH");
  }
}

export const documentsRouter = Router();
documentsRouter.use(requireAuth, requireWorkspace);

documentsRouter.get("/", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const query = z.object({
    search: z.string().trim().max(120).optional(),
    knowledgeBaseId: z.string().uuid().optional(),
    department: z.string().trim().max(100).optional(),
    status: z.enum(["Ready", "Archived", "Failed"]).optional(),
  }).parse(request.query);
  const documents = await prisma.document.findMany({
    where: {
      knowledgeBaseId: query.knowledgeBaseId,
      status: query.status,
      knowledgeBase: { organizationId, department: query.department || undefined },
      fileName: query.search ? { contains: query.search, mode: "insensitive" } : undefined,
    },
    orderBy: { updatedAt: "desc" },
    include: includeDocument,
  });
  response.json(documents.map(documentSummary));
});

documentsRouter.post("/", requireKnowledgeWrite, async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  const input = metadataSchema.extend({ knowledgeBaseId: z.string().uuid() }).parse(request.body);
  const knowledgeBase = await prisma.knowledgeBase.findFirst({
    where: { id: input.knowledgeBaseId, organizationId, status: "Active" },
  });
  if (!knowledgeBase) throw new HttpError("Active knowledge base not found", 404);
  validateStoragePath(input.storagePath, organizationId, knowledgeBase.id);

  const document = await prisma.document.create({
    data: {
      knowledgeBaseId: knowledgeBase.id,
      fileName: input.fileName,
      fileType: input.fileType,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storagePath: input.storagePath,
      uploadedBy: user.id,
      notes: input.notes ?? "",
      versions: {
        create: {
          version: 1,
          fileName: input.fileName,
          fileType: input.fileType,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          storagePath: input.storagePath,
          uploadedBy: user.id,
          notes: input.notes ?? "Initial upload",
        },
      },
    },
    include: includeDocument,
  });
  await processingEngine.queue(document.id, organizationId);
  response.status(201).json(documentSummary(document));
});

documentsRouter.get("/:id", async (request, response) => {
  const { organizationId, role } = getWorkspaceRequest(request).workspace;
  const id = z.string().uuid().parse(request.params.id);
  const document = await prisma.document.findFirst({
    where: { id, knowledgeBase: { organizationId } },
    include: {
      ...includeDocument,
      versions: { orderBy: { version: "desc" }, include: includeVersion },
    },
  });
  if (!document) throw new HttpError("Document not found", 404);
  response.json(documentDetail(document, ["Owner", "Admin", "Trainer"].includes(role)));
});

documentsRouter.put("/:id", requireKnowledgeWrite, async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const id = z.string().uuid().parse(request.params.id);
  const input = updateSchema.parse(request.body);
  const existing = await prisma.document.findFirst({
    where: { id, knowledgeBase: { organizationId } },
  });
  if (!existing) throw new HttpError("Document not found", 404);
  const updated = await prisma.document.update({ where: { id: existing.id }, data: input, include: includeDocument });
  response.json(documentSummary(updated));
});

documentsRouter.delete("/:id", requireKnowledgeWrite, async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const id = z.string().uuid().parse(request.params.id);
  const existing = await prisma.document.findFirst({
    where: { id, knowledgeBase: { organizationId } },
    include: { versions: { select: { storagePath: true } } },
  });
  if (!existing) throw new HttpError("Document not found", 404);
  await removeKnowledgeFiles([existing.storagePath, ...existing.versions.map((version) => version.storagePath)]);
  await prisma.document.delete({ where: { id: existing.id } });
  response.status(204).send();
});

documentsRouter.get("/:id/versions", async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const id = z.string().uuid().parse(request.params.id);
  const document = await prisma.document.findFirst({ where: { id, knowledgeBase: { organizationId } } });
  if (!document) throw new HttpError("Document not found", 404);
  const versions = await prisma.documentVersion.findMany({
    where: { documentId: document.id },
    orderBy: { version: "desc" },
    include: includeVersion,
  });
  response.json(versions.map(versionSummary));
});

documentsRouter.post("/:id/versions", requireKnowledgeWrite, async (request, response) => {
  const { organizationId } = getWorkspaceRequest(request).workspace;
  const user = getWorkspaceRequest(request).authUser;
  const id = z.string().uuid().parse(request.params.id);
  const input = metadataSchema.parse(request.body);
  const existing = await prisma.document.findFirst({
    where: { id, knowledgeBase: { organizationId } },
    include: { knowledgeBase: { select: { id: true } } },
  });
  if (!existing) throw new HttpError("Document not found", 404);
  validateStoragePath(input.storagePath, organizationId, existing.knowledgeBase.id);
  const nextVersion = existing.currentVersion + 1;
  const updated = await prisma.document.update({
    where: { id: existing.id },
    data: {
      fileName: input.fileName,
      fileType: input.fileType,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storagePath: input.storagePath,
      uploadedBy: user.id,
      uploadedAt: new Date(),
      currentVersion: nextVersion,
      status: "Ready",
      notes: input.notes ?? existing.notes,
      versions: {
        create: {
          version: nextVersion,
          fileName: input.fileName,
          fileType: input.fileType,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          storagePath: input.storagePath,
          uploadedBy: user.id,
          notes: input.notes ?? `Version ${nextVersion}`,
        },
      },
    },
    include: {
      ...includeDocument,
      versions: { orderBy: { version: "desc" }, include: includeVersion },
    },
  });
  await processingEngine.reprocess(updated.id, organizationId);
  response.status(201).json(documentDetail(updated, true));
});
