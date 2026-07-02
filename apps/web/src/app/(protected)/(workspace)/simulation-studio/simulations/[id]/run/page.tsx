import { SophiaSimulationRun } from "@/components/simulation/sophia-simulation-run";
export default async function RunSimulationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SophiaSimulationRun simulationId={id} />;
}
