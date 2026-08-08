"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BrainCircuit, CheckCircle2, ClipboardList, Loader2, RefreshCw, Sparkles, Target, Users } from "lucide-react";
import type { ManagerIntelligenceOverviewResponse, ManagerLearnerListResponse, PracticeAssignmentListResponse, PracticeRecommendation, WorkforceCapability } from "@simforge/shared";
import { WORKFORCE_CAPABILITIES } from "@simforge/shared";
import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeading } from "@/components/layout/page-heading";

function formatScore(score: number | null) {
  return score === null ? "Not enough data" : `${score}`;
}

function changeLabel(change: number | null) {
  if (change === null) return "No previous score";
  if (change > 0) return `+${change}`;
  return `${change}`;
}

function statusVariant(status: string) {
  if (status === "Strong Performer" || status === "Improving" || status === "COMPLETED") return "success" as const;
  if (status === "Needs Practice" || status === "Needs Review" || status === "IN_PROGRESS") return "warning" as const;
  return "outline" as const;
}

function CapabilityBar({ score }: { score: number | null }) {
  return (
    <div className="h-2 rounded-full bg-muted">
      <div className={cn("h-full rounded-full", score === null ? "bg-muted-foreground/30" : score >= 80 ? "bg-emerald-500" : score >= 70 ? "bg-amber-500" : "bg-destructive")} style={{ width: `${score ?? 12}%` }} />
    </div>
  );
}

