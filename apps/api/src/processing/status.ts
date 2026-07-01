import type { ProcessingStatus } from "@simforge/shared";

const transitions: Record<ProcessingStatus, ProcessingStatus[]> = {
  Uploaded: ["Queued"],
  Queued: ["Processing", "Cancelled"],
  Processing: ["Completed", "Failed", "Cancelled"],
  Completed: ["Queued"],
  Failed: ["Queued"],
  Cancelled: ["Queued"],
};

export function canTransitionProcessingStatus(from: ProcessingStatus, to: ProcessingStatus) {
  return transitions[from].includes(to);
}

export function isTerminalProcessingStatus(status: ProcessingStatus) {
  return status === "Completed" || status === "Failed" || status === "Cancelled";
}
