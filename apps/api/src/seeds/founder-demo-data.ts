import { WORKFORCE_CAPABILITIES } from "@simforge/shared";

export const FOUNDER_DEMO_IDS = {
  organization: "10000000-0000-4000-8000-000000000001",
  knowledgeBase: "10000000-0000-4000-8000-000000000002",
  persona: "10000000-0000-4000-8000-000000000003",
  simulation: "10000000-0000-4000-8000-000000000004",
} as const;

export const founderDemoBlueprint = {
  industry: "Customer Support / SaaS",
  teamSizeRange: "51–200",
  primaryTrainingGoals: ["Customer Service", "Compliance", "Communication", "Leadership"],
  priorityCapabilities: WORKFORCE_CAPABILITIES.map((capability) => ({ capability, priority: "High" as const })),
  criticalDocumentsNotes: "Refund policy, escalation SOP, empathy guidance, shipping response guide, and identity verification SOP.",
  successDefinition: "Employees should resolve customer issues professionally while following policy and escalating correctly.",
  costlyMistakes: "Approving refunds outside policy, sounding rude, failing to escalate high-risk cases.",
  nonNegotiables: "Follow refund policy, verify customer issue, use empathetic language, escalate exceptions.",
} as const;

export const founderDemoDocuments = [
  {
    id: "10000000-0000-4000-8000-000000000101", sourceId: "10000000-0000-4000-8000-000000000201", fileName: "Refund Policy.docx", title: "Refund Policy",
    content: "Refund requests are eligible within 30 calendar days of delivery when the item is unused or defective. Agents must verify the order, delivery date, payment method, and reason before approving a refund. Requests outside the window require supervisor review. Agents must not promise an exception or issue an unauthorized refund.",
    sections: [
      { id: "10000000-0000-4000-8000-000000000301", title: "Refund eligibility", summary: "Refunds are normally available within 30 calendar days for unused or defective items after order details are verified.", sectionType: "Policy", importance: "Critical", confidence: 0.96, keywords: ["refund", "eligibility", "30 days", "verification"], capabilities: ["Policy Compliance", "Product Knowledge", "Decision Making"] },
      { id: "10000000-0000-4000-8000-000000000302", title: "Refund exceptions", summary: "Requests outside the return window require supervisor review; agents cannot promise exceptions or issue unauthorized refunds.", sectionType: "Compliance", importance: "Critical", confidence: 0.97, keywords: ["exception", "supervisor", "unauthorized refund"], capabilities: ["Policy Compliance", "Decision Making"] },
    ],
  },
  {
    id: "10000000-0000-4000-8000-000000000102", sourceId: "10000000-0000-4000-8000-000000000202", fileName: "Escalation SOP.docx", title: "Escalation SOP",
    content: "Escalate when a customer requests a policy exception, threatens legal action, reports fraud or safety risk, or remains unresolved after two documented resolution attempts. Summarize the issue, actions taken, customer impact, and requested outcome. Tell the customer what will happen next and never transfer without context.",
    sections: [
      { id: "10000000-0000-4000-8000-000000000303", title: "When to escalate", summary: "Escalate policy exceptions, legal threats, fraud, safety risks, and cases unresolved after two documented attempts.", sectionType: "Procedure", importance: "Critical", confidence: 0.95, keywords: ["escalation", "exception", "fraud", "safety"], capabilities: ["Decision Making", "Problem Solving", "Policy Compliance"] },
      { id: "10000000-0000-4000-8000-000000000304", title: "Escalation handoff", summary: "Provide issue context, actions already taken, customer impact, and the requested outcome before transferring ownership.", sectionType: "BestPractice", importance: "Important", confidence: 0.92, keywords: ["handoff", "context", "customer impact"], capabilities: ["Communication", "Problem Solving"] },
    ],
  },
  {
    id: "10000000-0000-4000-8000-000000000103", sourceId: "10000000-0000-4000-8000-000000000203", fileName: "Customer Empathy Guidelines.docx", title: "Customer Empathy Guidelines",
    content: "Acknowledge the customer's frustration before explaining policy. Use specific language such as: I understand the delay has disrupted your plans. Avoid scripted apologies, blame, or promises you cannot keep. Confirm the outcome the customer needs, explain the available options, and check understanding before closing.",
    sections: [
      { id: "10000000-0000-4000-8000-000000000305", title: "Evidence-based empathy", summary: "Acknowledge the specific customer impact before explaining policy, then confirm the outcome they need.", sectionType: "BestPractice", importance: "Important", confidence: 0.94, keywords: ["empathy", "frustration", "customer impact"], capabilities: ["Empathy", "Communication"] },
      { id: "10000000-0000-4000-8000-000000000306", title: "Professional language", summary: "Avoid scripted apologies, blame, and promises that cannot be kept; explain available options and confirm understanding.", sectionType: "BestPractice", importance: "Important", confidence: 0.91, keywords: ["language", "options", "understanding"], capabilities: ["Communication", "Empathy"] },
    ],
  },
  {
    id: "10000000-0000-4000-8000-000000000104", sourceId: "10000000-0000-4000-8000-000000000204", fileName: "Shipping Delay Response Guide.docx", title: "Shipping Delay Response Guide",
    content: "Verify the order number, promised delivery date, carrier status, and latest scan. Explain confirmed facts without guessing. Offer the approved next step: wait for the carrier update, replace an eligible order, or escalate a high-value or time-sensitive delivery. Set a clear follow-up time and document the commitment.",
    sections: [
      { id: "10000000-0000-4000-8000-000000000307", title: "Shipping delay diagnosis", summary: "Verify order details, delivery promise, carrier status, and latest scan before discussing resolution options.", sectionType: "Procedure", importance: "Important", confidence: 0.93, keywords: ["shipping", "carrier", "delivery", "verification"], capabilities: ["Product Knowledge", "Problem Solving"] },
      { id: "10000000-0000-4000-8000-000000000308", title: "Delay resolution and follow-up", summary: "Use an approved resolution, set a clear follow-up time, and document the commitment without guessing.", sectionType: "Procedure", importance: "Important", confidence: 0.9, keywords: ["resolution", "follow-up", "commitment"], capabilities: ["Communication", "Decision Making", "Problem Solving"] },
    ],
  },
  {
    id: "10000000-0000-4000-8000-000000000105", sourceId: "10000000-0000-4000-8000-000000000205", fileName: "Customer Identity Verification SOP.docx", title: "Customer Identity Verification SOP",
    content: "Before discussing account details or changing an order, verify two approved factors: order number plus billing postal code, or account email plus one-time verification code. Never request a password or full payment card number. If verification fails twice, stop the change and escalate through the account security queue.",
    sections: [
      { id: "10000000-0000-4000-8000-000000000309", title: "Approved identity factors", summary: "Verify two approved factors before discussing account details or changing an order; never request passwords or full card numbers.", sectionType: "Compliance", importance: "Critical", confidence: 0.98, keywords: ["identity", "verification", "account security"], capabilities: ["Policy Compliance", "Communication"] },
      { id: "10000000-0000-4000-8000-000000000310", title: "Failed verification", summary: "After two failed verification attempts, stop the requested change and escalate through the account security queue.", sectionType: "Procedure", importance: "Critical", confidence: 0.96, keywords: ["failed verification", "security", "escalation"], capabilities: ["Policy Compliance", "Decision Making"] },
    ],
  },
] as const;

