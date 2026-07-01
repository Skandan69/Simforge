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
