"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Loader2 } from "lucide-react";
import type { DocumentKnowledgeIntelligenceResponse } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function KnowledgeIntelligencePanel({ documentId, processingStatus }: { documentId: string; processingStatus: string }) {
  const [data, setData] = useState<DocumentKnowledgeIntelligenceResponse>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (processingStatus !== "Completed") return;
    let active = true;
    void apiFetch<DocumentKnowledgeIntelligenceResponse>(`/api/documents/${documentId}/intelligence`)
      .then((result) => { if (active) setData(result); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load knowledge intelligence."); });
    return () => { active = false; };
  }, [documentId, processingStatus]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><BrainCircuit className="size-5 text-primary" />Knowledge Intelligence</CardTitle>
            <CardDescription className="mt-1">Suggested classifications for review. These are not approved organizational truth.</CardDescription>
          </div>
          <Badge variant="outline">AI suggestion · v0.1</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {processingStatus !== "Completed" ? (
          <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Suggestions will appear after document processing completes.</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !data ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading intelligence suggestions…</div>
        ) : data.sections.length === 0 ? (
          <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">No sections could be identified in this document.</p>
        ) : (
          <div className="space-y-3">
            {data.sections.map((section) => (
              <article key={section.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Section {section.sectionNumber}</p>
                    <h3 className="mt-1 font-medium">{section.title}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{section.sectionType.replace(/([a-z])([A-Z])/g, "$1 $2")}</Badge>
                    <Badge variant="outline">{section.importance}</Badge>
                    <Badge variant="outline">{Math.round(section.confidence * 100)}% confidence</Badge>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{section.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {section.capabilities.map((capability) => <Badge key={capability} variant="outline">{capability}</Badge>)}
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
