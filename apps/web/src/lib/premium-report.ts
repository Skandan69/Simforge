import type {
  CapabilityScoreResponse,
  SimulationMessageResponse,
  SimulationSessionResponse,
} from "@simforge/shared";
import {
  deriveCommunicationIndicators,
  deriveLiveCoachingIndicators,
} from "./live-evaluation";

export type ReportRating = "Needs attention" | "Developing" | "Consistent" | "Strong";

const capabilityContext: Record<string, { why: string; impact: string }> = {
  Empathy: {
    why: "Acknowledgement helps the counterpart feel heard before action is proposed.",
    impact: "Shapes trust, cooperation, and the learner's ability to de-escalate the interaction.",
  },
  "Active Listening": {
    why: "Accurate listening prevents the learner from solving the wrong problem.",
    impact: "Improves diagnosis quality and reduces repeated explanations or avoidable friction.",
  },
  Verification: {
    why: "Verification establishes reliable facts before a decision or commitment is made.",
    impact: "Reduces operational error and strengthens confidence in the proposed resolution.",
  },
  Confidence: {
    why: "Clear ownership gives the counterpart a credible path forward.",
    impact: "Improves clarity and reduces uncertainty about responsibilities and next steps.",
  },
  "Knowledge Usage": {
    why: "Relevant organizational knowledge makes the response accurate and explainable.",
    impact: "Connects learner decisions to approved guidance instead of unsupported assumptions.",
  },
  "Policy Compliance": {
    why: "Policy controls protect both the customer and the organization.",
    impact: "Reduces compliance risk and ensures exceptions follow the correct approval path.",
  },
  Communication: {
    why: "Clear communication helps the counterpart understand both the decision and next step.",
    impact: "Reduces ambiguity and supports a professional, efficient interaction.",
  },
  "Product Knowledge": {
    why: "Accurate product knowledge supports a relevant and credible resolution.",
    impact: "Reduces misinformation and unnecessary escalation.",
  },
  "Problem Solving": {
    why: "Structured problem solving connects evidence to an appropriate course of action.",
    impact: "Improves resolution quality and avoids premature conclusions.",
  },
  "Decision Making": {
    why: "Sound decisions balance evidence, policy, risk, and customer impact.",
    impact: "Creates a defensible next step while protecting service quality.",
  },
};

function excerpt(content: string, maximum = 180) {
  const normalized = content.replace(/\s+/gu, " ").trim();
  return normalized.length > maximum ? `${normalized.slice(0, maximum - 1).trimEnd()}…` : normalized;
}

export function qualitativePerformance(score: number): ReportRating {
  if (score >= 85) return "Strong";
  if (score >= 75) return "Consistent";
  if (score >= 60) return "Developing";
  return "Needs attention";
}

function learnerMessages(messages: SimulationMessageResponse[]) {
  return messages.filter((message) => message.role === "learner");
}

