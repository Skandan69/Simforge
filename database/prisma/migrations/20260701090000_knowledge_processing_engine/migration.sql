CREATE TYPE "ProcessingStatus" AS ENUM ('Uploaded', 'Queued', 'Processing', 'Completed', 'Failed', 'Cancelled');
CREATE TYPE "KnowledgeSourceType" AS ENUM ('PDF', 'DOCX', 'PPTX', 'XLSX', 'Website', 'Video', 'Audio', 'Image', 'SharePoint', 'Confluence', 'API');
CREATE TYPE "ProcessingLogLevel" AS ENUM ('Info', 'Warning', 'Error');

CREATE TABLE "KnowledgeSource" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "documentId" UUID, "sourceType" "KnowledgeSourceType" NOT NULL,
  "title" TEXT NOT NULL, "mimeType" TEXT, "sizeBytes" BIGINT, "status" "ProcessingStatus" NOT NULL DEFAULT 'Uploaded',
  "progress" INTEGER NOT NULL DEFAULT 0, "extractedText" TEXT, "pageCount" INTEGER, "wordCount" INTEGER,
  "characterCount" INTEGER, "estimatedTokens" INTEGER, "language" TEXT, "processingDurationMs" INTEGER,
  "processedAt" TIMESTAMP(3), "failureReason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProcessingJob" (
  "id" UUID NOT NULL, "sourceId" UUID NOT NULL, "status" "ProcessingStatus" NOT NULL DEFAULT 'Queued', "progress" INTEGER NOT NULL DEFAULT 0,
  "attempt" INTEGER NOT NULL DEFAULT 0, "retryCount" INTEGER NOT NULL DEFAULT 0, "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3), "cancelRequestedAt" TIMESTAMP(3), "lastAttemptAt" TIMESTAMP(3), "durationMs" INTEGER,
  "failureReason" TEXT, "errorMessage" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ProcessingJob_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "KnowledgeChunk" (
  "id" UUID NOT NULL, "sourceId" UUID NOT NULL, "documentId" UUID, "chunkNumber" INTEGER NOT NULL, "text" TEXT NOT NULL,
  "characterCount" INTEGER NOT NULL, "estimatedTokens" INTEGER NOT NULL, "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProcessingLog" (
  "id" UUID NOT NULL, "sourceId" UUID NOT NULL, "jobId" UUID, "level" "ProcessingLogLevel" NOT NULL DEFAULT 'Info',
  "event" TEXT NOT NULL, "message" TEXT NOT NULL, "details" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessingLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeSource_documentId_key" ON "KnowledgeSource"("documentId");
CREATE INDEX "KnowledgeSource_organizationId_status_idx" ON "KnowledgeSource"("organizationId", "status");
CREATE INDEX "KnowledgeSource_sourceType_idx" ON "KnowledgeSource"("sourceType");
CREATE INDEX "ProcessingJob_status_queuedAt_idx" ON "ProcessingJob"("status", "queuedAt");
CREATE INDEX "ProcessingJob_sourceId_createdAt_idx" ON "ProcessingJob"("sourceId", "createdAt");
CREATE UNIQUE INDEX "KnowledgeChunk_sourceId_chunkNumber_key" ON "KnowledgeChunk"("sourceId", "chunkNumber");
CREATE INDEX "KnowledgeChunk_documentId_idx" ON "KnowledgeChunk"("documentId");
CREATE INDEX "ProcessingLog_sourceId_createdAt_idx" ON "ProcessingLog"("sourceId", "createdAt");
CREATE INDEX "ProcessingLog_jobId_createdAt_idx" ON "ProcessingLog"("jobId", "createdAt");

ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcessingJob" ADD CONSTRAINT "ProcessingJob_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcessingLog" ADD CONSTRAINT "ProcessingLog_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcessingLog" ADD CONSTRAINT "ProcessingLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ProcessingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
