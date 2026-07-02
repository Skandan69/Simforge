import {
  WORKFORCE_CAPABILITIES,
  type CapabilityScoreResponse,
  type SimulationMessageResponse,
} from "@simforge/shared";

export function visibleConversationMessages(
  messages: SimulationMessageResponse[],
) {
  return messages.filter((message) => message.role !== "system");
}

export function sortCapabilityScores(scores: CapabilityScoreResponse[]) {
  const order = new Map(
    WORKFORCE_CAPABILITIES.map((name, index) => [name, index]),
  );
  return [...scores].sort(
    (left, right) =>
      (order.get(left.capabilityName) ?? 99) -
      (order.get(right.capabilityName) ?? 99),
  );
}

export function conversationRoleLabel(role: SimulationMessageResponse["role"]) {
  if (role === "ai") return "Sophia";
  if (role === "learner") return "You";
  return "System";
}
