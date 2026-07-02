import { SophiaSimulationRun } from "@/components/simulation/sophia-simulation-run";
export default async function RunSimulationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ start?: string }>;
}) {
  const { id } = await params;
  const { start } = await searchParams;
  return <SophiaSimulationRun simulationId={id} autoStart={start === "true"} />;
}
