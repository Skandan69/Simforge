ALTER TABLE "LearningFactoryDraft"
ADD COLUMN "publishedSimulationId" UUID,
ADD COLUMN "publishedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "LearningFactoryDraft_publishedSimulationId_key"
ON "LearningFactoryDraft"("publishedSimulationId");

ALTER TABLE "LearningFactoryDraft"
ADD CONSTRAINT "LearningFactoryDraft_publishedSimulationId_fkey"
FOREIGN KEY ("publishedSimulationId") REFERENCES "Simulation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
