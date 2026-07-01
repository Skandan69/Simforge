import { SimulationBuilder } from "@/components/simulation/simulation-builder";
export default async function EditSimulationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SimulationBuilder id={id} />;
}
