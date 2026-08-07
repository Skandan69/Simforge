-- ==================================================
-- TARGET: SimForge-Staging ONLY
-- PROJECT REF: zyrxivxvywruyoogrmki
-- DO NOT RUN AGAINST PRODUCTION
-- PRODUCTION REF: mjqtfgyikverxckcyxri
-- ==================================================
-- Purpose: initialize a fresh SimForge-Staging Supabase database
-- to the complete pre-Sprint-19 SimForge schema.
--
-- This file intentionally excludes Sprint 19 retrieval changes:
-- - DocumentVersionRetrievalStatus
-- - KnowledgeChunkStatus
-- - Document.retrievalVersion
-- - DocumentVersion retrieval lifecycle columns
-- - KnowledgeChunk retrieval metadata columns
-- - KnowledgeChunkEmbedding
-- - vector(1536) embedding table/index
--
-- Execute manually in the Supabase SQL Editor only after confirming
-- the selected project is SimForge-Staging / zyrxivxvywruyoogrmki.
-- ==================================================


-- ==================================================
-- Extension prerequisites for fresh Supabase projects
-- ==================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ==================================================
-- Prisma migration: 20260630120000_foundation
-- Foundation
-- Source: database\prisma\migrations\20260630120000_foundation\migration.sql
-- ==================================================
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Owner', 'Admin', 'Trainer', 'Manager', 'Learner');

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "companySize" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'Learner',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Activity" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_createdBy_idx" ON "Organization"("createdBy");
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");
CREATE UNIQUE INDEX "Membership_organizationId_userId_key" ON "Membership"("organizationId", "userId");
CREATE INDEX "Activity_organizationId_createdAt_idx" ON "Activity"("organizationId", "createdAt");
CREATE INDEX "Activity_actorId_idx" ON "Activity"("actorId");

ALTER TABLE "Organization" ADD CONSTRAINT "Organization_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ==================================================
-- Prisma migration: 20260630160000_knowledge_studio
-- Knowledge Studio
-- Source: database\prisma\migrations\20260630160000_knowledge_studio\migration.sql
-- ==================================================
CREATE TYPE "KnowledgeBaseStatus" AS ENUM ('Active', 'Archived');
CREATE TYPE "DocumentFileType" AS ENUM ('PDF', 'DOCX', 'PPTX', 'XLSX');
CREATE TYPE "DocumentStatus" AS ENUM ('Ready', 'Archived', 'Failed');

CREATE TABLE "KnowledgeBase" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "status" "KnowledgeBaseStatus" NOT NULL DEFAULT 'Active',
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KnowledgeBase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Document" (
    "id" UUID NOT NULL,
    "knowledgeBaseId" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" "DocumentFileType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedBy" UUID NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "DocumentStatus" NOT NULL DEFAULT 'Ready',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentVersion" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" "DocumentFileType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedBy" UUID NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KnowledgeBase_organizationId_status_idx" ON "KnowledgeBase"("organizationId", "status");
CREATE INDEX "KnowledgeBase_organizationId_department_idx" ON "KnowledgeBase"("organizationId", "department");
CREATE UNIQUE INDEX "KnowledgeBase_organizationId_name_key" ON "KnowledgeBase"("organizationId", "name");
CREATE UNIQUE INDEX "Document_storagePath_key" ON "Document"("storagePath");
CREATE INDEX "Document_knowledgeBaseId_status_idx" ON "Document"("knowledgeBaseId", "status");
CREATE INDEX "Document_uploadedBy_idx" ON "Document"("uploadedBy");
CREATE INDEX "Document_fileName_idx" ON "Document"("fileName");
CREATE UNIQUE INDEX "DocumentVersion_storagePath_key" ON "DocumentVersion"("storagePath");
CREATE UNIQUE INDEX "DocumentVersion_documentId_version_key" ON "DocumentVersion"("documentId", "version");
CREATE INDEX "DocumentVersion_uploadedBy_idx" ON "DocumentVersion"("uploadedBy");

ALTER TABLE "KnowledgeBase" ADD CONSTRAINT "KnowledgeBase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeBase" ADD CONSTRAINT "KnowledgeBase_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ==================================================
-- Prisma migration: 20260701090000_knowledge_processing_engine
-- Knowledge Processing Engine
-- Source: database\prisma\migrations\20260701090000_knowledge_processing_engine\migration.sql
-- ==================================================
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


