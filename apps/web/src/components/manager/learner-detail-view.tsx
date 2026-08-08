"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BrainCircuit, Loader2, RefreshCw, Target, TrendingDown, TrendingUp } from "lucide-react";
import type { ManagerLearnerDetailResponse } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";

function formatScore(score: number | null) {
  return score === null ? "Not enough data" : `${score}`;
}

function formatChange(change: number | null) {
  if (change === null) return "No previous score";
  return change > 0 ? `+${change}` : `${change}`;
}

function badgeVariant(value: string | null | number) {
  if (typeof value === "number") return value >= 0 ? "success" as const : "warning" as const;
  if (value === "Improving" || value === "Strong Performer" || value === "COMPLETED") return "success" as const;
  if (value === "Needs Review" || value === "Needs Practice" || value === "IN_PROGRESS") return "warning" as const;
  return "outline" as const;
}

export function LearnerDetailView({ learnerId }: { learnerId: string }) {
  const [data, setData] = useState<ManagerLearnerDetailResponse>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setData(await apiFetch<ManagerLearnerDetailResponse>(`/api/manager-intelligence/learners/${learnerId}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load this learner.");
    } finally {
      setLoading(false);
    }
  }, [learnerId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading) return <div className="grid min-h-[50vh] place-items-center"><div className="text-center"><Loader2 className="mx-auto size-6 animate-spin text-primary" /><p className="mt-3 text-sm text-muted-foreground">Loading learner intelligence…</p></div></div>;
  if (error) return <div className="mx-auto max-w-3xl py-20 text-center"><h1 className="text-xl font-semibold">Learner unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-6" onClick={() => void load()}><RefreshCw />Try again</Button></div>;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <Button asChild variant="ghost" className="-ml-2"><Link href="/learners"><ArrowLeft />Back to Manager Intelligence</Link></Button>
      <PageHeading eyebrow="Learner detail" title={data.learner.name} description={`${data.learner.email} · ${data.learner.role}`} />

      <section className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Overall capability</p><p className="mt-3 text-3xl font-semibold">{formatScore(data.learner.overallScore)}</p><Badge className="mt-4" variant={badgeVariant(data.learner.followUpStatus)}>{data.learner.followUpStatus}</Badge></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Completed simulations</p><p className="mt-3 text-3xl font-semibold">{data.learner.completedSimulationCount}</p><p className="mt-4 text-xs text-muted-foreground">Capability profile count: {data.learner.simulationCount}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Trend</p><p className="mt-3 flex items-center gap-2 text-2xl font-semibold">{data.learner.trend === "DECLINING" ? <TrendingDown className="text-amber-500" /> : <TrendingUp className="text-emerald-500" />}{data.learner.trend.replaceAll("_", " ")}</p><p className="mt-4 text-xs text-muted-foreground">Confidence: {data.learner.confidence}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Open assignments</p><p className="mt-3 text-3xl font-semibold">{data.learner.openAssignmentCount}</p><p className="mt-4 text-xs text-muted-foreground">{data.learner.followUpReason}</p></CardContent></Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">Capability profile</CardTitle><CardDescription>Current, previous, and change values come from saved capability history.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {data.learner.capabilities.map((capability) => (
              <div key={capability.capabilityName} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[180px_1fr_110px_110px] sm:items-center">
                <div><p className="font-medium">{capability.capabilityName}</p><p className="text-xs text-muted-foreground">{capability.assessmentCount} assessments</p></div>
                <div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${capability.currentScore ?? 8}%` }} /></div>
                <p className="text-sm font-semibold">{formatScore(capability.currentScore)}</p>
                <Badge variant={badgeVariant(capability.change)}>{formatChange(capability.change)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recommended next action</CardTitle><CardDescription>Explainable practice suggestions, not automatic assignments.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {data.recommendations.length ? data.recommendations.map((recommendation) => (
              <div key={`${recommendation.learnerId}-${recommendation.capability ?? "baseline"}`} className="rounded-xl border p-4">
                <div className="flex items-center gap-2"><Target className="size-4 text-primary" /><p className="font-medium">{recommendation.simulationTitle ?? "Create an active simulation"}</p></div>
                <p className="mt-2 text-sm text-muted-foreground">{recommendation.reason}</p>
                <p className="mt-2 text-xs text-muted-foreground">{recommendation.evidence}</p>
              </div>
            )) : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No recommended practice yet.</p>}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent simulations</CardTitle><CardDescription>Completed and in-progress attempts for this learner.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {data.recentSimulations.length ? data.recentSimulations.map((session) => (
              <Link key={session.id} href={`/simulation-studio/sessions/${session.id}/report`} className="block rounded-xl border p-4 transition-colors hover:bg-muted/50">
                <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{session.simulationTitle}</p><p className="mt-1 text-xs text-muted-foreground">{session.completedAt ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(session.completedAt)) : "In progress"}</p></div><Badge variant="outline">{formatScore(session.overallScore)}</Badge></div>
              </Link>
            )) : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No simulation attempts yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">AI Coach insights</CardTitle><CardDescription>Evidence-based coaching generated from completed simulations.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {data.coachingInsights.length ? data.coachingInsights.map((insight) => (
              <div key={insight.id} className="rounded-xl border p-4"><div className="flex items-center gap-2"><BrainCircuit className="size-4 text-primary" /><p className="font-medium">Coaching summary</p></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{insight.summary}</p><p className="mt-3 text-xs font-medium">Next: {insight.nextBestAction.title}</p></div>
            )) : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No coaching insights yet.</p>}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Capability history</CardTitle><CardDescription>Before, current, and change evidence from repeated simulations.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {data.capabilityHistory.length ? data.capabilityHistory.slice(0, 12).map((item) => (
              <div key={`${item.sessionId}-${item.capabilityName}`} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.capabilityName}</p><p className="mt-1 text-xs text-muted-foreground">{item.simulationTitle}</p></div><Badge variant={badgeVariant(item.change)}>{formatChange(item.change)}</Badge></div><p className="mt-2 text-sm text-muted-foreground">Current {item.currentScore} · Previous {item.previousScore ?? "not available"}</p></div>
            )) : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Capability history appears after evaluated simulations.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Practice assignments</CardTitle><CardDescription>Assignment lifecycle connected to the learner’s simulation attempts.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {data.assignments.length ? data.assignments.map((assignment) => (
              <div key={assignment.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{assignment.simulation.title}</p><p className="mt-1 text-xs text-muted-foreground">{assignment.reason || "No reason provided"}</p></div><Badge variant={badgeVariant(assignment.status)}>{assignment.status.replace("_", " ")}</Badge></div>
                {assignment.status === "ASSIGNED" || assignment.status === "IN_PROGRESS" ? <Button asChild size="sm" variant="outline" className="mt-4"><Link href={`/simulation-studio/simulations/${assignment.simulation.id}/run?start=true&assignmentId=${assignment.id}`}>Run assigned simulation</Link></Button> : null}
              </div>
            )) : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No assigned practice yet.</p>}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
