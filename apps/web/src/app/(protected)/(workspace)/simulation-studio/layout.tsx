import { SimulationShell } from "@/components/simulation/simulation-shell";
export default function SimulationStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SimulationShell>{children}</SimulationShell>;
}
