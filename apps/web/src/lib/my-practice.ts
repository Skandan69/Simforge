import type { MyPracticeAssignmentResponse } from "@simforge/shared";

export function practiceActionHref(assignment: MyPracticeAssignmentResponse) {
  if (assignment.canContinue && assignment.session?.id) {
    return `/simulation-studio/simulations/${assignment.simulation.id}/run?sessionId=${assignment.session.id}&assignmentId=${assignment.assignmentId}`;
  }
  if (assignment.canStart) {
    return `/simulation-studio/simulations/${assignment.simulation.id}/run?start=true&assignmentId=${assignment.assignmentId}`;
  }
  if (assignment.reportAvailable && assignment.session?.id) {
    return `/simulation-studio/sessions/${assignment.session.id}/report`;
  }
  return null;
}

export function practiceActionLabel(assignment: MyPracticeAssignmentResponse) {
  if (assignment.canContinue) return "Continue practice";
  if (assignment.canStart) return "Start practice";
  if (assignment.reportAvailable) return assignment.coachAvailable ? "View coaching report" : "View report";
  return null;
}

export function practiceStatusLabel(status: MyPracticeAssignmentResponse["status"]) {
  switch (status) {
    case "ASSIGNED":
      return "Needs attention";
    case "IN_PROGRESS":
      return "In progress";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
  }
}
