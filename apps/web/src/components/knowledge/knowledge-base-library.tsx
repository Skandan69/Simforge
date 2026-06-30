"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Archive, Building2, CalendarDays } from "lucide-react";
import type { DocumentSummary, KnowledgeBaseDetail } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentList } from "./document-list";
import { DocumentUpload } from "./document-upload";
import { useKnowledgeStudio } from "./knowledge-context";

export function KnowledgeBaseLibrary({ id }: { id: string }) {
  const { dashboard, refresh: refreshDashboard } = useKnowledgeStudio();
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseDetail>();
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    const [base, docs] = await Promise.all([
      apiFetch<KnowledgeBaseDetail>(`/api/knowledge-bases/${id}`),
      apiFetch<DocumentSummary[]>(`/api/documents?knowledgeBaseId=${encodeURIComponent(id)}`),
    ]);
    setKnowledgeBase(base);
    setDocuments(docs);
    setError(undefined);
  }, [id]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      apiFetch<KnowledgeBaseDetail>(`/api/knowledge-bases/${id}`),
      apiFetch<DocumentSummary[]>(`/api/documents?knowledgeBaseId=${encodeURIComponent(id)}`),
    ]).then(([base, docs]) => { if (active) { setKnowledgeBase(base); setDocuments(docs); } }).catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load the document library."); });
    return () => { active = false; };
  }, [id]);

  async function afterUpload() {
    await Promise.all([load(), refreshDashboard()]);
  }

  if (error) return <div className="rounded-xl border bg-card p-8 text-center"><h1 className="font-semibold">Document library unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-5" onClick={() => void load()}>Try again</Button></div>;
  if (!knowledgeBase) return <div className="grid min-h-80 place-items-center rounded-xl border bg-card text-sm text-muted-foreground">Loading document library…</div>;

  const canUpload = dashboard.canEdit && knowledgeBase.status === "Active";
  return <div className="space-y-7"><Button asChild variant="ghost" size="sm" className="-ml-2"><Link href="/knowledge-studio/knowledge-bases"><ArrowLeft />Knowledge Bases</Link></Button><section className="rounded-2xl border bg-card p-6 shadow-sm"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><Badge variant={knowledgeBase.status === "Active" ? "success" : "secondary"}>{knowledgeBase.status}</Badge><span className="text-xs font-semibold uppercase tracking-wider text-primary">{knowledgeBase.department}</span></div><h1 className="mt-3 text-2xl font-semibold tracking-tight">{knowledgeBase.name}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{knowledgeBase.description}</p></div><div className="grid shrink-0 gap-2 text-xs text-muted-foreground"><span className="flex items-center gap-2"><Building2 className="size-4" />Created by {knowledgeBase.createdBy.name}</span><span className="flex items-center gap-2"><CalendarDays className="size-4" />Updated {formatDate(knowledgeBase.updatedAt)}</span></div></div></section>{dashboard.canEdit && <Card><CardHeader><CardTitle className="text-base">Upload documents</CardTitle></CardHeader><CardContent>{knowledgeBase.status === "Archived" ? <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300"><Archive className="size-5" />Restore this knowledge base before uploading new documents.</div> : <DocumentUpload organizationId={knowledgeBase.organizationId} knowledgeBaseId={knowledgeBase.id} disabled={!canUpload} onComplete={afterUpload} />}</CardContent></Card>}<section><div className="mb-4"><h2 className="text-lg font-semibold">Document library</h2><p className="mt-1 text-sm text-muted-foreground">{documents.length} {documents.length === 1 ? "document" : "documents"} · metadata and original files only</p></div><DocumentList documents={documents} /></section></div>;
}
