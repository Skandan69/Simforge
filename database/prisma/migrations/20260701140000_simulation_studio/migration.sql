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