-- ==================================================
-- Prisma migration: 20260701140000_simulation_studio
-- Simulation Studio
-- Source: database\prisma\migrations\20260701140000_simulation_studio\migration.sql
-- ==================================================
CREATE TYPE "SimulationDifficulty" AS ENUM ('Beginner', 'Intermediate', 'Advanced', 'Expert');
CREATE TYPE "SimulationStatus" AS ENUM ('Draft', 'Active', 'Archived');

CREATE TABLE "Simulation" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
  "industry" TEXT NOT NULL, "department" TEXT NOT NULL, "jobRole" TEXT NOT NULL, "category" TEXT NOT NULL,
  "difficulty" "SimulationDifficulty" NOT NULL, "status" "SimulationStatus" NOT NULL DEFAULT 'Draft',
  "estimatedMinutes" INTEGER NOT NULL, "personaId" UUID, "scenarioSetup" TEXT NOT NULL, "successCriteria" TEXT NOT NULL,
  "createdBy" UUID NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SimulationPersona" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "name" TEXT NOT NULL, "role" TEXT NOT NULL,
  "personality" TEXT NOT NULL, "tone" TEXT NOT NULL, "difficultyBehavior" TEXT NOT NULL, "backgroundContext" TEXT NOT NULL,
  "createdBy" UUID NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SimulationPersona_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SimulationObjective" (
  "id" UUID NOT NULL, "simulationId" UUID NOT NULL, "title" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "SimulationObjective_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SimulationEvaluationCriterion" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false, "createdBy" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SimulationEvaluationCriterion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SimulationCriterionLink" (
  "simulationId" UUID NOT NULL, "criterionId" UUID NOT NULL,
  CONSTRAINT "SimulationCriterionLink_pkey" PRIMARY KEY ("simulationId", "criterionId")
);
CREATE TABLE "SimulationKnowledgeBase" (
  "simulationId" UUID NOT NULL, "knowledgeBaseId" UUID NOT NULL,
  CONSTRAINT "SimulationKnowledgeBase_pkey" PRIMARY KEY ("simulationId", "knowledgeBaseId")
);
CREATE TABLE "SimulationVersion" (
  "id" UUID NOT NULL, "simulationId" UUID NOT NULL, "version" INTEGER NOT NULL, "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SimulationVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Simulation_organizationId_status_idx" ON "Simulation"("organizationId", "status");
CREATE INDEX "Simulation_organizationId_department_idx" ON "Simulation"("organizationId", "department");
CREATE INDEX "Simulation_organizationId_difficulty_idx" ON "Simulation"("organizationId", "difficulty");
CREATE INDEX "Simulation_personaId_idx" ON "Simulation"("personaId");
CREATE UNIQUE INDEX "SimulationPersona_organizationId_name_key" ON "SimulationPersona"("organizationId", "name");
CREATE INDEX "SimulationPersona_organizationId_updatedAt_idx" ON "SimulationPersona"("organizationId", "updatedAt");
CREATE UNIQUE INDEX "SimulationObjective_simulationId_sortOrder_key" ON "SimulationObjective"("simulationId", "sortOrder");
CREATE UNIQUE INDEX "SimulationEvaluationCriterion_organizationId_name_key" ON "SimulationEvaluationCriterion"("organizationId", "name");
CREATE INDEX "SimulationEvaluationCriterion_organizationId_updatedAt_idx" ON "SimulationEvaluationCriterion"("organizationId", "updatedAt");
CREATE INDEX "SimulationCriterionLink_criterionId_idx" ON "SimulationCriterionLink"("criterionId");
CREATE INDEX "SimulationKnowledgeBase_knowledgeBaseId_idx" ON "SimulationKnowledgeBase"("knowledgeBaseId");
CREATE UNIQUE INDEX "SimulationVersion_simulationId_version_key" ON "SimulationVersion"("simulationId", "version");

ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "SimulationPersona"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SimulationPersona" ADD CONSTRAINT "SimulationPersona_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationPersona" ADD CONSTRAINT "SimulationPersona_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SimulationObjective" ADD CONSTRAINT "SimulationObjective_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationEvaluationCriterion" ADD CONSTRAINT "SimulationEvaluationCriterion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationEvaluationCriterion" ADD CONSTRAINT "SimulationEvaluationCriterion_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SimulationCriterionLink" ADD CONSTRAINT "SimulationCriterionLink_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationCriterionLink" ADD CONSTRAINT "SimulationCriterionLink_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "SimulationEvaluationCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationKnowledgeBase" ADD CONSTRAINT "SimulationKnowledgeBase_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationKnowledgeBase" ADD CONSTRAINT "SimulationKnowledgeBase_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationVersion" ADD CONSTRAINT "SimulationVersion_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "SimulationEvaluationCriterion" ("id", "organizationId", "name", "description", "isDefault", "createdBy", "createdAt", "updatedAt")
SELECT gen_random_uuid(), o."id", criterion.name, 'Evaluate ' || lower(criterion.name) || ' during the scenario.', true, o."createdBy", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Organization" o
CROSS JOIN (VALUES ('Knowledge accuracy'), ('Communication'), ('Empathy'), ('Process adherence'), ('Compliance'), ('Problem solving'), ('Confidence'), ('Professionalism')) AS criterion(name)
ON CONFLICT ("organizationId", "name") DO NOTHING;


-- ==================================================
-- Prisma migration: 20260702120000_sophia_simulation_runtime
-- Sophia Simulation Runtime
-- Source: database\prisma\migrations\20260702120000_sophia_simulation_runtime\migration.sql
-- ==================================================
CREATE TYPE "SimulationSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');
CREATE TYPE "SimulationMessageRole" AS ENUM ('learner', 'ai', 'system');

CREATE TABLE "SimulationSession" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "simulationId" UUID NOT NULL,
  "learnerId" UUID NOT NULL,
  "status" "SimulationSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "overallScore" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SimulationSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SimulationMessage" (
  "id" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "role" "SimulationMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SimulationMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SimulationEvaluation" (
  "id" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "overallScore" DOUBLE PRECISION NOT NULL,
  "strengths" JSONB NOT NULL,
  "improvementAreas" JSONB NOT NULL,
  "evidence" JSONB NOT NULL,
  "recommendedNextPractice" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SimulationEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CapabilityScore" (
  "id" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "capabilityName" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "evidence" TEXT NOT NULL,
  "recommendation" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CapabilityScore_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SimulationSession_organizationId_createdAt_idx" ON "SimulationSession"("organizationId", "createdAt");
CREATE INDEX "SimulationSession_simulationId_status_idx" ON "SimulationSession"("simulationId", "status");
CREATE INDEX "SimulationSession_learnerId_createdAt_idx" ON "SimulationSession"("learnerId", "createdAt");
CREATE INDEX "SimulationMessage_sessionId_createdAt_idx" ON "SimulationMessage"("sessionId", "createdAt");
CREATE UNIQUE INDEX "SimulationEvaluation_sessionId_key" ON "SimulationEvaluation"("sessionId");
CREATE UNIQUE INDEX "CapabilityScore_sessionId_capabilityName_key" ON "CapabilityScore"("sessionId", "capabilityName");
CREATE INDEX "CapabilityScore_sessionId_idx" ON "CapabilityScore"("sessionId");

ALTER TABLE "SimulationSession" ADD CONSTRAINT "SimulationSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationSession" ADD CONSTRAINT "SimulationSession_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationSession" ADD CONSTRAINT "SimulationSession_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationMessage" ADD CONSTRAINT "SimulationMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SimulationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationEvaluation" ADD CONSTRAINT "SimulationEvaluation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SimulationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CapabilityScore" ADD CONSTRAINT "CapabilityScore_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SimulationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ==================================================
-- Prisma migration: 20260702160000_knowledge_intelligence_v01
-- Knowledge Intelligence v0.1
-- Source: database\prisma\migrations\20260702160000_knowledge_intelligence_v01\migration.sql
-- ==================================================
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


-- ==================================================
-- Prisma migration: 20260702190000_organization_blueprint_v01
-- Organization Blueprint v0.1
-- Source: database\prisma\migrations\20260702190000_organization_blueprint_v01\migration.sql
-- ==================================================
-- CreateEnum
CREATE TYPE "OrganizationBlueprintStatus" AS ENUM ('DRAFT', 'APPROVED');

-- CreateTable
CREATE TABLE "OrganizationBlueprint" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "industry" TEXT NOT NULL,
    "teamSizeRange" TEXT NOT NULL,
    "primaryTrainingGoals" JSONB NOT NULL,
    "priorityCapabilities" JSONB NOT NULL,
    "criticalDocumentsNotes" TEXT NOT NULL DEFAULT '',
    "successDefinition" TEXT NOT NULL DEFAULT '',
    "costlyMistakes" TEXT NOT NULL DEFAULT '',
    "nonNegotiables" TEXT NOT NULL DEFAULT '',
    "status" "OrganizationBlueprintStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationBlueprint_organizationId_key" ON "OrganizationBlueprint"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationBlueprint_status_idx" ON "OrganizationBlueprint"("status");

-- AddForeignKey
ALTER TABLE "OrganizationBlueprint" ADD CONSTRAINT "OrganizationBlueprint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ==================================================
-- Prisma migration: 20260702220000_capability_intelligence_v1
-- Capability Intelligence v1
-- Source: database\prisma\migrations\20260702220000_capability_intelligence_v1\migration.sql
-- ==================================================
-- CreateEnum
CREATE TYPE "CapabilityTrend" AS ENUM ('NEW', 'IMPROVING', 'STABLE', 'DECLINING');

-- CreateEnum
CREATE TYPE "CapabilityConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "LearnerCapabilityProfile" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "learnerId" UUID NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "previousOverallScore" DOUBLE PRECISION,
    "trend" "CapabilityTrend" NOT NULL DEFAULT 'NEW',
    "confidence" "CapabilityConfidence" NOT NULL DEFAULT 'LOW',
    "simulationCount" INTEGER NOT NULL DEFAULT 0,
    "lastAssessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LearnerCapabilityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnerCapability" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "capabilityName" TEXT NOT NULL,
    "currentScore" DOUBLE PRECISION NOT NULL,
    "previousScore" DOUBLE PRECISION,
    "change" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastAssessedAt" TIMESTAMP(3) NOT NULL,
    "assessmentCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LearnerCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapabilityAssessmentHistory" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "capabilityName" TEXT NOT NULL,
    "currentScore" DOUBLE PRECISION NOT NULL,
    "previousScore" DOUBLE PRECISION,
    "change" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CapabilityAssessmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearnerCapabilityProfile_organizationId_learnerId_key" ON "LearnerCapabilityProfile"("organizationId", "learnerId");
CREATE INDEX "LearnerCapabilityProfile_learnerId_updatedAt_idx" ON "LearnerCapabilityProfile"("learnerId", "updatedAt");
CREATE UNIQUE INDEX "LearnerCapability_profileId_capabilityName_key" ON "LearnerCapability"("profileId", "capabilityName");
CREATE INDEX "LearnerCapability_profileId_currentScore_idx" ON "LearnerCapability"("profileId", "currentScore");
CREATE UNIQUE INDEX "CapabilityAssessmentHistory_sessionId_capabilityName_key" ON "CapabilityAssessmentHistory"("sessionId", "capabilityName");
CREATE INDEX "CapabilityAssessmentHistory_profileId_assessedAt_idx" ON "CapabilityAssessmentHistory"("profileId", "assessedAt");

-- AddForeignKey
ALTER TABLE "LearnerCapabilityProfile" ADD CONSTRAINT "LearnerCapabilityProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearnerCapabilityProfile" ADD CONSTRAINT "LearnerCapabilityProfile_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearnerCapability" ADD CONSTRAINT "LearnerCapability_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "LearnerCapabilityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CapabilityAssessmentHistory" ADD CONSTRAINT "CapabilityAssessmentHistory_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "LearnerCapabilityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CapabilityAssessmentHistory" ADD CONSTRAINT "CapabilityAssessmentHistory_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SimulationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ==================================================
-- Prisma migration: 20260703090000_learning_factory_v1
-- Learning Factory v1
-- Source: database\prisma\migrations\20260703090000_learning_factory_v1\migration.sql
-- ==================================================
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


-- ==================================================
-- Prisma migration: 20260703120000_ai_coach_v1
-- AI Coach v1
-- Source: database\prisma\migrations\20260703120000_ai_coach_v1\migration.sql
-- ==================================================
-- CreateEnum
CREATE TYPE "CoachingGeneratedBy" AS ENUM ('DETERMINISTIC', 'AI');

-- CreateTable
CREATE TABLE "SimulationCoachingInsight" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "learnerId" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "improvementAreas" JSONB NOT NULL,
    "capabilityChanges" JSONB NOT NULL,
    "knowledgeGaps" JSONB NOT NULL,
    "nextBestAction" JSONB NOT NULL,
    "estimatedImprovement" JSONB NOT NULL,
    "generatedBy" "CoachingGeneratedBy" NOT NULL DEFAULT 'DETERMINISTIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SimulationCoachingInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SimulationCoachingInsight_sessionId_key" ON "SimulationCoachingInsight"("sessionId");
CREATE INDEX "SimulationCoachingInsight_organizationId_learnerId_createdAt_idx" ON "SimulationCoachingInsight"("organizationId", "learnerId", "createdAt");

-- AddForeignKey
ALTER TABLE "SimulationCoachingInsight" ADD CONSTRAINT "SimulationCoachingInsight_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationCoachingInsight" ADD CONSTRAINT "SimulationCoachingInsight_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SimulationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationCoachingInsight" ADD CONSTRAINT "SimulationCoachingInsight_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ==================================================
-- Supabase Storage: organization logos
-- Source: database\supabase\storage.sql
-- ==================================================
-- Run this once in the Supabase SQL editor to support organization logo uploads.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-logos',
  'organization-logos',
  true,
  2000000,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Users can upload organization logos to their folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);


-- ==================================================
-- Supabase Storage/RLS: knowledge documents
-- Source: database\supabase\knowledge-storage.sql
-- ==================================================
-- Run after the Prisma Sprint 2 migration. Supabase-specific RLS stays outside
-- Prisma migrations so shadow databases do not require the Supabase auth schema.
ALTER TABLE public."Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."KnowledgeBase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DocumentVersion" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own memberships"
ON public."Membership"
FOR SELECT
TO authenticated
USING ("userId" = (SELECT auth.uid()));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-documents',
  'knowledge-documents',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Organization members can read knowledge documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'knowledge-documents'
  AND EXISTS (
    SELECT 1 FROM public."Membership" membership
    WHERE membership."organizationId" = ((storage.foldername(name))[1])::uuid
      AND membership."userId" = (SELECT auth.uid())
  )
);

CREATE POLICY "Knowledge editors can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'knowledge-documents'
  AND EXISTS (
    SELECT 1 FROM public."Membership" membership
    WHERE membership."organizationId" = ((storage.foldername(name))[1])::uuid
      AND membership."userId" = (SELECT auth.uid())
      AND membership."role"::text = ANY (ARRAY['Owner', 'Admin', 'Trainer'])
  )
);