function RecommendationDialog({
  recommendation,
  open,
  onOpenChange,
  onAssigned,
}: {
  recommendation: PracticeRecommendation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReason(recommendation?.reason ?? "");
      setError(undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [recommendation]);

  async function assign() {
    if (!recommendation?.simulationId) return;
    setSaving(true);
    setError(undefined);
    try {
      await apiFetch("/api/manager-intelligence/assignments", {
        method: "POST",
        body: JSON.stringify({
          learnerId: recommendation.learnerId,
          simulationId: recommendation.simulationId,
          reason,
          focusCapability: recommendation.capability,
        }),
      });
      onAssigned();
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create this assignment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign targeted practice</DialogTitle>
          <DialogDescription>
            This creates a focused simulation assignment using existing learner capability evidence.
          </DialogDescription>
        </DialogHeader>
        {recommendation ? (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{recommendation.learnerName}</p>
              <p className="mt-1 text-muted-foreground">{recommendation.simulationTitle ?? "No active simulation available"}</p>
              <p className="mt-2 text-xs text-muted-foreground">{recommendation.evidence}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignment-reason">Reason / focus</Label>
              <Textarea id="assignment-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={4} />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void assign()} disabled={saving || !recommendation?.simulationId}>
            {saving ? <Loader2 className="animate-spin" /> : <ClipboardList />}
            Create assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ManagerIntelligenceView() {
  const [overview, setOverview] = useState<ManagerIntelligenceOverviewResponse>();
  const [learners, setLearners] = useState<ManagerLearnerListResponse>();
  const [assignments, setAssignments] = useState<PracticeAssignmentListResponse>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [selectedRecommendation, setSelectedRecommendation] = useState<PracticeRecommendation | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [overviewResponse, learnerResponse, assignmentResponse] = await Promise.all([
        apiFetch<ManagerIntelligenceOverviewResponse>("/api/manager-intelligence/overview"),
        apiFetch<ManagerLearnerListResponse>("/api/manager-intelligence/learners"),
        apiFetch<PracticeAssignmentListResponse>("/api/manager-intelligence/assignments"),
      ]);
      setOverview(overviewResponse);
      setLearners(learnerResponse);
      setAssignments(assignmentResponse);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 403) {
        setError("Manager Intelligence is available to Owners, Admins, Trainers, and Managers.");
      } else {
        setError(caught instanceof Error ? caught.message : "Unable to load Manager Intelligence.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const capabilityRows = useMemo(() => overview?.capabilityOverview ?? [], [overview]);

  if (loading) {
    return <div className="mx-auto max-w-7xl animate-pulse space-y-6"><div className="h-32 rounded-2xl bg-muted" /><div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 rounded-xl bg-muted" />)}</div><div className="h-96 rounded-xl bg-muted" /></div>;
  }

  if (error) {
    return <div className="mx-auto max-w-3xl py-20 text-center"><AlertTriangle className="mx-auto size-8 text-destructive" /><h1 className="mt-4 text-xl font-semibold">Manager Intelligence unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-6" onClick={() => void load()}><RefreshCw />Try again</Button></div>;
  }

  if (!overview || !learners || !assignments) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeading eyebrow="Manager Intelligence" title="Team capability and practice loop" description="See learner capability evidence, identify gaps, and assign targeted simulation practice." />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Learners", value: overview.totals.learners, icon: Users },
          { label: "Completed simulations", value: overview.totals.completedSimulations, icon: CheckCircle2 },
          { label: "Open assignments", value: overview.totals.openAssignments, icon: ClipboardList },
          { label: "Completed assignments", value: overview.totals.completedAssignments, icon: Target },
          { label: "Avg capability", value: overview.totals.averageCapabilityScore ?? "Not enough data", icon: BrainCircuit },
        ].map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p></div><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span></div></CardContent></Card>)}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team capability overview</CardTitle>
            <CardDescription>Average scores are calculated only from completed simulations and saved capability profiles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {capabilityRows.map((capability) => (
              <div key={capability.capabilityName} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[180px_1fr_110px_100px] sm:items-center">
                <div><p className="font-medium">{capability.capabilityName}</p><p className="text-xs text-muted-foreground">{capability.learnerCount} learners · {capability.assessmentCount} assessments</p></div>
                <CapabilityBar score={capability.averageScore} />
                <p className="text-sm font-semibold">{formatScore(capability.averageScore)}</p>
                <Badge variant={capability.change === null ? "outline" : capability.change >= 0 ? "success" : "warning"}>{changeLabel(capability.change)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Follow-up queue</CardTitle><CardDescription>Deterministic status based on current evidence.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {overview.learnersNeedingAttention.length ? overview.learnersNeedingAttention.map((learner) => (
              <Link key={learner.id} href={`/learners/${learner.id}`} className="block rounded-xl border p-3 transition-colors hover:bg-muted/50">
                <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{learner.name}</p><p className="mt-1 text-xs text-muted-foreground">{learner.followUpReason}</p></div><Badge variant={statusVariant(learner.followUpStatus)}>{learner.followUpStatus}</Badge></div>
              </Link>
            )) : <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No learners require manager attention yet.</div>}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">Learner × capability view</CardTitle><CardDescription>Use this table to spot capability gaps and improvement evidence.</CardDescription></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="py-3 pr-4">Learner</th>{WORKFORCE_CAPABILITIES.map((capability) => <th key={capability} className="px-3 py-3">{capability}</th>)}<th className="py-3 pl-3">Status</th></tr></thead>
              <tbody className="divide-y">
                {learners.learners.map((learner) => (
                  <tr key={learner.id} className="align-top">
                    <td className="py-4 pr-4"><Link href={`/learners/${learner.id}`} className="font-medium text-primary hover:underline">{learner.name}</Link><p className="mt-1 text-xs text-muted-foreground">{learner.email}</p></td>
                    {WORKFORCE_CAPABILITIES.map((capability) => {
                      const weak = learner.weakestCapabilities.includes(capability as WorkforceCapability);
                      const strong = learner.strongestCapabilities.includes(capability as WorkforceCapability);
                      return <td key={capability} className="px-3 py-4"><Badge variant={weak ? "warning" : strong ? "success" : "outline"}>{weak ? "Focus" : strong ? "Strong" : "—"}</Badge></td>;
                    })}
                    <td className="py-4 pl-3"><Badge variant={statusVariant(learner.followUpStatus)}>{learner.followUpStatus}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!learners.learners.length ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No workspace members are available yet.</div> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recommended practice</CardTitle><CardDescription>Managers stay in control. Recommendations are not assigned automatically.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {overview.recommendations.length ? overview.recommendations.map((recommendation) => (
              <div key={`${recommendation.learnerId}-${recommendation.capability ?? "baseline"}`} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{recommendation.learnerName}</p><p className="mt-1 text-sm text-muted-foreground">{recommendation.reason}</p></div>{recommendation.capability ? <Badge variant="outline">{recommendation.capability}</Badge> : null}</div>
                <p className="mt-3 text-xs text-muted-foreground">{recommendation.evidence}</p>
                <Button className="mt-4 w-full" size="sm" disabled={!recommendation.simulationId || !overview.canManageAssignments} onClick={() => setSelectedRecommendation(recommendation)}>
                  <Sparkles />Assign recommended practice
                </Button>
              </div>
            )) : <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No practice recommendations yet. Complete a simulation to generate capability evidence.</div>}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Practice assignments</CardTitle><CardDescription>Targeted simulation practice only — not courses or LMS workflows.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {assignments.assignments.length ? assignments.assignments.slice(0, 8).map((assignment) => (
              <div key={assignment.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{assignment.simulation.title}</p><p className="mt-1 text-sm text-muted-foreground">{assignment.learner.name}</p></div><Badge variant={statusVariant(assignment.status)}>{assignment.status.replace("_", " ")}</Badge></div>
                {assignment.focusCapability ? <p className="mt-3 text-xs text-muted-foreground">Focus: {assignment.focusCapability}</p> : null}
                {assignment.status === "ASSIGNED" || assignment.status === "IN_PROGRESS" ? <Button asChild className="mt-4" size="sm" variant="outline"><Link href={`/simulation-studio/simulations/${assignment.simulation.id}/run?start=true&assignmentId=${assignment.id}`}>Open assigned simulation <ArrowRight /></Link></Button> : null}
              </div>
            )) : <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No assignments yet.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent activity evidence</CardTitle><CardDescription>Latest simulations and coaching insights from persisted sessions.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              {overview.recentSimulations.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-start justify-between gap-3 rounded-xl border p-3">
                  <div><p className="font-medium">{session.simulationTitle}</p><p className="mt-1 text-xs text-muted-foreground">{session.learnerName} · {session.completedAt ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(session.completedAt)) : "In progress"}</p></div>
                  <Badge variant="outline">{formatScore(session.overallScore)}</Badge>
                </div>
              ))}
              {!overview.recentSimulations.length ? <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">No simulation activity yet.</p> : null}
            </div>
            <div className="border-t pt-4">
              <p className="mb-3 text-sm font-medium">Recent coaching insights</p>
              {overview.recentCoachingInsights.slice(0, 3).map((insight) => (
                <div key={insight.id} className="rounded-xl bg-muted/40 p-3"><p className="text-sm">{insight.summary}</p><p className="mt-2 text-xs text-muted-foreground">{insight.learnerName} · Next: {insight.nextBestAction.title}</p></div>
              ))}
              {!overview.recentCoachingInsights.length ? <p className="text-sm text-muted-foreground">No coaching insights yet.</p> : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <RecommendationDialog recommendation={selectedRecommendation} open={Boolean(selectedRecommendation)} onOpenChange={(open) => !open && setSelectedRecommendation(null)} onAssigned={() => void load()} />
    </div>
  );
}
