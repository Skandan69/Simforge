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
