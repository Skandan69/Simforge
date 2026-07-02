-- CreateEnum
CREATE TYPE "LearningFactoryAssetType" AS ENUM ('SIMULATION', 'QUESTION_BANK', 'LEARNING_OBJECTIVE', 'COACHING_FOCUS');

-- CreateEnum
CREATE TYPE "LearningFactoryDraftStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- CreateTable
CREATE TABLE "LearningFactoryDraft" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "sourceDocumentId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assetType" "LearningFactoryAssetType" NOT NULL,
    "status" "LearningFactoryDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedFrom" TEXT NOT NULL,
    "capabilityMappings" JSONB NOT NULL,
    "importance" "KnowledgeImportance" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "businessValue" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LearningFactoryDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearningFactoryDraft_organizationId_assetType_generatedFrom_key" ON "LearningFactoryDraft"("organizationId", "assetType", "generatedFrom");
CREATE INDEX "LearningFactoryDraft_organizationId_status_updatedAt_idx" ON "LearningFactoryDraft"("organizationId", "status", "updatedAt");
CREATE INDEX "LearningFactoryDraft_sourceDocumentId_idx" ON "LearningFactoryDraft"("sourceDocumentId");

-- AddForeignKey
ALTER TABLE "LearningFactoryDraft" ADD CONSTRAINT "LearningFactoryDraft_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningFactoryDraft" ADD CONSTRAINT "LearningFactoryDraft_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
