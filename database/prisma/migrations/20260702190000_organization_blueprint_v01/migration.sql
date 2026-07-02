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
