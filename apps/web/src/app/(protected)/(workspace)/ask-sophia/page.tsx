import { AskSophiaView } from "@/components/sophia/ask-sophia-view";

export default async function AskSophiaPage({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string }>;
}) {
  const params = await searchParams;
  return <AskSophiaView initialDocumentId={params.documentId} />;
}
