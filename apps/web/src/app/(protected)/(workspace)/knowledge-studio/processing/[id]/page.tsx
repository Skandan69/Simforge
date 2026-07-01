import { ProcessingDetails } from "@/components/knowledge/processing-details";
export default async function ProcessingDetailsPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ProcessingDetails id={id} />; }
