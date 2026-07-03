import { PremiumSimulationReport } from "@/components/simulation/premium-simulation-report";
export default async function SimulationReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PremiumSimulationReport sessionId={id} />;
}
