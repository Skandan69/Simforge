CREATE TYPE "DevelopmentPathStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "DevelopmentPathStepType" AS ENUM ('PRACTICE', 'ASSESSMENT');
CREATE TYPE "DevelopmentPathAssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "DevelopmentPath" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "targetRole" TEXT NOT NULL DEFAULT '',
  "department" TEXT NOT NULL DEFAULT '',
  "capabilities" TEXT[] NOT NULL,
  "status" "DevelopmentPathStatus" NOT NULL DEFAULT 'DRAFT',
  "createdBy" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DevelopmentPath_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DevelopmentPathStep" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "developmentPathId" UUID NOT NULL,
  "type" "DevelopmentPathStepType" NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "simulationId" UUID,
  "assessmentId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DevelopmentPathStep_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DevelopmentPathStep_target_check" CHECK (
    ("type" = 'PRACTICE' AND "simulationId" IS NOT NULL AND "assessmentId" IS NULL)
    OR
    ("type" = 'ASSESSMENT' AND "assessmentId" IS NOT NULL AND "simulationId" IS NULL)
  )
);

CREATE TABLE "DevelopmentPathAssignment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "developmentPathId" UUID NOT NULL,
  "learnerId" UUID NOT NULL,
  "assignedBy" UUID NOT NULL,
  "status" "DevelopmentPathAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
  "reason" TEXT NOT NULL DEFAULT '',
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DevelopmentPathAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DevelopmentPathStepProgress" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "pathAssignmentId" UUID NOT NULL,
  "stepId" UUID NOT NULL,
  "practiceAssignmentId" UUID,
  "assessmentAssignmentId" UUID,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DevelopmentPathStepProgress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DevelopmentPathStepProgress_target_check" CHECK (
    ("practiceAssignmentId" IS NOT NULL AND "assessmentAssignmentId" IS NULL)
    OR
    ("practiceAssignmentId" IS NULL AND "assessmentAssignmentId" IS NOT NULL)
  )
);

CREATE INDEX "DevelopmentPath_organizationId_status_updatedAt_idx" ON "DevelopmentPath"("organizationId", "status", "updatedAt");
CREATE INDEX "DevelopmentPath_createdBy_idx" ON "DevelopmentPath"("createdBy");

CREATE UNIQUE INDEX "DevelopmentPathStep_developmentPathId_sortOrder_key" ON "DevelopmentPathStep"("developmentPathId", "sortOrder");
CREATE INDEX "DevelopmentPathStep_simulationId_idx" ON "DevelopmentPathStep"("simulationId");
CREATE INDEX "DevelopmentPathStep_assessmentId_idx" ON "DevelopmentPathStep"("assessmentId");

CREATE UNIQUE INDEX "DevelopmentPathAssignment_organizationId_developmentPathId_learnerId_status_key" ON "DevelopmentPathAssignment"("organizationId", "developmentPathId", "learnerId", "status");
CREATE INDEX "DevelopmentPathAssignment_organizationId_status_assignedAt_idx" ON "DevelopmentPathAssignment"("organizationId", "status", "assignedAt");
CREATE INDEX "DevelopmentPathAssignment_organizationId_learnerId_status_idx" ON "DevelopmentPathAssignment"("organizationId", "learnerId", "status");
CREATE INDEX "DevelopmentPathAssignment_assignedBy_idx" ON "DevelopmentPathAssignment"("assignedBy");

CREATE UNIQUE INDEX "DevelopmentPathStepProgress_practiceAssignmentId_key" ON "DevelopmentPathStepProgress"("practiceAssignmentId");
CREATE UNIQUE INDEX "DevelopmentPathStepProgress_assessmentAssignmentId_key" ON "DevelopmentPathStepProgress"("assessmentAssignmentId");
CREATE UNIQUE INDEX "DevelopmentPathStepProgress_pathAssignmentId_stepId_key" ON "DevelopmentPathStepProgress"("pathAssignmentId", "stepId");
CREATE INDEX "DevelopmentPathStepProgress_organizationId_pathAssignmentId_idx" ON "DevelopmentPathStepProgress"("organizationId", "pathAssignmentId");
CREATE INDEX "DevelopmentPathStepProgress_stepId_idx" ON "DevelopmentPathStepProgress"("stepId");

ALTER TABLE "DevelopmentPath" ADD CONSTRAINT "DevelopmentPath_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DevelopmentPath" ADD CONSTRAINT "DevelopmentPath_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DevelopmentPathStep" ADD CONSTRAINT "DevelopmentPathStep_developmentPathId_fkey" FOREIGN KEY ("developmentPathId") REFERENCES "DevelopmentPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DevelopmentPathStep" ADD CONSTRAINT "DevelopmentPathStep_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DevelopmentPathStep" ADD CONSTRAINT "DevelopmentPathStep_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DevelopmentPathAssignment" ADD CONSTRAINT "DevelopmentPathAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DevelopmentPathAssignment" ADD CONSTRAINT "DevelopmentPathAssignment_developmentPathId_fkey" FOREIGN KEY ("developmentPathId") REFERENCES "DevelopmentPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DevelopmentPathAssignment" ADD CONSTRAINT "DevelopmentPathAssignment_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DevelopmentPathAssignment" ADD CONSTRAINT "DevelopmentPathAssignment_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DevelopmentPathStepProgress" ADD CONSTRAINT "DevelopmentPathStepProgress_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DevelopmentPathStepProgress" ADD CONSTRAINT "DevelopmentPathStepProgress_pathAssignmentId_fkey" FOREIGN KEY ("pathAssignmentId") REFERENCES "DevelopmentPathAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DevelopmentPathStepProgress" ADD CONSTRAINT "DevelopmentPathStepProgress_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "DevelopmentPathStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DevelopmentPathStepProgress" ADD CONSTRAINT "DevelopmentPathStepProgress_practiceAssignmentId_fkey" FOREIGN KEY ("practiceAssignmentId") REFERENCES "PracticeAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DevelopmentPathStepProgress" ADD CONSTRAINT "DevelopmentPathStepProgress_assessmentAssignmentId_fkey" FOREIGN KEY ("assessmentAssignmentId") REFERENCES "AssessmentAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public."DevelopmentPath" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DevelopmentPathStep" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DevelopmentPathAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DevelopmentPathStepProgress" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public."DevelopmentPath" FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public."DevelopmentPath" FROM authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."DevelopmentPathStep" FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public."DevelopmentPathStep" FROM authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."DevelopmentPathAssignment" FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public."DevelopmentPathAssignment" FROM authenticated;
REVOKE ALL PRIVILEGES ON TABLE public."DevelopmentPathStepProgress" FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public."DevelopmentPathStepProgress" FROM authenticated;
