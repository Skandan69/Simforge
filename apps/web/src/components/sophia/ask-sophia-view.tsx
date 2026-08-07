"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Loader2, MessageCircleQuestion, ShieldCheck } from "lucide-react";
import type { AskSophiaResponse, KnowledgeBaseSummary } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeading } from "@/components/layout/page-heading";
import { cn } from "@/lib/utils";

interface ConversationItem {
  id: string;
  question: string;
  response: AskSophiaResponse;
}

export function AskSophiaView() {
  const [question, setQuestion] = useState("");
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseSummary[]>([]);
  const [selectedKnowledgeBaseIds, setSelectedKnowledgeBaseIds] = useState<string[]>([]);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void apiFetch<KnowledgeBaseSummary[]>("/api/knowledge-bases?status=Active")
      .then(setKnowledgeBases)
      .catch(() => setKnowledgeBases([]));
  }, []);

  const scopedNames = useMemo(() => knowledgeBases.filter((base) => selectedKnowledgeBaseIds.includes(base.id)).map((base) => base.name), [knowledgeBases, selectedKnowledgeBaseIds]);

  function toggleScope(id: string) {
    setSelectedKnowledgeBaseIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function ask() {
    const value = question.trim();
    if (!value || loading) return;
    setLoading(true);
    setError(undefined);
    try {
      const response = await apiFetch<AskSophiaResponse>("/api/sophia/ask", {
        method: "POST",
        body: JSON.stringify({ question: value, knowledgeBaseIds: selectedKnowledgeBaseIds.length ? selectedKnowledgeBaseIds : undefined }),
      });
      setConversation((current) => [{ id: crypto.randomUUID(), question: value, response }, ...current]);
      setQuestion("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sophia could not answer right now.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="space-y-7">
    <PageHeading eyebrow="Sophia ASK mode" title="Ask Sophia" description="Ask questions about approved company knowledge. Sophia answers from retrieved evidence and shows sources when enough information is available." />

    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MessageCircleQuestion className="size-5 text-primary" />Ask company knowledge</CardTitle>
        <CardDescription>This is not a separate chatbot. It is Sophia operating in ASK mode over your governed Knowledge Studio content.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {knowledgeBases.length > 0 && <div className="space-y-2">
          <p className="text-sm font-medium">Knowledge scope</p>
          <div className="flex flex-wrap gap-2">
            {knowledgeBases.map((base) => <Button key={base.id} type="button" variant={selectedKnowledgeBaseIds.includes(base.id) ? "default" : "outline"} size="sm" onClick={() => toggleScope(base.id)}>{base.name}</Button>)}
          </div>
          <p className="text-xs text-muted-foreground">{scopedNames.length ? `Searching: ${scopedNames.join(", ")}` : "Searching all active knowledge bases."}</p>
        </div>}
        <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Example: What is our refund exception policy after seven days?" rows={4} aria-label="Ask Sophia a question" />
        {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button onClick={() => void ask()} disabled={loading || !question.trim()}>{loading && <Loader2 className="animate-spin" />}Ask Sophia</Button>
        </div>
      </CardContent>
    </Card>

    {conversation.length === 0 ? <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <BookOpenCheck className="size-10 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">No questions yet</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Ask Sophia about policy, procedure, product, FAQ, or compliance knowledge after documents have been processed.</p>
      </CardContent>
    </Card> : <div className="space-y-4">
      {conversation.map((item) => <Card key={item.id}>
        <CardHeader>
          <CardTitle className="text-base">{item.question}</CardTitle>
          <CardDescription>{item.response.insufficientEvidence ? "Sophia could not find enough evidence to answer confidently." : "Sophia answered from retrieved company knowledge."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={cn("rounded-xl border p-4 text-sm leading-6", item.response.insufficientEvidence ? "border-amber-500/30 bg-amber-500/10" : "bg-card")}>{item.response.answer}</div>
          {item.response.sources.length > 0 && <section className="space-y-3" aria-label="Sources">
            <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-primary" />Sources</div>
            <div className="grid gap-3 md:grid-cols-2">
              {item.response.sources.map((source) => <div key={source.evidenceId} className="rounded-xl border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{source.evidenceId}</Badge><span className="text-sm font-semibold">{source.document}</span></div>
                <p className="mt-1 text-xs text-muted-foreground">{source.citationLabel} · {source.knowledgeBase}</p>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{source.excerpt}</p>
              </div>)}
            </div>
          </section>}
        </CardContent>
      </Card>)}
    </div>}
  </div>;
}
