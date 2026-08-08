CREATE TYPE "PracticeAssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "PracticeAssignment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "learnerId" UUID NOT NULL,
  "simulationId" UUID NOT NULL,
  "assignedBy" UUID NOT NULL,
  "sessionId" UUID,
  "status" "PracticeAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
  "reason" TEXT NOT NULL DEFAULT '',
  "focusCapability" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PracticeAssignment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PracticeAssignment"
ADD CONSTRAINT "PracticeAssignment_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PracticeAssignment"
ADD CONSTRAINT "PracticeAssignment_learnerId_fkey"
FOREIGN KEY ("learnerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PracticeAssignment"
ADD CONSTRAINT "PracticeAssignment_assignedBy_fkey"
FOREIGN KEY ("assignedBy") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PracticeAssignment"
ADD CONSTRAINT "PracticeAssignment_simulationId_fkey"
FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PracticeAssignment"
ADD CONSTRAINT "PracticeAssignment_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "SimulationSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "PracticeAssignment_sessionId_key"
ON "PracticeAssignment"("sessionId");

CREATE INDEX "PracticeAssignment_organizationId_status_assignedAt_idx"
ON "PracticeAssignment"("organizationId", "status", "assignedAt");

CREATE INDEX "PracticeAssignment_organizationId_learnerId_status_idx"
ON "PracticeAssignment"("organizationId", "learnerId", "status");

CREATE INDEX "PracticeAssignment_organizationId_simulationId_idx"
ON "PracticeAssignment"("organizationId", "simulationId");

CREATE INDEX "PracticeAssignment_assignedBy_idx"
ON "PracticeAssignment"("assignedBy");

ALTER TABLE public."PracticeAssignment" ENABLE ROW LEVEL SECURITY;
