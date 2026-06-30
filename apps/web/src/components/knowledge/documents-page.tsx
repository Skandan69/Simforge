"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import type { DocumentSummary } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { PageHeading } from "@/components/layout/page-heading";
import { DocumentList } from "./document-list";

export function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>();
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void apiFetch<DocumentSummary[]>("/api/documents").then((result) => { if (active) setDocuments(result); }).catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load documents."); });
    return () => { active = false; };
  }, []);

  const filtered = documents?.filter((document) => document.fileName.toLowerCase().includes(search.toLowerCase()) || document.knowledgeBase.name.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-7"><PageHeading title="Documents" description="Every file stored across your organization’s knowledge bases." /><div className="relative max-w-lg"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter loaded documents" /></div>{error ? <div className="rounded-xl border bg-card p-8 text-center text-sm text-destructive">{error}</div> : !filtered ? <div className="grid min-h-60 place-items-center rounded-xl border bg-card text-sm text-muted-foreground">Loading documents…</div> : <DocumentList documents={filtered} />}</div>;
}
