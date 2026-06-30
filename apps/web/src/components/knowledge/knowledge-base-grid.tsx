"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import type { KnowledgeBaseSummary } from "@simforge/shared";
import { KnowledgeBaseCard } from "./knowledge-base-card";

export function KnowledgeBaseGrid({ knowledgeBases, canEdit, onChanged }: { knowledgeBases: KnowledgeBaseSummary[]; canEdit: boolean; onChanged: () => Promise<void> }) {
  const [error, setError] = useState<string>();
  if (!knowledgeBases.length) return <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-card p-8 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><BookOpen className="size-5" /></span><h2 className="mt-4 font-semibold">No knowledge bases yet</h2><p className="mt-2 max-w-sm text-sm text-muted-foreground">Create a department-focused knowledge base to begin organizing approved documents.</p></div></div>;
  return <div className="space-y-4">{error && <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}<div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">{knowledgeBases.map((knowledgeBase) => <KnowledgeBaseCard key={knowledgeBase.id} knowledgeBase={knowledgeBase} canEdit={canEdit} onChanged={onChanged} onError={setError} />)}</div></div>;
}
