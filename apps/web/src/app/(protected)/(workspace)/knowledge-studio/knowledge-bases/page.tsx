"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/layout/page-heading";
import { KnowledgeBaseDialog } from "@/components/knowledge/knowledge-base-dialog";
import { KnowledgeBaseGrid } from "@/components/knowledge/knowledge-base-grid";
import { useKnowledgeStudio } from "@/components/knowledge/knowledge-context";

export default function KnowledgeBasesPage() {
  const { dashboard, refresh } = useKnowledgeStudio();
  const [createOpen, setCreateOpen] = useState(false);
  return <div className="space-y-7"><PageHeading title="Knowledge Bases" description="Department-owned collections of governed source documents." action={dashboard.canEdit ? <Button onClick={() => setCreateOpen(true)}><Plus />Create knowledge base</Button> : undefined} /><KnowledgeBaseGrid knowledgeBases={dashboard.knowledgeBases} canEdit={dashboard.canEdit} onChanged={refresh} /><KnowledgeBaseDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={refresh} /></div>;
}
