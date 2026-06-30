import { KnowledgeShell } from "@/components/knowledge/knowledge-shell";

export default function KnowledgeStudioLayout({ children }: { children: React.ReactNode }) {
  return <KnowledgeShell>{children}</KnowledgeShell>;
}
