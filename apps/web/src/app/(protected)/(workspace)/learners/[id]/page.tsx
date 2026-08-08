import { LearnerDetailView } from "@/components/manager/learner-detail-view";

export default async function LearnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LearnerDetailView learnerId={id} />;
}
