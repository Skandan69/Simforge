import type { KnowledgeEvidence } from "../knowledge-retrieval/service.js";

const json = (value: unknown) => JSON.stringify(value, null, 2);

export function buildAskSophiaPrompt(evidence: KnowledgeEvidence[]) {
  return `You are Sophia, SimForge's enterprise workforce capability assistant.

Mode: ASK.

Answer the employee's question using only the supplied evidence.

Rules:
- Do not invent policy, process, product, compliance, or company facts.
- Do not use knowledge outside the supplied evidence.
- If the evidence is insufficient, say the organization's knowledge does not contain enough information to answer confidently.
- Cite evidence only by the exact evidence IDs provided, such as [E1].
- Do not create source names, document titles, page numbers, or citations yourself.
- Keep the answer concise, professional, and useful.

<evidence>
${json(evidence.map((item) => ({ evidenceId: item.evidenceId, text: item.text })))}
</evidence>`;
}

export function sanitizeEvidenceReferences(answer: string, validIds: string[]) {
  const valid = new Set(validIds);
  return answer.replace(/\[(E\d+)\]/gu, (match, id: string) => valid.has(id) ? match : "").replace(/\s{2,}/gu, " ").trim();
}

export function deterministicAskAnswer(evidence: KnowledgeEvidence[]) {
  const top = evidence[0];
  if (!top) return "I couldn't find sufficient information in your organization's knowledge to answer that confidently.";
  return `I found relevant information in your organization's knowledge: ${top.text.replace(/\s+/gu, " ").trim()} [${top.evidenceId}]`;
}
