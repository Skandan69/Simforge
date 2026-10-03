import { AskSophiaView } from "@/components/sophia/ask-sophia-view";

export default async function AskSophiaPage({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string }>;
}) {
  const params = await searchParams;
  const documentId = params.documentId;
  return (
    <AskSophiaView
      key={documentId ?? "all-knowledge"}
      initialDocumentId={documentId}
    />
  );
}
