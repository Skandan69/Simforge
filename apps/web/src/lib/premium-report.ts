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

function evidenceForCapability(messages: SimulationMessageResponse[], capability: string) {
  const learners = learnerMessages(messages);
  for (const message of learners) {
    const indicator = deriveLiveCoachingIndicators([message.content]).find(
      (item) => item.capability === capability,
    );
    if (indicator && (indicator.evidenceCount || indicator.riskCount)) return excerpt(message.content);
  }
  return learners[0] ? excerpt(learners[0].content) : "No learner statement was available for this observation.";
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
  const strongest = sortedScores[0];
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

  const strengthDetails = evaluation.strengths.slice(0, 3).map((strength, index) => {
    const score = sortedScores[index] ?? strongest;
    return {
      title: strength,
      capability: score?.capabilityName ?? "Observed behaviour",
      evidence: score ? evidenceForCapability(session.messages, score.capabilityName) : evidenceForCapability(session.messages, "Communication"),
    };
  });
  const missedOpportunities = evaluation.improvementAreas.slice(0, 3).map((area, index) => {
    const score = [...sortedScores].reverse()[index] ?? priority;
    return {
      title: area,
      capability: score?.capabilityName ?? "Priority behaviour",
      evidence: score ? evidenceForCapability(session.messages, score.capabilityName) : evidenceForCapability(session.messages, "Communication"),
      recommendation: score?.recommendation ?? evaluation.recommendedNextPractice,
    };
  });

  const knowledge = liveSnapshot.find((item) => item.capability === "Knowledge Usage")!;
  const policy = liveSnapshot.find((item) => item.capability === "Policy Compliance")!;
  const knowledgeEvidence = evidenceForCapability(session.messages, knowledge.evidenceCount || knowledge.riskCount ? "Knowledge Usage" : "Policy Compliance");

  return {
    overallRating,
    executiveSummary: {
      overview: `${overallRating} performance across the completed ${session.simulation.title} simulation.`,
      primaryStrength: strongest ? `${strongest.capabilityName}: ${strongest.evidence}` : evaluation.strengths[0],
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
