import { SophiaSimulationRun } from "@/components/simulation/sophia-simulation-run";
export default async function RunSimulationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ start?: string; assignmentId?: string; assessmentAssignmentId?: string; sessionId?: string }>;
}) {
  const { id } = await params;
  const { start, assignmentId, assessmentAssignmentId, sessionId } = await searchParams;
  return <SophiaSimulationRun simulationId={id} autoStart={start === "true"} assignmentId={assignmentId} assessmentAssignmentId={assessmentAssignmentId} sessionId={sessionId} />;
}
