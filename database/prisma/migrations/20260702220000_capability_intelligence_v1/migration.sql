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