CREATE POLICY "Knowledge editors can remove documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'knowledge-documents'
  AND EXISTS (
    SELECT 1 FROM public."Membership" membership
    WHERE membership."organizationId" = ((storage.foldername(name))[1])::uuid
      AND membership."userId" = (SELECT auth.uid())
      AND membership."role"::text = ANY (ARRAY['Owner', 'Admin', 'Trainer'])
  )
);


-- ==================================================
-- Supabase RLS: processing tables
-- Source: database\supabase\processing-rls.sql
-- ==================================================
-- Processing data is API-only. The service role bypasses RLS; browser clients receive no direct table access.
alter table public."KnowledgeSource" enable row level security;
alter table public."ProcessingJob" enable row level security;
alter table public."KnowledgeChunk" enable row level security;
alter table public."ProcessingLog" enable row level security;


-- ==================================================
-- Supabase RLS: simulation tables
-- Source: database\supabase\simulation-rls.sql
-- ==================================================
-- Simulation configuration is API-only. Service-role requests enforce organization membership and role permissions.
alter table public."Simulation" enable row level security;
alter table public."SimulationPersona" enable row level security;
alter table public."SimulationObjective" enable row level security;
alter table public."SimulationEvaluationCriterion" enable row level security;
alter table public."SimulationCriterionLink" enable row level security;
alter table public."SimulationKnowledgeBase" enable row level security;
alter table public."SimulationVersion" enable row level security;
alter table public."SimulationSession" enable row level security;
alter table public."SimulationMessage" enable row level security;
alter table public."SimulationEvaluation" enable row level security;
alter table public."CapabilityScore" enable row level security;


