export const LIVE_COACHING_CAPABILITIES = [
  "Empathy",
  "Active Listening",
  "Verification",
  "Confidence",
  "Knowledge Usage",
  "Policy Compliance",
] as const;

export type LiveCoachingCapability = (typeof LIVE_COACHING_CAPABILITIES)[number];
export type LiveCoachingState =
  | "Not observed yet"
  | "Developing"
  | "Observed"
  | "Improving"
  | "Consistent"
  | "Strong"
  | "Needs attention";

export interface LiveCoachingIndicator {
  capability: LiveCoachingCapability;
  state: LiveCoachingState;
  helper: string;
  evidenceCount: number;
  riskCount: number;
}

interface EvidenceRule {
  pattern: RegExp;
  helper: string;
}

const rules: Record<
  LiveCoachingCapability,
  { evidence: EvidenceRule[]; risks: EvidenceRule[] }
> = {
  Empathy: {
    evidence: [
      { pattern: /\b(?:i understand|i can understand|i appreciate|i hear how|that (?:must|sounds)|sorry (?:that|you)|frustrating|upsetting|concerning)\b/iu, helper: "Acknowledges the other person's experience." },
      { pattern: /\b(?:thank you for (?:explaining|sharing|letting me know)|i hear you)\b/iu, helper: "Responds with respectful acknowledgement." },
    ],
    risks: [
      { pattern: /\b(?:that(?:'s| is) not my concern|calm down|not a big deal|you(?:'re| are) overreacting|stop complaining|whatever)\b/iu, helper: "A response may dismiss the other person's concern." },
    ],
  },
  "Active Listening": {
    evidence: [
      { pattern: /\b(?:if i understand|let me make sure|so (?:you|the issue)|you mentioned|what i(?:'m| am) hearing|to confirm what you said)\b/iu, helper: "Checks or reflects the issue before acting." },
      { pattern: /\b(?:could you (?:clarify|tell me more)|when did|what happened|which charge|is that correct)\b/iu, helper: "Uses a focused follow-up question." },
    ],
    risks: [
      { pattern: /\b(?:that(?:'s| is) not (?:my concern|relevant)|i already know|stop repeating|it doesn(?:'t| not) matter|let(?:'s| us) move on)\b/iu, helper: "The concern may have been dismissed before it was understood." },
    ],
  },
  Verification: {
    evidence: [
      { pattern: /\b(?:verify|verification|confirm|validate|authenticate)\b.{0,45}\b(?:identity|account|email|phone|address|date|charge|transaction|order|details?)\b/iu, helper: "Requests or confirms information before deciding." },
      { pattern: /\b(?:can|could|may) i (?:confirm|verify|check)\b/iu, helper: "Introduces a clear verification step." },
      { pattern: /\b(?:can|could) you (?:provide|confirm|share)\b.{0,45}\b(?:date|charge|transaction|order|email|account|details?)\b/iu, helper: "Collects relevant details from the counterpart." },
    ],
    risks: [
      { pattern: /\b(?:skip|without|no need for|don(?:'t| not) need)\b.{0,35}\b(?:verification|verify|identity check|confirmation)\b/iu, helper: "A required verification step may be skipped." },
    ],
  },
  Confidence: {
    evidence: [
      { pattern: /\b(?:i will|i can take ownership|here(?:'s| is) what (?:i|we) (?:will|can)|the next step is|what i can do is|i(?:'ll| will) make sure)\b/iu, helper: "Communicates a clear, owned next step." },
    ],
    risks: [
      { pattern: /\b(?:i guess|maybe i can|i(?:'m| am) not sure|probably|i don(?:'t| not) know what to do)\b/iu, helper: "The next step may sound uncertain or unowned." },
    ],
  },
  "Knowledge Usage": {
    evidence: [
      { pattern: /\b(?:according to|our (?:policy|procedure|guidance|process)|the (?:policy|procedure|sop|guideline)|return window|refund policy|service agreement|knowledge base)\b/iu, helper: "Connects the response to relevant organizational knowledge." },
      { pattern: /\b(?:policy (?:states|allows|requires)|procedure requires|guidance says)\b/iu, helper: "Uses documented guidance to explain the response." },
    ],
    risks: [
      { pattern: /\b(?:i(?:'m| am) making this up|i don(?:'t| not) know the policy|forget the (?:policy|procedure))\b/iu, helper: "The response may not be grounded in known guidance." },
    ],
  },
  "Policy Compliance": {
    evidence: [
      { pattern: /\b(?:policy requires|must (?:first )?verify|before (?:i|we) can|within the (?:policy|return window)|cannot (?:approve|authorize|process)|need to escalate|escalate (?:this|the exception)|follow (?:the|our) (?:policy|procedure))\b/iu, helper: "Keeps the proposed action within policy or escalation boundaries." },
      { pattern: /\b(?:authorized exception|approval is required|identity (?:must be|is) verified)\b/iu, helper: "Recognizes a required control or approval." },
    ],
    risks: [
      { pattern: /\b(?:ignore|bypass|break) (?:the |our )?(?:policy|procedure)|(?:approve|process|issue) (?:it|the refund) anyway|skip (?:the )?(?:required )?verification\b/iu, helper: "The proposed action may bypass a policy control." },
    ],
  },
};

function qualitativeState(evidenceCount: number, riskCount: number): LiveCoachingState {
  if (!evidenceCount && !riskCount) return "Not observed yet";
  if (riskCount > evidenceCount) return "Needs attention";
  if (evidenceCount >= 4 && riskCount === 0) return "Strong";
  if (evidenceCount >= 3 && evidenceCount > riskCount + 1) return "Consistent";
  if (evidenceCount >= 2 && evidenceCount > riskCount) return "Improving";
  if (evidenceCount === 1 && riskCount === 0) return "Observed";
  return "Developing";
}

export function deriveLiveCoachingIndicators(
  learnerMessages: readonly string[],
): LiveCoachingIndicator[] {
  return LIVE_COACHING_CAPABILITIES.map((capability) => {
    const capabilityRules = rules[capability];
    let evidenceCount = 0;
    let riskCount = 0;
    let evidenceHelper: string | undefined;
    let riskHelper: string | undefined;

    for (const message of learnerMessages) {
      const evidence = capabilityRules.evidence.find(({ pattern }) => pattern.test(message));
      const risk = capabilityRules.risks.find(({ pattern }) => pattern.test(message));
      if (evidence) {
        evidenceCount += 1;
        evidenceHelper = evidence.helper;
      }
      if (risk) {
        riskCount += 1;
        riskHelper = risk.helper;
      }
    }

    const state = qualitativeState(evidenceCount, riskCount);
    const helper = state === "Not observed yet"
      ? "No clear evidence in the conversation yet."
      : state === "Needs attention"
        ? (riskHelper ?? "A possible risk needs attention in the next response.")
        : state === "Developing"
          ? "Evidence is mixed; the next response can strengthen this behavior."
          : (evidenceHelper ?? "Relevant behavior has been observed.");

    return { capability, state, helper, evidenceCount, riskCount };
  });
}

export const liveCoachingState = qualitativeState;
