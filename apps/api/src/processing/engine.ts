import type { DocumentFileType } from "@simforge/shared";
import { prisma } from "../lib/prisma.js";
import { downloadKnowledgeFile } from "../services/storage.js";
import { analyzeKnowledge } from "../knowledge-intelligence/service.js";
import { chunkBlocks, estimateTokens } from "./chunker.js";
import { detectLanguage, getExtractor } from "./extractors.js";
import { embedKnowledgeChunks } from "../knowledge-retrieval/embeddings.js";
import type { ExtractedBlock } from "./types.js";

const words = (text: string) => text.trim() ? text.trim().split(/\s+/u).length : 0;

export class KnowledgeProcessingEngine {
  async queue(documentId: string, organizationId: string) {
    const document = await prisma.document.findFirst({ where: { id: documentId, knowledgeBase: { organizationId } }, include: { knowledgeSource: true } });
    if (!document) throw new Error("Document not found");
    let source = document.knowledgeSource;
    if (!source) source = await prisma.knowledgeSource.create({ data: { organizationId, documentId: document.id, sourceType: document.fileType, title: document.fileName.replace(/\.[^.]+$/, ""), mimeType: document.mimeType, sizeBytes: document.sizeBytes } });
    const active = await prisma.processingJob.findFirst({ where: { sourceId: source.id, status: { in: ["Queued", "Processing"] } } });
    if (active) return active;
    const job = await prisma.processingJob.create({ data: { sourceId: source.id, status: "Queued", progress: 5 } });
    await prisma.knowledgeSource.update({ where: { id: source.id }, data: { status: "Queued", progress: 5, failureReason: null } });
    await this.log(source.id, job.id, "queued", "Source queued for processing");
    return job;
  }

  async processNext() {
    const candidate = await prisma.processingJob.findFirst({ where: { status: "Queued" }, orderBy: { queuedAt: "asc" } });
    if (!candidate) return false;
    const claimed = await prisma.processingJob.updateMany({ where: { id: candidate.id, status: "Queued" }, data: { status: "Processing", progress: 10, startedAt: new Date(), lastAttemptAt: new Date(), attempt: { increment: 1 } } });
    if (!claimed.count) return false;
    await this.process(candidate.id); return true;
  }