-- ==================================================
-- Read-only verification queries
-- ==================================================

-- Verify required pre-Sprint-19 tables exist.
SELECT expected.table_name,
       CASE WHEN actual.table_name IS NULL THEN 'MISSING' ELSE 'OK' END AS status
FROM (VALUES
  ('Profile'),
  ('Organization'),
  ('Membership'),
  ('Activity'),
  ('KnowledgeBase'),
  ('Document'),
  ('DocumentVersion'),
  ('KnowledgeSource'),
  ('ProcessingJob'),
  ('KnowledgeChunk'),
  ('ProcessingLog'),
  ('Simulation'),
  ('SimulationSession'),
  ('SimulationMessage'),
  ('SimulationEvaluation'),
  ('CapabilityScore'),
  ('KnowledgeIntelligenceSection'),
  ('OrganizationBlueprint'),
  ('LearnerCapabilityProfile'),
  ('LearningFactoryDraft'),
  ('SimulationCoachingInsight')
) AS expected(table_name)
LEFT JOIN information_schema.tables actual
  ON actual.table_schema = 'public'
 AND actual.table_name = expected.table_name
ORDER BY expected.table_name;

-- Verify required pre-Sprint-19 enums exist.
SELECT expected.enum_name,
       CASE WHEN actual.typname IS NULL THEN 'MISSING' ELSE 'OK' END AS status
