"use client";

import { useState } from "react";
import Link from "next/link";
import { Archive, BookOpen, Database, FileStack, Plus, Search } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";
import { useKnowledgeStudio } from "./knowledge-context";
import { KnowledgeBaseDialog } from "./knowledge-base-dialog";
import { KnowledgeBaseGrid } from "./knowledge-base-grid";

export function KnowledgeDashboard() {
  const { dashboard, refresh } = useKnowledgeStudio();
  const [createOpen, setCreateOpen] = useState(false);
  const stats = [
    { label: "Knowledge Bases", value: dashboard.totals.knowledgeBases, icon: BookOpen },
    { label: "Active", value: dashboard.totals.activeKnowledgeBases, icon: Database },
    { label: "Documents", value: dashboard.totals.documents, icon: FileStack },
    { label: "Storage", value: formatBytes(dashboard.totals.storageBytes), icon: Archive },
  ];
  return <div className="space-y-8"><PageHeading eyebrow="Knowledge Studio" title="Knowledge foundation" description="Organize governed source documents by department. Files remain untouched until a future processing sprint." action={dashboard.canEdit ? <Button onClick={() => setCreateOpen(true)}><Plus />New knowledge base</Button> : undefined} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span></CardContent></Card>)}</div><div className="flex items-end justify-between"><div><h2 className="text-lg font-semibold">Recently updated</h2><p className="mt-1 text-sm text-muted-foreground">Your organization’s knowledge bases, ordered by latest change.</p></div><Button asChild variant="ghost"><Link href="/knowledge-studio/search"><Search />Search metadata</Link></Button></div><KnowledgeBaseGrid knowledgeBases={dashboard.knowledgeBases.slice(0, 6)} canEdit={dashboard.canEdit} onChanged={refresh} /><KnowledgeBaseDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={refresh} /></div>;
}
