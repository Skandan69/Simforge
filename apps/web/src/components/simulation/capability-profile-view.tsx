"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Gauge, Loader2, Minus, Target } from "lucide-react";
import type { LearnerCapabilityProfileResponse } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function Change({ value }: { value: number }) {
  const Icon = value > 0 ? ArrowUp : value < 0 ? ArrowDown : Minus;
  const tone = value > 0 ? "text-emerald-600 dark:text-emerald-400" : value < 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";
  return <span className={`flex items-center gap-1 text-xs font-medium ${tone}`}><Icon className="size-3.5" />{value > 0 ? "+" : ""}{value.toFixed(1)}</span>;
}

export function CapabilityProfileView() {
  const [data, setData] = useState<LearnerCapabilityProfileResponse | null>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void apiFetch<LearnerCapabilityProfileResponse | null>("/api/capability-profile")
      .then((result) => { if (active) setData(result); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load your capability profile."); });
    return () => { active = false; };
  }, []);

  if (error) return <div className="mx-auto max-w-xl rounded-xl border bg-card p-8 text-center"><h1 className="font-semibold">Capability Profile unavailable</h1><p className="mt-2 text-sm text-destructive">{error}</p><Button className="mt-5" onClick={() => window.location.reload()}>Try again</Button></div>;
  if (data === undefined) return <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading your capability profile…</div>;
  if (data === null) return <div className="mx-auto max-w-xl rounded-xl border bg-card p-8 text-center"><Gauge className="mx-auto size-9 text-muted-foreground" /><h1 className="mt-4 text-xl font-semibold">Your capability profile starts here</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Complete your first simulation to establish a capability baseline. Each completed practice adds evidence over time.</p><Button asChild className="mt-5"><Link href="/simulation-studio/simulations">Browse simulations<ArrowRight /></Link></Button></div>;

  const profileChange = data.profile.previousOverallScore === null ? 0 : data.profile.overallScore - data.profile.previousOverallScore;
  return <div className="mx-auto max-w-6xl space-y-7">
    <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div><Badge variant="outline">Capability Intelligence</Badge><h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Your Capability Profile</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">A cumulative view of capability evidence from completed simulation practice.</p><div className="mt-4 flex flex-wrap gap-2"><Badge variant="secondary">{data.profile.simulationCount} simulation{data.profile.simulationCount === 1 ? "" : "s"}</Badge><Badge variant="secondary">{data.profile.confidence.toLowerCase()} confidence</Badge><Badge variant="secondary">{data.profile.trend.toLowerCase()} trend</Badge></div></div><div className="rounded-xl border bg-muted/30 px-8 py-5 text-center"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overall capability</p><p className="mt-1 text-4xl font-semibold text-primary">{data.profile.overallScore.toFixed(1)}</p><div className="mt-1 flex justify-center"><Change value={profileChange} /></div></div></div></section>

    <section><div><h2 className="text-lg font-semibold">Capability detail</h2><p className="mt-1 text-sm text-muted-foreground">Rolling scores across all completed assessments.</p></div><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.capabilities.map((capability) => <Card key={capability.capabilityName}><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{capability.capabilityName}</CardTitle><CardDescription className="mt-1">{capability.assessmentCount} assessment{capability.assessmentCount === 1 ? "" : "s"}</CardDescription></div><div className="text-right"><p className="text-xl font-semibold text-primary">{capability.currentScore.toFixed(1)}</p><Change value={capability.change} /></div></div></CardHeader><CardContent><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, capability.currentScore))}%` }} /></div><p className="mt-3 text-xs text-muted-foreground">Last assessed {new Date(capability.lastAssessedAt).toLocaleDateString()}</p></CardContent></Card>)}</div></section>

    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Target className="size-5 text-primary" />Recommended focus</CardTitle><CardDescription>Lowest current capability areas to prioritize next.</CardDescription></CardHeader><CardContent>{data.recommendedFocusAreas.length ? <div className="space-y-3">{data.recommendedFocusAreas.map((area, index) => <div key={area} className="flex items-center gap-3 rounded-lg border p-3"><span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span><span className="text-sm font-medium">{area}</span></div>)}</div> : <p className="text-sm text-muted-foreground">Complete more simulations to identify focus areas.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Recent assessments</CardTitle><CardDescription>Completed simulations contributing to this profile.</CardDescription></CardHeader><CardContent>{data.recentSimulations.length ? <div className="divide-y">{data.recentSimulations.map((session) => <Link key={session.id} href={`/simulation-studio/sessions/${session.id}/report`} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-medium">{session.simulationTitle}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(session.completedAt).toLocaleDateString()}</p></div><div className="flex items-center gap-3"><span className="text-sm font-semibold text-primary">{session.overallScore.toFixed(0)}</span><ArrowRight className="size-4 text-muted-foreground" /></div></Link>)}</div> : <p className="text-sm text-muted-foreground">No completed assessments yet.</p>}</CardContent></Card>
    </div>

    <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">Confidence reflects the number of completed simulations. Scores remain explainable through each session report.</p>
  </div>;
}
