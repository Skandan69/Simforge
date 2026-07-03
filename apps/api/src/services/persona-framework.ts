import type { EnterprisePersonaTemplate } from "@simforge/shared";

const list = (label: string, values: string[]) => `${label}: ${values.join("; ")}`;

export function personaTemplateToSimulationPersona(template: EnterprisePersonaTemplate) {
  return {
    name: template.displayName,
    role: template.role,
    personality: `${template.emotionalTone}. ${template.communicationStyle}. Patience: ${template.patienceLevel}. Cooperation: ${template.cooperationLevel}.`,
    tone: `${template.communicationStyle}; ${template.emotionalTone}`,
    difficultyBehavior: `Challenge level: ${template.challengeLevel}. Escalation behaviour: ${template.escalationBehavior}`,
    backgroundContext: [
      template.description,
      `Industry: ${template.industry}`,
      list("Conversation objectives", template.conversationObjectives),
      list("Allowed behaviours", template.allowedBehaviors),
      list("Forbidden behaviours", template.forbiddenBehaviors),
      list("Role integrity", template.roleIntegrityRules),
    ].join("\n"),
  };
}
