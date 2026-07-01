import { SimulationPreview } from "@/components/simulation/simulation-preview";
export default async function SimulationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SimulationPreview id={id} />;
}
