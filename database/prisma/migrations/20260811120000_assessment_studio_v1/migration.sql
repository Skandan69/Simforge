CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "AssessmentAssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "AssessmentAttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

CREATE TABLE "Assessment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "simulationId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "capabilities" TEXT[] NOT NULL,
    "passingScore" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentAssignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "learnerId" UUID NOT NULL,
    "assignedBy" UUID NOT NULL,
    "attemptId" UUID,
    "status" "AssessmentAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "reason" TEXT NOT NULL DEFAULT '',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentAttempt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "learnerId" UUID NOT NULL,
    "simulationSessionId" UUID NOT NULL,
    "status" "AssessmentAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "overallScore" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Assessment_organizationId_status_updatedAt_idx" ON "Assessment"("organizationId", "status", "updatedAt");
CREATE INDEX "Assessment_simulationId_idx" ON "Assessment"("simulationId");
CREATE INDEX "Assessment_createdBy_idx" ON "Assessment"("createdBy");

CREATE UNIQUE INDEX "AssessmentAssignment_attemptId_key" ON "AssessmentAssignment"("attemptId");
CREATE INDEX "AssessmentAssignment_organizationId_status_assignedAt_idx" ON "AssessmentAssignment"("organizationId", "status", "assignedAt");
CREATE INDEX "AssessmentAssignment_organizationId_learnerId_status_idx" ON "AssessmentAssignment"("organizationId", "learnerId", "status");
CREATE INDEX "AssessmentAssignment_organizationId_assessmentId_idx" ON "AssessmentAssignment"("organizationId", "assessmentId");
CREATE INDEX "AssessmentAssignment_assignedBy_idx" ON "AssessmentAssignment"("assignedBy");

CREATE UNIQUE INDEX "AssessmentAttempt_simulationSessionId_key" ON "AssessmentAttempt"("simulationSessionId");
CREATE INDEX "AssessmentAttempt_organizationId_learnerId_status_idx" ON "AssessmentAttempt"("organizationId", "learnerId", "status");
CREATE INDEX "AssessmentAttempt_organizationId_assessmentId_idx" ON "AssessmentAttempt"("organizationId", "assessmentId");

ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssessmentAssignment" ADD CONSTRAINT "AssessmentAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentAssignment" ADD CONSTRAINT "AssessmentAssignment_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentAssignment" ADD CONSTRAINT "AssessmentAssignment_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentAssignment" ADD CONSTRAINT "AssessmentAssignment_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentAssignment" ADD CONSTRAINT "AssessmentAssignment_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_simulationSessionId_fkey" FOREIGN KEY ("simulationSessionId") REFERENCES "SimulationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."Assessment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AssessmentAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AssessmentAttempt" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public."Assessment" FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public."Assessment" FROM authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."AssessmentAssignment" FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public."AssessmentAssignment" FROM authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."AssessmentAttempt" FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public."AssessmentAttempt" FROM authenticated;