FROM (VALUES
  ('UserRole'),
  ('KnowledgeBaseStatus'),
  ('DocumentFileType'),
  ('DocumentStatus'),
  ('ProcessingStatus'),
  ('KnowledgeSourceType'),
  ('ProcessingLogLevel'),
  ('KnowledgeSectionType'),
  ('KnowledgeImportance'),
  ('OrganizationBlueprintStatus'),
  ('CapabilityTrend'),
  ('CapabilityConfidence'),
  ('LearningFactoryAssetType'),
  ('LearningFactoryDraftStatus'),
  ('CoachingGeneratedBy'),
  ('SimulationDifficulty'),
  ('SimulationStatus'),
  ('SimulationSessionStatus'),
  ('SimulationMessageRole')
) AS expected(enum_name)
LEFT JOIN pg_type actual
  ON actual.typname = expected.enum_name
ORDER BY expected.enum_name;

-- Verify important pre-Sprint-19 indexes exist.
SELECT expected.index_name,
       CASE WHEN actual.indexname IS NULL THEN 'MISSING' ELSE 'OK' END AS status
FROM (VALUES
  ('Membership_organizationId_userId_key'),
  ('KnowledgeBase_organizationId_status_idx'),
  ('Document_knowledgeBaseId_status_idx'),
  ('KnowledgeSource_documentId_key'),
  ('ProcessingJob_status_queuedAt_idx'),
  ('KnowledgeChunk_sourceId_chunkNumber_key'),
  ('Simulation_organizationId_status_idx'),
  ('SimulationSession_organizationId_createdAt_idx'),
  ('SimulationMessage_sessionId_createdAt_idx'),
  ('KnowledgeIntelligenceSection_sourceId_sectionNumber_key'),
  ('OrganizationBlueprint_organizationId_key'),
  ('LearnerCapabilityProfile_organizationId_learnerId_key'),
  ('LearningFactoryDraft_organizationId_status_updatedAt_idx'),
  ('SimulationCoachingInsight_sessionId_key')
) AS expected(index_name)
LEFT JOIN pg_indexes actual
  ON actual.schemaname = 'public'
 AND actual.indexname = expected.index_name
