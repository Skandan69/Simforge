import { Router } from "express";
import { z } from "zod";
import type { ProcessingDashboardResponse, ProcessingSourceDetail } from "@simforge/shared";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { requireAuth } from "../middleware/auth.js";
import { getWorkspaceRequest, requireKnowledgeWrite, requireWorkspace } from "../middleware/workspace.js";
import { processingEngine } from "../processing/engine.js";

export const processingRouter = Router();
processingRouter.use(requireAuth, requireWorkspace);
const idOf = (value: unknown) => z.string().uuid().parse(value);

async function sourceForDocument(documentId: string, organizationId: string) {
  const source = await prisma.knowledgeSource.findFirst({ where: { documentId, organizationId } });
  if (!source) throw new HttpError("Processing source not found", 404);
  return source;
}
function mapSource(source: any): ProcessingSourceDetail {
  const job = source.jobs?.[0];
  return { sourceId: source.id, documentId: source.documentId, title: source.title, fileType: source.sourceType, sizeBytes: Number(source.sizeBytes ?? 0), status: source.status, progress: source.progress, failureReason: source.failureReason, processedAt: source.processedAt?.toISOString() ?? null, pageCount: source.pageCount, wordCount: source.wordCount, characterCount: source.characterCount, estimatedTokens: source.estimatedTokens, language: source.language, processingDurationMs: source.processingDurationMs, chunkCount: source._count?.chunks ?? 0, latestJob: job ? { id: job.id, retryCount: job.retryCount, maxAttempts: job.maxAttempts, queuedAt: job.queuedAt.toISOString(), startedAt: job.startedAt?.toISOString() ?? null } : null };
}
const detailInclude = { jobs: { orderBy: { createdAt: "desc" as const }, take: 1 }, _count: { select: { chunks: true } } };

processingRouter.post("/documents/:documentId/queue", requireKnowledgeWrite, async (request, response) => { const { organizationId } = getWorkspaceRequest(request).workspace; try { const job = await processingEngine.queue(idOf(request.params.documentId), organizationId); response.status(202).json(job); } catch (error) { throw new HttpError(error instanceof Error ? error.message : "Unable to queue source", 400); } });
processingRouter.post("/documents/:documentId/reprocess", requireKnowledgeWrite, async (request, response) => { const { organizationId } = getWorkspaceRequest(request).workspace; try { const job = await processingEngine.reprocess(idOf(request.params.documentId), organizationId); response.status(202).json(job); } catch (error) { throw new HttpError(error instanceof Error ? error.message : "Unable to reprocess source", 409); } });
processingRouter.post("/documents/:documentId/retry", requireKnowledgeWrite, async (request, response) => { const { organizationId } = getWorkspaceRequest(request).workspace; const source = await sourceForDocument(idOf(request.params.documentId), organizationId); try { const job = await processingEngine.retry(source.id); await prisma.knowledgeSource.update({ where: { id: source.id }, data: { status: "Queued", progress: 5, failureReason: null } }); response.status(202).json(job); } catch (error) { throw new HttpError(error instanceof Error ? error.message : "Unable to retry source", 409); } });
processingRouter.post("/documents/:documentId/cancel", requireKnowledgeWrite, async (request, response) => { const { organizationId } = getWorkspaceRequest(request).workspace; const source = await sourceForDocument(idOf(request.params.documentId), organizationId); try { await processingEngine.cancel(source.id); response.status(202).json({ status: "cancellation-requested" }); } catch (error) { throw new HttpError(error instanceof Error ? error.message : "Unable to cancel source", 409); } });
processingRouter.get("/documents/:documentId/status", async (request, response) => { const { organizationId } = getWorkspaceRequest(request).workspace; const source = await prisma.knowledgeSource.findFirst({ where: { documentId: idOf(request.params.documentId), organizationId }, include: detailInclude }); if (!source) throw new HttpError("Processing source not found", 404); response.json(mapSource(source)); });
processingRouter.get("/documents/:documentId/text", async (request, response) => { const { organizationId } = getWorkspaceRequest(request).workspace; const source = await sourceForDocument(idOf(request.params.documentId), organizationId); if (source.status !== "Completed") throw new HttpError("Extracted text is not available", 409); response.json({ sourceId: source.id, text: source.extractedText }); });
processingRouter.get("/documents/:documentId/chunks", async (request, response) => { const { organizationId } = getWorkspaceRequest(request).workspace; const source = await sourceForDocument(idOf(request.params.documentId), organizationId); const chunks = await prisma.knowledgeChunk.findMany({ where: { sourceId: source.id }, orderBy: { chunkNumber: "asc" } }); response.json(chunks); });
processingRouter.get("/documents/:documentId/logs", async (request, response) => { const { organizationId } = getWorkspaceRequest(request).workspace; const source = await sourceForDocument(idOf(request.params.documentId), organizationId); const logs = await prisma.processingLog.findMany({ where: { sourceId: source.id }, orderBy: { createdAt: "desc" }, take: 100 }); response.json(logs); });
processingRouter.get("/dashboard", async (request, response) => { const { organizationId } = getWorkspaceRequest(request).workspace; const sources = await prisma.knowledgeSource.findMany({ where: { organizationId }, include: detailInclude, orderBy: { updatedAt: "desc" }, take: 20 }); const grouped = await prisma.knowledgeSource.groupBy({ by: ["status"], where: { organizationId }, _count: true }); const aggregate = await prisma.knowledgeSource.aggregate({ where: { organizationId, status: "Completed" }, _avg: { processingDurationMs: true } }); const totals = { Uploaded: 0, Queued: 0, Processing: 0, Completed: 0, Failed: 0, Cancelled: 0 }; grouped.forEach((row) => { totals[row.status] = row._count; }); const payload: ProcessingDashboardResponse = { totals, averageProcessingTimeMs: Math.round(aggregate._avg.processingDurationMs ?? 0), recent: sources.map(mapSource) }; response.json(payload); });