  async process(jobId: string) {
    const started = Date.now();
    const job = await prisma.processingJob.findUnique({ where: { id: jobId }, include: { source: { include: { document: true } } } });
    if (!job) return;
    if (!job.source.document) {
      // The document was deleted after queueing. Close the job instead of leaving it "Processing" forever.
      await prisma.processingJob.update({ where: { id: job.id }, data: { status: "Failed", progress: 0, failureReason: "SOURCE_MISSING", errorMessage: "Processable document source not found", durationMs: Date.now() - started } });
      return;
    }
    const { source } = job; const document = source.document!;
    try {
      await this.progress(job.id, source.id, 15);
      const buffer = await downloadKnowledgeFile(document.storagePath);
      const extractor = getExtractor(document.fileType as DocumentFileType); extractor.validate(buffer);
      await this.assertNotCancelled(job.id); await this.progress(job.id, source.id, 35);
      const extracted = await extractor.extract(buffer); const text = extracted.text.trim();
      if (!text) throw new Error("No extractable text was found in this source");
      await this.assertNotCancelled(job.id); await this.progress(job.id, source.id, 70);
      const documentVersion = document.currentVersion;
      const blocks = extracted.blocks?.length ? extracted.blocks : text.split(/\n\s*\n/u).map((value, index): ExtractedBlock => ({ text: value.trim(), blockType: "paragraph", headingPath: [], order: index + 1 })).filter((block) => block.text);
      const chunks = chunkBlocks(blocks, { documentVersion });
      const intelligenceSections = analyzeKnowledge(text);
      const duration = Date.now() - started;
      await prisma.$transaction([
        // Replace every chunk of this version (including ACTIVE ones from an earlier run);
        // otherwise createMany collides with @@unique([sourceId, documentVersion, chunkNumber]) on reprocess.
        prisma.knowledgeChunk.deleteMany({ where: { sourceId: source.id, documentVersion } }),
        prisma.knowledgeIntelligenceSection.deleteMany({ where: { sourceId: source.id } }),
        prisma.knowledgeChunk.createMany({ data: chunks.map((chunk) => ({ ...chunk, sourceId: source.id, documentId: document.id, documentVersion, status: "PROCESSING", headingPath: chunk.headingPath ?? undefined, metadata: { ...chunk.metadata, documentVersion, sourceType: source.sourceType, fileName: document.fileName } })) }),
        prisma.knowledgeIntelligenceSection.createMany({ data: intelligenceSections.map((section) => ({ ...section, sourceId: source.id })) }),
        prisma.knowledgeSource.update({ where: { id: source.id }, data: { title: extracted.title ?? source.title, status: "Processing", progress: 85, extractedText: text, pageCount: extracted.unitCount, wordCount: words(text), characterCount: text.length, estimatedTokens: estimateTokens(text), language: detectLanguage(text), processingDurationMs: duration, processedAt: new Date(), failureReason: null } }),
      ]);
      const createdChunks = await prisma.knowledgeChunk.findMany({ where: { sourceId: source.id, documentVersion, status: "PROCESSING" }, select: { id: true, text: true, contentHash: true } });
      const embeddingResult = await embedKnowledgeChunks(createdChunks);
      await this.assertNotCancelled(job.id); await this.progress(job.id, source.id, 95);
      const completedAt = new Date();
      await prisma.$transaction([
        prisma.documentVersion.updateMany({ where: { documentId: document.id, version: { not: documentVersion }, retrievalStatus: "ACTIVE" }, data: { retrievalStatus: "SUPERSEDED" } }),
        prisma.knowledgeChunk.updateMany({ where: { documentId: document.id, documentVersion: { not: documentVersion }, status: "ACTIVE" }, data: { status: "SUPERSEDED" } }),
        prisma.documentVersion.updateMany({ where: { documentId: document.id, version: documentVersion }, data: { retrievalStatus: "ACTIVE", processedAt: completedAt, retrievalReadyAt: completedAt, failureReason: null, failedAt: null } }),
        prisma.knowledgeChunk.updateMany({ where: { sourceId: source.id, documentVersion, status: "PROCESSING" }, data: { status: "ACTIVE" } }),
        prisma.document.update({ where: { id: document.id }, data: { retrievalVersion: documentVersion } }),
        prisma.knowledgeSource.update({ where: { id: source.id }, data: { status: "Completed", progress: 100, processingDurationMs: Date.now() - started, processedAt: completedAt, failureReason: null } }),
        prisma.processingJob.update({ where: { id: job.id }, data: { status: "Completed", progress: 100, completedAt, durationMs: Date.now() - started, failureReason: null, errorMessage: null } }),
      ]);
      if (!embeddingResult.providerConfigured) await this.log(source.id, job.id, "embedding-skipped", "Embedding provider unavailable; lexical retrieval fallback active", "Warning");
      await this.log(source.id, job.id, "completed", `Processing completed with ${chunks.length} chunks and ${intelligenceSections.length} intelligence suggestions`);
    } catch (error) {
      const cancelled = error instanceof Error && error.message === "PROCESSING_CANCELLED"; const message = error instanceof Error ? error.message : "Unknown processing failure";
      const status = cancelled ? "Cancelled" : "Failed"; const duration = Date.now() - started;
      await prisma.$transaction([
        prisma.knowledgeSource.update({ where: { id: source.id }, data: { status, progress: 0, failureReason: cancelled ? null : message, processingDurationMs: duration } }),
        prisma.documentVersion.updateMany({ where: { documentId: document.id, version: document.currentVersion }, data: { retrievalStatus: cancelled ? "ARCHIVED" : "FAILED", failedAt: cancelled ? undefined : new Date(), failureReason: cancelled ? null : message } }),
        prisma.knowledgeChunk.updateMany({ where: { sourceId: source.id, documentVersion: document.currentVersion, status: "PROCESSING" }, data: { status: cancelled ? "ARCHIVED" : "FAILED" } }),
        prisma.processingJob.update({ where: { id: job.id }, data: { status, progress: 0, cancelledAt: cancelled ? new Date() : undefined, failureReason: cancelled ? null : "PROCESSING_ERROR", errorMessage: cancelled ? null : message, durationMs: duration } }),
      ]);
      await this.log(source.id, job.id, cancelled ? "cancelled" : "failed", cancelled ? "Processing cancelled" : message, cancelled ? "Info" : "Error");
    }
  }