export const founderDemoSimulation = {
  title: "Angry customer requesting refund after return window",
  description: "Practice responding to an upset customer whose refund request falls outside the standard return window.",
  industry: "Customer Support / SaaS", department: "Customer Support", jobRole: "Customer Support Associate", category: "Refund and escalation", difficulty: "Advanced" as const, status: "Active" as const, estimatedMinutes: 10,
  scenarioSetup: "The customer received an item 38 days ago and is angry that the refund request was rejected. The customer insists on an immediate refund and threatens to post publicly. The learner must acknowledge the frustration, verify relevant details, explain the policy, avoid an unauthorized refund, and escalate the exception correctly.",
  successCriteria: "The learner uses specific empathetic language, verifies the issue, explains the 30-day policy clearly, does not promise an exception, and offers a supervisor escalation with an accurate handoff.",
  objectives: ["Acknowledge the customer's frustration with specific empathetic language", "Explain refund eligibility accurately", "Avoid promising or issuing an unauthorized refund", "Escalate the exception with complete context"],
  persona: { name: "Angry customer", role: "Customer requesting an exception", personality: "Frustrated, skeptical, and focused on immediate resolution", tone: "Direct and upset", difficultyBehavior: "Challenges vague explanations and becomes more frustrated if the learner sounds scripted or avoids the policy.", backgroundContext: "The return window expired eight days ago. The customer believes the delay was reasonable and expects an exception." },
  evaluationCriteria: ["Communication", "Policy Compliance", "Empathy", "Decision Making", "Problem Solving"],
} as const;
