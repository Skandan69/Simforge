import { KnowledgeBaseLibrary } from "@/components/knowledge/knowledge-base-library";

export default async function KnowledgeBasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <KnowledgeBaseLibrary id={id} />;
}
