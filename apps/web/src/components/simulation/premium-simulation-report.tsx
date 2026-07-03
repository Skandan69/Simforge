"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, Eye, Lightbulb, Loader2, MessageSquareText, Printer, RotateCcw, Sparkles, Target } from "lucide-react";
import type { SimulationSessionResponse } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { buildPremiumReport } from "@/lib/premium-report";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SimulationCoachingInsight } from "./simulation-coaching-insight";

function EvidenceQuote({ children }: { children: string }) {
  return <blockquote className="mt-2 border-l-2 border-primary/40 pl-3 text-xs italic leading-5 text-muted-foreground">“{children}”</blockquote>;
}

export function PremiumSimulationReport({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<SimulationSessionResponse>();
  const [error, setError] = useState<string>();
  const [retrying, setRetrying] = useState(false);
  const load = useCallback(async () => {
    try {
      setSession(await apiFetch(`/api/simulation-sessions/${sessionId}`));
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load the capability report.");
    }
  }, [sessionId]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  const report = useMemo(() => session?.evaluation ? buildPremiumReport(session) : undefined, [session]);

  async function retryEvaluation() {
    setRetrying(true);
    try {
      setSession(await apiFetch(`/api/simulation-sessions/${sessionId}/evaluate`, { method: "POST" }));
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to generate the capability report.");
    } finally {
      setRetrying(false);
    }
  }

  if (!session) return <div className="grid min-h-[60vh] place-items-center">{error ? <div className="text-center"><p className="text-sm text-destructive">{error}</p><Button className="mt-4" onClick={() => void load()}>Try again</Button></div> : <Loader2 className="animate-spin text-primary" />}</div>;
  if (!session.evaluation || !report) return <div className="mx-auto max-w-xl rounded-xl border bg-card p-8 text-center"><Target className="mx-auto size-8 text-muted-foreground" /><h1 className="mt-4 text-xl font-semibold">Report not generated</h1><p className="mt-2 text-sm text-muted-foreground">This session does not have a saved evaluation yet.</p>{error && <p className="mt-3 text-sm text-destructive">{error}</p>}<Button className="mt-5" onClick={() => void retryEvaluation()} disabled={retrying}>{retrying ? <Loader2 className="animate-spin" /> : <RotateCcw />}{retrying ? "Generating…" : "Generate report"}</Button></div>;

  return (
    <article className="mx-auto max-w-6xl space-y-7 print:max-w-none print:space-y-5" aria-label="Premium simulation report">
      <div className="flex items-center justify-between gap-3 print:hidden"><Button asChild variant="ghost" size="sm"><Link href={`/simulation-studio/simulations/${session.simulationId}`}><ArrowLeft />Simulation details</Link></Button><Button variant="outline" size="sm" onClick={() => window.print()}><Printer />Print report</Button></div>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm print:shadow-none"><div className="border-b bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-slate-100 sm:p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex flex-wrap gap-2"><Badge variant="outline" className="border-slate-600 text-slate-200">Premium AI Report</Badge><Badge className="bg-emerald-950 text-emerald-200">Completed</Badge></div><h1 className="mt-4 text-3xl font-semibold tracking-tight">Simulation performance report</h1><p className="mt-2 text-sm text-slate-300">{session.simulation.title} · {session.completedAt ? new Date(session.completedAt).toLocaleString() : "Completed recently"}</p></div><div className="rounded-xl border border-slate-700 bg-slate-900/70 px-7 py-4 sm:text-right"><p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Overall performance</p><p className="mt-1 text-2xl font-semibold text-cyan-200">{report.overallRating}</p><p className="mt-1 text-xs text-slate-400">Based on the completed evaluation</p></div></div></div></section>

      <section aria-labelledby="executive-summary"><Card className="border-primary/20"><CardHeader><CardTitle id="executive-summary" className="flex items-center gap-2"><Sparkles className="size-5 text-primary" />Executive Summary</CardTitle><CardDescription>A concise view of performance and the highest-value coaching priority.</CardDescription></CardHeader><CardContent><p className="text-base font-medium leading-7">{report.executiveSummary.overview}</p><div className="mt-5 grid gap-4 md:grid-cols-3"><SummaryBlock label="Primary strength" text={report.executiveSummary.primaryStrength} tone="emerald" /><SummaryBlock label="Priority improvement" text={report.executiveSummary.priorityArea} tone="amber" /><SummaryBlock label="Coaching focus" text={report.executiveSummary.coachingFocus} tone="sky" /></div></CardContent></Card></section>

      <section aria-labelledby="capability-snapshot"><div><h2 id="capability-snapshot" className="text-xl font-semibold">Capability Snapshot</h2><p className="mt-1 text-sm text-muted-foreground">Qualitative signals from observed conversation evidence—not a second final score.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{report.capabilitySnapshot.map((item) => <Card key={item.capability} className="print:break-inside-avoid"><CardContent className="p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{item.capability}</p><Badge variant={item.state === "Needs attention" ? "warning" : item.state === "Not observed yet" ? "secondary" : "outline"}>{item.state}</Badge></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{item.helper}</p></CardContent></Card>)}</div></section>

      <section aria-labelledby="conversation-timeline"><Card><CardHeader><CardTitle id="conversation-timeline" className="flex items-center gap-2"><MessageSquareText className="size-5 text-primary" />Conversation Timeline</CardTitle><CardDescription>Selected moments that materially shaped the simulation outcome.</CardDescription></CardHeader><CardContent>{report.timeline.length ? <ol className="relative space-y-5 border-l pl-6">{report.timeline.map((moment, index) => <li key={`${moment.title}-${index}`} className="relative print:break-inside-avoid"><span className="absolute -left-[1.93rem] top-0.5 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">{index + 1}</span><p className="text-sm font-semibold">{moment.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{moment.detail}</p><EvidenceQuote>{moment.evidence}</EvidenceQuote></li>)}</ol> : <p className="text-sm text-muted-foreground">No distinct evidence moments could be classified from this conversation.</p>}</CardContent></Card></section>

      <section aria-labelledby="evidence-observations"><div><h2 id="evidence-observations" className="text-xl font-semibold">Evidence-Based Observations</h2><p className="mt-1 text-sm text-muted-foreground">Each observation connects evaluation evidence to its operational significance.</p></div><div className="mt-4 space-y-4">{report.observations.map((item, index) => <Card key={`${item.capability}-${index}`} className="print:break-inside-avoid"><CardContent className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr_1fr]"><div><Badge variant="outline">{item.capability}</Badge><p className="mt-3 text-sm font-semibold">{item.observation}</p><EvidenceQuote>{item.evidence}</EvidenceQuote></div><ObservationContext label="Why it mattered" text={item.whyItMattered} /><ObservationContext label="Impact" text={item.impact} /></CardContent></Card>)}</div></section>

      <div className="grid gap-5 lg:grid-cols-2"><Card className="print:break-inside-avoid"><CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="size-5 text-emerald-600" />Strengths</CardTitle><CardDescription>Successful behaviours supported by session evidence.</CardDescription></CardHeader><CardContent className="space-y-5">{report.strengths.map((item) => <div key={item.title}><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.title}</p><Badge variant="outline">{item.capability}</Badge></div><EvidenceQuote>{item.evidence}</EvidenceQuote></div>)}</CardContent></Card><Card className="print:break-inside-avoid"><CardHeader><CardTitle className="flex items-center gap-2"><Target className="size-5 text-amber-600" />Missed Opportunities</CardTitle><CardDescription>Specific moments to handle differently in the next practice.</CardDescription></CardHeader><CardContent className="space-y-5">{report.missedOpportunities.map((item) => <div key={item.title}><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.title}</p><Badge variant="outline">{item.capability}</Badge></div><EvidenceQuote>{item.evidence}</EvidenceQuote><p className="mt-2 text-xs leading-5"><span className="font-semibold">Try next:</span> {item.recommendation}</p></div>)}</CardContent></Card></div>

      <section aria-labelledby="knowledge-usage"><Card className="print:break-inside-avoid"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle id="knowledge-usage" className="flex items-center gap-2"><BookOpenCheck className="size-5 text-primary" />Knowledge Usage</CardTitle><div className="flex gap-2"><Badge variant="outline">Knowledge: {report.knowledgeUsage.state}</Badge><Badge variant="outline">Policy: {report.knowledgeUsage.policyState}</Badge></div></div><CardDescription>How clearly company guidance or policy appeared in the learner response.</CardDescription></CardHeader><CardContent><p className="text-sm leading-6">{report.knowledgeUsage.summary}</p><EvidenceQuote>{report.knowledgeUsage.evidence}</EvidenceQuote></CardContent></Card></section>

      <section aria-labelledby="ai-coach" className="print:break-before-page"><div className="mb-4"><h2 id="ai-coach" className="text-xl font-semibold">AI Coach</h2><p className="mt-1 text-sm text-muted-foreground">Existing evidence-based coaching, presented as part of the complete report.</p></div><SimulationCoachingInsight sessionId={session.id} /></section>

      <section aria-labelledby="recommended-simulation"><Card className="border-primary/25 print:break-inside-avoid"><CardContent className="grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary"><Lightbulb className="size-4" />Recommended Next Simulation</p><h2 id="recommended-simulation" className="mt-2 text-xl font-semibold">{report.recommendedNextSimulation.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{report.recommendedNextSimulation.rationale}</p><p className="mt-3 text-sm"><span className="font-semibold">Focus:</span> {report.recommendedNextSimulation.focus}</p></div><Button asChild variant="outline" className="print:hidden"><Link href="/simulation-studio/simulations">Browse simulations<ArrowRight /></Link></Button></CardContent></Card></section>

      <div className="flex items-center gap-2 rounded-xl border border-dashed p-4 text-xs leading-5 text-muted-foreground print:border-0 print:px-0"><Eye className="size-4 shrink-0" />This report combines the saved final evaluation, selected transcript evidence, qualitative live signals, and the existing AI Coach. Final evaluation remains authoritative.</div>
    </article>
  );
}

function SummaryBlock({ label, text, tone }: { label: string; text: string; tone: "emerald" | "amber" | "sky" }) {
  const styles = { emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-300", amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/25 dark:text-amber-300", sky: "bg-sky-50 text-sky-700 dark:bg-sky-950/25 dark:text-sky-300" };
  return <div className={`rounded-xl p-4 ${styles[tone]}`}><p className="text-xs font-semibold uppercase tracking-wide">{label}</p><p className="mt-2 text-sm leading-6 text-foreground">{text}</p></div>;
}

function ObservationContext({ label, text }: { label: string; text: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-sm leading-6">{text}</p></div>;
}
