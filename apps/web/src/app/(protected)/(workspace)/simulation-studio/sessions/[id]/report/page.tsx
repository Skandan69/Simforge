import { SimulationCapabilityReport } from "@/components/simulation/simulation-capability-report";
export default async function SimulationReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SimulationCapabilityReport sessionId={id} />;
}