const capabilityEvidencePatterns: Record<string, RegExp> = {
  Empathy: /\b(?:understand|sorry|appreciate|frustrat|upset|concern|hear you|reassure|don(?:'t|t| not) worry)\b/iu,
  Verification: /\b(?:verify|confirm|identity|account|order|transaction|charge dates?|amounts?|email|phone|address|details?)\b/iu,
  "Policy Compliance": /\b(?:policy|procedure|eligib|approval|authoriz|escalat|documented guidance|required|must verify|before (?:approving|processing|confirming))\b/iu,
  "Knowledge Usage": /\b(?:policy|procedure|knowledge base|documented guidance|refund rules?|return window|eligib|service agreement|company process)\b/iu,
  "Product Knowledge": /\b(?:product|feature|subscription|plan|coverage|service agreement|refund rules?|return window|eligib|account type)\b/iu,
  "Decision Making": /\b(?:because|therefore|based on|after (?:confirming|verifying|reviewing)|before (?:deciding|approving|processing)|the next step|available options?|i (?:will|would) (?:escalate|approve|decline))\b/iu,
  "Problem Solving": /\b(?:first.+then|investigat|root cause|available options?|identify (?:the )?(?:issue|cause)|after (?:confirming|verifying).+(?:resolve|next step))\b/iu,
  Confidence: /\b(?:i will|i can help|i(?:'ll| will) make sure|the next step|let me (?:verify|confirm|check|review))\b/iu,
  "Active Listening": /\b(?:if i understand|let me make sure|you mentioned|what i(?:'m| am) hearing|is that correct|could you clarify)\b/iu,
  Communication: /\S+(?:\s+\S+){3,}/u,
};

export function evidenceForCapability(messages: SimulationMessageResponse[], capability: string) {
  const pattern = capabilityEvidencePatterns[capability];
  if (!pattern) return "No strong evidence observed.";
  const match = learnerMessages(messages).find((message) => pattern.test(message.content));
  return match ? excerpt(match.content) : "No strong evidence observed.";
}

export function betterResponseFor(capability: string) {
  if (capability === "Empathy") return "I understand how frustrating this has been. Let me confirm the details so I can help with the right next step.";
  if (["Policy Compliance", "Product Knowledge", "Decision Making", "Verification"].includes(capability)) return "I can help with this. Before confirming the outcome, may I verify the dates and amounts of both charges?";
  if (capability === "Problem Solving") return "Let me confirm what happened first, then I will explain the available options and the next step.";
  return "I understand the concern. I will verify the relevant details and explain the next step clearly.";
}

export function buildReportCoachingFallback(session: SimulationSessionResponse) {
  const ranked = [...session.capabilityScores].sort((left, right) => right.score - left.score);
  const strongest = ranked[0];
  const priority = ranked.at(-1);
  return {
    summary: `Based on the saved evaluation, ${strongest?.capabilityName ?? "one capability"} showed the clearest evidence. The next priority is ${priority?.capabilityName ?? "a more structured response"}.`,
    strength: strongest?.evidence ?? session.evaluation?.strengths[0] ?? "The learner completed an assessable practice conversation.",
    improvement: priority?.recommendation ?? session.evaluation?.improvementAreas[0] ?? "Verify relevant details before committing to an outcome.",
    betterResponse: betterResponseFor(priority?.capabilityName ?? "Communication"),
    nextPractice: session.evaluation?.recommendedNextPractice ?? "Repeat the scenario with a clear verification step and explicit next action.",
  };
}

function scoreForCapability(scores: CapabilityScoreResponse[], capability: string) {
  return scores.find((score) => score.capabilityName === capability)?.score;
}

export function buildPremiumReport(session: SimulationSessionResponse) {
  if (!session.evaluation) throw new Error("A completed evaluation is required to compose the premium report");
  const evaluation = session.evaluation;
  const learners = learnerMessages(session.messages);
  const liveSnapshot = deriveLiveCoachingIndicators(learners.map((message) => message.content));
  const communicationSnapshot = deriveCommunicationIndicators(learners.map((message) => message.content));
  const sortedScores = [...session.capabilityScores].sort((left, right) => right.score - left.score);
  const strongest = sortedScores.find((score) => evidenceForCapability(session.messages, score.capabilityName) !== "No strong evidence observed.");
  const priority = sortedScores.at(-1);
  const overallRating = qualitativePerformance(evaluation.overallScore);

  const timeline = [] as Array<{ title: string; detail: string; evidence: string }>;
  const opening = session.messages.find((message) => message.role === "ai");
  if (opening) timeline.push({ title: "Scenario concern introduced", detail: "Sophia established the counterpart's issue and invited a response.", evidence: excerpt(opening.content) });
  for (const message of learners) {
    const indicators = deriveLiveCoachingIndicators([message.content]);
    const signal = indicators.find((item) => item.riskCount > 0) ?? indicators.find((item) => item.evidenceCount > 0);
    if (!signal) continue;
    timeline.push({
      title: signal.riskCount ? `${signal.capability} opportunity identified` : `${signal.capability} demonstrated`,
      detail: signal.helper,
      evidence: excerpt(message.content),
    });
    if (timeline.length >= 6) break;
  }

  const observations = evaluation.evidence.slice(0, 6).map((item) => {
    const context = capabilityContext[item.capability] ?? capabilityContext.Communication;
    return {
      observation: item.observation,
      capability: item.capability,
      evidence: evidenceForCapability(session.messages, item.capability),
      whyItMattered: context.why,
      impact: context.impact,
    };
  });

  const supportedScores = sortedScores.filter((candidate) => evidenceForCapability(session.messages, candidate.capabilityName) !== "No strong evidence observed.");
  const strengthDetails = evaluation.strengths.slice(0, 3).flatMap((strength, index) => {
    const score = supportedScores[index];
    return score ? [{ title: strength, capability: score.capabilityName, evidence: evidenceForCapability(session.messages, score.capabilityName) }] : [];
  });
  const missedOpportunities = evaluation.improvementAreas.slice(0, 3).map((area, index) => {
    const score = [...sortedScores].reverse()[index] ?? priority;
    return {
      title: area,
      capability: score?.capabilityName ?? "Priority behaviour",
      evidence: score ? evidenceForCapability(session.messages, score.capabilityName) : evidenceForCapability(session.messages, "Communication"),
      recommendation: score?.recommendation ?? evaluation.recommendedNextPractice,
      betterResponse: betterResponseFor(score?.capabilityName ?? "Communication"),
    };
  });

  const knowledge = liveSnapshot.find((item) => item.capability === "Knowledge Usage")!;
  const policy = liveSnapshot.find((item) => item.capability === "Policy Compliance")!;
  const knowledgeEvidence = evidenceForCapability(session.messages, "Knowledge Usage");

  return {
    overallRating,
    executiveSummary: {
      overview: `${overallRating} performance across the completed ${session.simulation.title} simulation.`,
      primaryStrength: strongest ? `${strongest.capabilityName}: ${strongest.evidence}` : "No single capability had strong transcript evidence in this attempt.",
      priorityArea: priority ? `${priority.capabilityName}: ${priority.recommendation}` : evaluation.improvementAreas[0],
      coachingFocus: evaluation.recommendedNextPractice,
    },
    capabilitySnapshot: liveSnapshot.map((item) => ({
      ...item,
      state: item.state === "Not observed yet" && scoreForCapability(session.capabilityScores, item.capability) !== undefined
        ? qualitativePerformance(scoreForCapability(session.capabilityScores, item.capability)!)
        : item.state,
    })),
    communicationSnapshot,
    timeline,
    observations,
    strengths: strengthDetails,
    missedOpportunities,
    knowledgeUsage: {
      state: knowledge.state,
      policyState: policy.state,
      summary: knowledge.state === "Not observed yet"
        ? "No explicit reference to company knowledge or documented guidance was observed in the learner's responses."
        : knowledge.helper,
      evidence: knowledgeEvidence,
    },
    recommendedNextSimulation: {
      title: `Focused ${priority?.capabilityName ?? "capability"} practice`,
      rationale: evaluation.recommendedNextPractice,
      focus: priority?.recommendation ?? evaluation.improvementAreas[0],
    },
  };
}

export const reportEvidenceExcerpt = excerpt;
export const reportCapabilityContext = capabilityContext;
