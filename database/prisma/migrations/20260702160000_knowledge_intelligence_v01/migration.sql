-- CreateEnum
CREATE TYPE "KnowledgeSectionType" AS ENUM ('Policy', 'Procedure', 'ProductInformation', 'FAQ', 'BestPractice', 'Compliance', 'GeneralReference', 'Unknown');

-- CreateEnum
CREATE TYPE "KnowledgeImportance" AS ENUM ('Critical', 'Important', 'Reference', 'Optional');

-- CreateTable
CREATE TABLE "KnowledgeIntelligenceSection" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "sectionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sectionType" "KnowledgeSectionType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "keywords" TEXT[],
    "importance" "KnowledgeImportance" NOT NULL,
    "capabilities" TEXT[],
    "isAiSuggestion" BOOLEAN NOT NULL DEFAULT true,
    "analysisVersion" TEXT NOT NULL DEFAULT 'heuristic-v0.1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeIntelligenceSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeIntelligenceSection_sourceId_sectionNumber_key" ON "KnowledgeIntelligenceSection"("sourceId", "sectionNumber");

-- CreateIndex
CREATE INDEX "KnowledgeIntelligenceSection_sourceId_sectionType_idx" ON "KnowledgeIntelligenceSection"("sourceId", "sectionType");

-- AddForeignKey
ALTER TABLE "KnowledgeIntelligenceSection" ADD CONSTRAINT "KnowledgeIntelligenceSection_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
