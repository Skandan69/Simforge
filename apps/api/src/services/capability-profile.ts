import type { WorkforceCapability } from "@simforge/shared";
import type { Prisma } from "../generated/prisma/client.js";

export interface CapabilityAssessmentInput {
  capabilityName: WorkforceCapability;
  score: number;
}

export function capabilityProfileScope(organizationId: string, learnerId: string) {
  return { organizationId_learnerId: { organizationId, learnerId } } as const;
}

export function sessionHistoryScope(sessionId: string) {
  return { sessionId } as const;
}

const round = (value: number) => Math.round(value * 10) / 10;

export function calculateCapabilityUpdate(previousScore: number | null, assessmentCount: number, assessmentScore: number) {
  const currentScore = previousScore === null ? assessmentScore : round(((previousScore * assessmentCount) + assessmentScore) / (assessmentCount + 1));
  return { currentScore, previousScore, change: previousScore === null ? 0 : round(currentScore - previousScore), assessmentCount: assessmentCount + 1 };
}

export function capabilityConfidence(simulationCount: number) {
  return simulationCount >= 6 ? "HIGH" as const : simulationCount >= 3 ? "MEDIUM" as const : "LOW" as const;
}

export function capabilityTrend(previousScore: number | null, currentScore: number) {
  if (previousScore === null) return "NEW" as const;
  const change = currentScore - previousScore;
  return change > 1 ? "IMPROVING" as const : change < -1 ? "DECLINING" as const : "STABLE" as const;
}

export async function updateLearnerCapabilityProfile(transaction: Prisma.TransactionClient, input: {
  organizationId: string;
  learnerId: string;
  sessionId: string;
  assessedAt: Date;
  scores: CapabilityAssessmentInput[];
}) {
  const existingHistory = await transaction.capabilityAssessmentHistory.findFirst({ where: sessionHistoryScope(input.sessionId), select: { id: true } });
  if (existingHistory) return false;

  const profile = await transaction.learnerCapabilityProfile.upsert({
    where: capabilityProfileScope(input.organizationId, input.learnerId),
    create: { organizationId: input.organizationId, learnerId: input.learnerId, overallScore: 0, simulationCount: 0 },
    update: {},
    include: { capabilities: true },
  });
  const existing = new Map(profile.capabilities.map((capability) => [capability.capabilityName, capability]));
  const updates = input.scores.map((score) => {
    const prior = existing.get(score.capabilityName);
    return { capabilityName: score.capabilityName, ...calculateCapabilityUpdate(prior?.currentScore ?? null, prior?.assessmentCount ?? 0, score.score) };
  });

  for (const update of updates) {
    await transaction.learnerCapability.upsert({
      where: { profileId_capabilityName: { profileId: profile.id, capabilityName: update.capabilityName } },
      create: { profileId: profile.id, capabilityName: update.capabilityName, currentScore: update.currentScore, previousScore: update.previousScore, change: update.change, assessmentCount: update.assessmentCount, lastAssessedAt: input.assessedAt },
      update: { currentScore: update.currentScore, previousScore: update.previousScore, change: update.change, assessmentCount: update.assessmentCount, lastAssessedAt: input.assessedAt },
    });
    await transaction.capabilityAssessmentHistory.create({
      data: { profileId: profile.id, sessionId: input.sessionId, capabilityName: update.capabilityName, currentScore: update.currentScore, previousScore: update.previousScore, change: update.change, assessedAt: input.assessedAt },
    });
  }

  const overallScore = round(updates.reduce((total, update) => total + update.currentScore, 0) / Math.max(updates.length, 1));
  const previousOverallScore = profile.simulationCount ? profile.overallScore : null;
  const simulationCount = profile.simulationCount + 1;
  await transaction.learnerCapabilityProfile.update({
    where: { id: profile.id },
    data: { overallScore, previousOverallScore, trend: capabilityTrend(previousOverallScore, overallScore), confidence: capabilityConfidence(simulationCount), simulationCount, lastAssessedAt: input.assessedAt },
  });
  return true;
}