ORDER BY expected.index_name;

-- Verify expected storage buckets exist after Supabase-specific setup.
SELECT expected.bucket_id,
       CASE WHEN actual.id IS NULL THEN 'MISSING' ELSE 'OK' END AS status
FROM (VALUES
  ('organization-logos'),
  ('knowledge-documents')
) AS expected(bucket_id)
LEFT JOIN storage.buckets actual
  ON actual.id = expected.bucket_id
ORDER BY expected.bucket_id;

-- Verify selected RLS settings are enabled.
SELECT expected.table_name,
       CASE WHEN cls.relrowsecurity THEN 'OK' ELSE 'MISSING' END AS rls_status
FROM (VALUES
  ('Profile'),
  ('Organization'),
  ('Membership'),
  ('Activity'),
  ('KnowledgeBase'),
  ('Document'),
  ('DocumentVersion'),
  ('KnowledgeSource'),
  ('ProcessingJob'),
  ('KnowledgeChunk'),
  ('ProcessingLog'),
  ('Simulation'),
  ('SimulationSession'),
  ('SimulationMessage'),
  ('SimulationEvaluation'),
  ('CapabilityScore')
) AS expected(table_name)
LEFT JOIN pg_class cls ON cls.relname = expected.table_name
LEFT JOIN pg_namespace ns ON ns.oid = cls.relnamespace AND ns.nspname = 'public'
ORDER BY expected.table_name;
