"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { KnowledgeSearchResponse } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeading } from "@/components/layout/page-heading";
import { DocumentList } from "./document-list";
import { KnowledgeBaseGrid } from "./knowledge-base-grid";

export function KnowledgeSearch() {
  const [result, setResult] = useState<KnowledgeSearchResponse>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("query")).trim();
    if (!query) return;
    setPending(true);
    setError(undefined);
    try { setResult(await apiFetch<KnowledgeSearchResponse>(`/api/knowledge-search?q=${encodeURIComponent(query)}`)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Search failed."); }
    finally { setPending(false); }
  }

  return <div className="space-y-8"><PageHeading title="Metadata search" description="Search file names, knowledge base names, and departments. Document contents are not inspected." /><form onSubmit={search} className="flex max-w-2xl gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input name="query" className="pl-9" placeholder="Search by file, knowledge base, or department" required /></div><Button type="submit" disabled={pending}>{pending ? "Searching…" : "Search"}</Button></form>{error && <p className="text-sm text-destructive">{error}</p>}{!result ? <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-card p-8 text-center"><div><Search className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">Search governed metadata</h2><p className="mt-1 text-sm text-muted-foreground">No AI search or document-content processing is active.</p></div></div> : <div className="space-y-8"><section><h2 className="mb-4 text-lg font-semibold">Knowledge Bases ({result.knowledgeBases.length})</h2><KnowledgeBaseGrid knowledgeBases={result.knowledgeBases} canEdit={false} onChanged={async () => undefined} /></section><section><h2 className="mb-4 text-lg font-semibold">Documents ({result.documents.length})</h2><DocumentList documents={result.documents} /></section></div>}</div>;
}