  async retry(sourceId: string) {
    const failed = await prisma.processingJob.findFirst({ where: { sourceId, status: "Failed" }, orderBy: { createdAt: "desc" } });
    if (!failed || failed.attempt >= failed.maxAttempts) throw new Error("No retryable processing job found");
    return prisma.processingJob.update({ where: { id: failed.id }, data: { status: "Queued", progress: 5, retryCount: { increment: 1 }, queuedAt: new Date(), failureReason: null, errorMessage: null } });
  }
  async cancel(sourceId: string) {
    const job = await prisma.processingJob.findFirst({ where: { sourceId, status: { in: ["Queued", "Processing"] } }, orderBy: { createdAt: "desc" } }); if (!job) throw new Error("No active processing job found");
    if (job.status === "Queued") { await prisma.processingJob.update({ where: { id: job.id }, data: { status: "Cancelled", progress: 0, cancelledAt: new Date() } }); await prisma.knowledgeSource.update({ where: { id: sourceId }, data: { status: "Cancelled", progress: 0 } }); }
    else await prisma.processingJob.update({ where: { id: job.id }, data: { cancelRequestedAt: new Date() } });
  }
  async reprocess(documentId: string, organizationId: string) { const source = await prisma.knowledgeSource.findFirst({ where: { documentId, organizationId } }); if (source) { const active = await prisma.processingJob.count({ where: { sourceId: source.id, status: { in: ["Queued", "Processing"] } } }); if (active) throw new Error("Source is already processing"); } return this.queue(documentId, organizationId); }

  async hasActiveJob(documentId: string) {
    const active = await prisma.processingJob.count({ where: { source: { documentId }, status: { in: ["Queued", "Processing"] } } });
    return active > 0;
  }

  /**
   * Recovers jobs orphaned by a crash or deploy. A job that has been "Processing"
   * without any progress update (updatedAt) for longer than staleAfterMs is
   * re-queued, or failed once it has used all its attempts.
   */
  async recoverStaleJobs(staleAfterMs: number, now = new Date()) {
    const cutoff = new Date(now.getTime() - staleAfterMs);
    const stale = await prisma.processingJob.findMany({ where: { status: "Processing", updatedAt: { lt: cutoff } }, select: { id: true, sourceId: true, attempt: true, maxAttempts: true }, take: 50 });
    let requeued = 0; let failed = 0;
    for (const job of stale) {
      const exhausted = job.attempt >= job.maxAttempts;
      // Compare-and-set on updatedAt so a job that just reported progress is left alone.
      const updated = await prisma.processingJob.updateMany({
        where: { id: job.id, status: "Processing", updatedAt: { lt: cutoff } },
        data: exhausted
          ? { status: "Failed", progress: 0, failureReason: "PROCESSING_TIMEOUT", errorMessage: "Processing stopped unexpectedly (worker restart or timeout)" }
          : { status: "Queued", progress: 5, queuedAt: new Date(), cancelRequestedAt: null },
      });
      if (!updated.count) continue;
      if (exhausted) failed += 1; else requeued += 1;
      await prisma.knowledgeSource.update({ where: { id: job.sourceId }, data: exhausted ? { status: "Failed", progress: 0, failureReason: "Processing stopped unexpectedly. Retry or reprocess the document." } : { status: "Queued", progress: 5, failureReason: null } });
      await this.log(job.sourceId, job.id, exhausted ? "failed" : "recovered", exhausted ? "Processing timed out after all attempts" : "Stale processing job re-queued after worker interruption", exhausted ? "Error" : "Warning");
    }
    return { requeued, failed };
  }
  private async assertNotCancelled(jobId: string) { const job = await prisma.processingJob.findUnique({ where: { id: jobId }, select: { cancelRequestedAt: true } }); if (job?.cancelRequestedAt) throw new Error("PROCESSING_CANCELLED"); }
  private async progress(jobId: string, sourceId: string, progress: number) { await prisma.$transaction([prisma.processingJob.update({ where: { id: jobId }, data: { progress } }), prisma.knowledgeSource.update({ where: { id: sourceId }, data: { status: "Processing", progress } })]); }
  private async log(sourceId: string, jobId: string, event: string, message: string, level: "Info" | "Warning" | "Error" = "Info") { await prisma.processingLog.create({ data: { sourceId, jobId, event, message, level } }); }
}

export const processingEngine = new KnowledgeProcessingEngine();
