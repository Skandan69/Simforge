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
