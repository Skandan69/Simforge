import type { CoachingGeneratedBy, SimulationCoachingInsightResponse, UserRole, WorkforceCapability } from "@simforge/shared";

type CoachingOutput = Omit<SimulationCoachingInsightResponse, "id" | "sessionId" | "learnerId" | "createdAt" | "updatedAt">;

export interface CoachingInput {
  evaluation: { overallScore: number; strengths: string[]; improvementAreas: string[]; recommendedNextPractice: string };
  capabilityScores: Array<{ capabilityName: WorkforceCapability; score: number; evidence: string; recommendation: string }>;
  capabilityChanges: Array<{ capabilityName: WorkforceCapability; currentScore: number; previousScore: number | null; change: number }>;
  learnerMessages: string[];
  knowledgeSections: Array<{ title: string; summary: string; capabilities: string[] }>;
  learningDrafts: Array<{ title: string; capabilityMappings: unknown }>;
  blueprint: null | { successDefinition: string; nonNegotiables: string };
}

export function betterResponseExample(capability: WorkforceCapability) {
  if (capability === "Empathy") return "I understand how frustrating this has been. I will first confirm the details so I can explain the right next step.";
  if (capability === "Policy Compliance" || capability === "Product Knowledge" || capability === "Decision Making") return "I can help with this. Before confirming the outcome, may I verify the dates and amounts of both charges?";
  if (capability === "Problem Solving") return "Let me confirm what happened first, then I will explain the available options and the next step.";
  return "I understand the concern. I will verify the relevant details and then explain the next step clearly.";
}

export function buildDeterministicCoaching(input: CoachingInput): CoachingOutput {
  const ranked = [...input.capabilityScores].sort((a, b) => b.score - a.score);
  const strengths = ranked.slice(0, 1).map((score) => ({ title: `${score.capabilityName} evidence`, evidence: score.evidence, capability: score.capabilityName }));
  const improvementAreas = [...ranked].reverse().slice(0, 3).map((score) => ({ title: `Strengthen ${score.capabilityName}`, evidence: `${score.capabilityName} scored ${Math.round(score.score)} in this session. ${score.evidence}`, recommendation: `${score.recommendation} Better response example: “${betterResponseExample(score.capabilityName)}”`, capability: score.capabilityName }));
  const weakest = improvementAreas[0] ?? { capability: "Communication" as const, title: "Strengthen Communication", recommendation: input.evaluation.recommendedNextPractice };
  const knowledgeGaps = improvementAreas.flatMap((area) => {
    const section = input.knowledgeSections.find((item) => item.capabilities.includes(area.capability));
    return section ? [{ topic: section.title, evidence: `${area.capability} needs more consistent application. Review: ${section.summary}`, sourceTitle: section.title }] : [];
  }).slice(0, 3);
  const approvedDraft = input.learningDrafts.find((draft) => Array.isArray(draft.capabilityMappings) && draft.capabilityMappings.includes(weakest.capability));
  const nextBestAction = { title: approvedDraft?.title ?? `Repeat focused ${weakest.capability} practice`, description: approvedDraft ? "Use this approved Learning Factory draft as the next focused practice activity." : weakest.recommendation, capability: weakest.capability };
  const gap = Math.max(0, 100 - (ranked.at(-1)?.score ?? input.evaluation.overallScore));
  const maximumPoints = Math.max(2, Math.min(8, Math.round(gap * 0.12)));
  const objective = input.blueprint?.successDefinition ? ` This supports the organization objective: ${input.blueprint.successDefinition}` : "";
  return {
    summary: `${ranked[0]?.capabilityName ?? "The strongest capability"} showed the clearest evidence in this session. The next priority is ${weakest.capability}.${objective}`,
    strengths,
    improvementAreas,
    capabilityChanges: input.capabilityChanges.map((change) => ({ capability: change.capabilityName, currentScore: change.currentScore, previousScore: change.previousScore, change: change.change })),
    knowledgeGaps,
    nextBestAction,
    estimatedImprovement: { minimumPoints: 1, maximumPoints, basis: "Estimated range after one focused practice cycle using the identified capability gap.", disclaimer: "Estimate only — not a prediction or guaranteed score change." },
    generatedBy: "DETERMINISTIC",
  };
}

export async function generateCoachingWithFallback(input: CoachingInput, aiGenerator?: () => Promise<CoachingOutput>): Promise<CoachingOutput> {
  if (aiGenerator) {
    try { const result = await aiGenerator(); return { ...result, generatedBy: "AI" as CoachingGeneratedBy }; }
    catch { /* deterministic fallback intentionally avoids logging learner content */ }
  }
  return buildDeterministicCoaching(input);
}

export function coachingScope(sessionId: string, organizationId: string) {
  return { sessionId, organizationId } as const;
}

export function coachingReadiness(status: string, hasEvaluation: boolean) {
  if (status !== "COMPLETED") return { ready: false, reason: "Simulation must be completed before coaching" } as const;
  if (!hasEvaluation) return { ready: false, reason: "Simulation evaluation is required before coaching" } as const;
  return { ready: true, reason: null } as const;
}

export function coachingIdentity(sessionId: string) {
  return { sessionId } as const;
}

export function canReadCoaching(role: UserRole, userId: string, learnerId: string) {
  return userId === learnerId || (["Owner", "Admin", "Trainer"] as UserRole[]).includes(role);
}
