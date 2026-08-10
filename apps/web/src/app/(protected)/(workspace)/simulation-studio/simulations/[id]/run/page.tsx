import { SophiaSimulationRun } from "@/components/simulation/sophia-simulation-run";
export default async function RunSimulationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ start?: string; assignmentId?: string; sessionId?: string }>;
}) {
  const { id } = await params;
  const { start, assignmentId, sessionId } = await searchParams;
  return <SophiaSimulationRun simulationId={id} autoStart={start === "true"} assignmentId={assignmentId} sessionId={sessionId} />;
}
