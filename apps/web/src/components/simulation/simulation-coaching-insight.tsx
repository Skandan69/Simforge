"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, BrainCircuit, CheckCircle2, Lightbulb, Loader2, Minus, Target } from "lucide-react";
import type { SimulationCoachingInsightResponse, SimulationSessionResponse } from "@simforge/shared";
import { ApiError, apiFetch } from "@/lib/api";
import { buildReportCoachingFallback } from "@/lib/premium-report";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SimulationCoachingInsight({ sessionId, session }: { sessionId: string; session: SimulationSessionResponse }) {
  const [insight, setInsight] = useState<SimulationCoachingInsightResponse>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try { return await apiFetch<SimulationCoachingInsightResponse>(`/api/simulation-sessions/${sessionId}/coach`); }
      catch (caught) {
        if (caught instanceof ApiError && (caught.status === 404 || caught.status >= 500)) return apiFetch<SimulationCoachingInsightResponse>(`/api/simulation-sessions/${sessionId}/coach`, { method: "POST" });
        throw caught;
      }
    };
    void load().then((result) => { if (active) setInsight(result); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [sessionId]);

  if (failed) {
    const fallback = buildReportCoachingFallback(session);
    return <Card className="border-primary/25"><CardHeader><CardTitle className="flex items-center gap-2"><BrainCircuit className="size-5 text-primary" />AI Coach</CardTitle><CardDescription>Deterministic coaching prepared from the saved evaluation.</CardDescription></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-6">{fallback.summary}</p><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Strength</p><p className="mt-1 text-sm">{fallback.strength}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority improvement</p><p className="mt-1 text-sm">{fallback.improvement}</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs font-semibold">Better response example</p><p className="mt-1 text-sm leading-6">“{fallback.betterResponse}”</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next practice focus</p><p className="mt-1 text-sm">{fallback.nextPractice}</p></div></CardContent></Card>;
  }
  if (!insight) return <Card><CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin text-primary" />Preparing evidence-based coaching…</CardContent></Card>;

  return <section className="space-y-5">
    <Card className="border-primary/25"><CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="flex items-center gap-2"><BrainCircuit className="size-5 text-primary" />AI Coach</CardTitle><CardDescription className="mt-1">Concise guidance generated from the session evaluation and available organization evidence.</CardDescription></div><Badge variant="outline">Evidence-based</Badge></div></CardHeader><CardContent><p className="text-sm leading-6">{insight.summary}</p></CardContent></Card>

    <div className="grid gap-5 lg:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="size-4 text-emerald-600" />Strengths</CardTitle></CardHeader><CardContent className="space-y-4">{insight.strengths.map((item) => <div key={item.title}><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.evidence}</p></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Target className="size-4 text-amber-600" />Improvement areas</CardTitle></CardHeader><CardContent className="space-y-4">{insight.improvementAreas.map((item) => <div key={item.title}><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.evidence}</p><p className="mt-1 text-xs leading-5">{item.recommendation}</p></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Capability changes</CardTitle></CardHeader><CardContent>{insight.capabilityChanges.length ? <div className="space-y-3">{insight.capabilityChanges.map((item) => { const Icon = item.change > 0 ? ArrowUp : item.change < 0 ? ArrowDown : Minus; return <div key={item.capability} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="text-sm font-medium">{item.capability}</p><p className="text-xs text-muted-foreground">Current profile {item.currentScore.toFixed(1)}</p></div><span className="flex items-center gap-1 text-xs font-semibold"><Icon className="size-3.5" />{item.change > 0 ? "+" : ""}{item.change.toFixed(1)}</span></div>; })}</div> : <p className="text-sm text-muted-foreground">This session established the first capability baseline.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Knowledge gaps</CardTitle></CardHeader><CardContent>{insight.knowledgeGaps.length ? <div className="space-y-4">{insight.knowledgeGaps.map((gap) => <div key={gap.topic}><p className="text-sm font-medium">{gap.topic}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{gap.evidence}</p></div>)}</div> : <p className="text-sm text-muted-foreground">No specific gap could be linked to an available governed knowledge section.</p>}</CardContent></Card>
    </div>

    <Card><CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_0.8fr]"><div><p className="flex items-center gap-2 text-sm font-semibold"><Lightbulb className="size-4 text-primary" />Next best action</p><p className="mt-2 text-sm font-medium">{insight.nextBestAction.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{insight.nextBestAction.description}</p></div><div className="rounded-lg bg-muted/40 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estimated improvement</p><p className="mt-2 text-2xl font-semibold text-primary">+{insight.estimatedImprovement.minimumPoints}–{insight.estimatedImprovement.maximumPoints} points</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{insight.estimatedImprovement.basis}</p><p className="mt-2 text-xs font-medium">{insight.estimatedImprovement.disclaimer}</p></div></CardContent></Card>
  </section>;
}
