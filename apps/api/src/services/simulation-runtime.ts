import { WORKFORCE_CAPABILITIES, type SimulationStatus, type UserRole } from "@simforge/shared";

const capabilityAdjustments = [4, 1, 0, 3, 2, -1] as const;

export function sessionScope(id: string, organizationId: string) {
  return { id, organizationId };
}

export function canReadSession(
  role: UserRole,
  userId: string,
  learnerId: string,
) {
  return role !== "Learner" || userId === learnerId;
}

export function canEvaluateSession(
  role: UserRole,
  userId: string,
  learnerId: string,
) {
  return (
    userId === learnerId ||
    (["Owner", "Admin", "Trainer"] as UserRole[]).includes(role)
  );
}

/**
 * Decides whether a session may be (re-)evaluated.
 * - In-progress sessions can be evaluated by the learner or staff.
 * - Completed practice sessions can only be re-evaluated by staff.
 * - Completed assessment sessions are final: nobody can re-grade them,
 *   otherwise a learner could call /evaluate until the grader passes them.
 */
export function evaluationAllowance(
  status: "IN_PROGRESS" | "COMPLETED" | "FAILED",
  role: UserRole,
  isAssessment: boolean,
): { allowed: true; claimableStatuses: ("IN_PROGRESS" | "COMPLETED")[] } | { allowed: false; reason: "SESSION_FAILED" | "SESSION_ALREADY_EVALUATED" } {
  if (status === "FAILED") return { allowed: false, reason: "SESSION_FAILED" };
  const isStaff = (["Owner", "Admin", "Trainer"] as UserRole[]).includes(role);
  if (status === "COMPLETED" && (isAssessment || !isStaff))
    return { allowed: false, reason: "SESSION_ALREADY_EVALUATED" };
  return { allowed: true, claimableStatuses: !isAssessment && isStaff ? ["IN_PROGRESS", "COMPLETED"] : ["IN_PROGRESS"] };
}

export function canStartSimulation(role: UserRole, status: SimulationStatus) {
  return status === "Active" ||
    (status === "Draft" && (["Owner", "Admin", "Trainer"] as UserRole[]).includes(role));
}

export function createPlaceholderAiResponse(simulationTitle: string) {
  return `This is the configured ${simulationTitle} practice scenario. I have recorded your response. Please continue with the next action you would take.`;
}

export function createPlaceholderOpeningMessage(
  simulationTitle: string,
  personaRole?: string,
) {
  return personaRole
    ? `You are speaking with the ${personaRole} in the ${simulationTitle} scenario. They are waiting for your response. What do you say first?`
    : `Welcome to ${simulationTitle}. Review the scenario and begin by explaining the first action you would take.`;
}

export function buildDeterministicEvaluation(learnerMessages: string[]) {
  const combined = learnerMessages.join(" ").trim();
  const wordCount = combined ? combined.split(/\s+/u).length : 0;
  const baseScore = Math.min(
    85,
    Math.max(40, 48 + learnerMessages.length * 6 + Math.floor(wordCount / 8)),
  );
  const capabilityScores = WORKFORCE_CAPABILITIES.map(
    (capabilityName, index) => {
      const score = Math.min(
        100,
        Math.max(0, baseScore + capabilityAdjustments[index]),
      );
      return {
        capabilityName,
        score,
        evidence: `${learnerMessages.length} learner response${learnerMessages.length === 1 ? " was" : "s were"} available for deterministic review.`,
        recommendation: `Practice ${capabilityName.toLowerCase()} with a trainer-reviewed scenario and specific behavioral evidence.`,
      };
    },
  );
  const overallScore = Math.round(
    capabilityScores.reduce((total, item) => total + item.score, 0) /
      capabilityScores.length,
  );
  return {
    overallScore,
    strengths:
      overallScore >= 65
        ? [
            "Maintained engagement through the practice exchange",
            "Provided enough detail to assess multiple capabilities",
          ]
        : ["Started the scenario and provided an assessable response"],
    improvementAreas: [
      "Use more specific evidence and explicit next steps",
      "Confirm policy and product details before deciding",
    ],
    evidence: capabilityScores.map((item) => ({
      capability: item.capabilityName,
      observation: item.evidence,
    })),
    recommendedNextPractice:
      "Repeat this scenario with a trainer and focus on one observable behavior from each improvement area.",
    capabilityScores,
  };
}
