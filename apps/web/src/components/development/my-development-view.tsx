"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Lock, RefreshCw, Route, Target } from "lucide-react";
import type { DevelopmentPathAssignmentResponse, DevelopmentPathStepProgressResponse, MyDevelopmentResponse } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";

function statusTone(status: string) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "IN_PROGRESS" || status === "NEEDS_REASSESSMENT") return "warning" as const;
  if (status === "LOCKED") return "secondary" as const;
  return "outline" as const;
}

function StepRow({ assignment, step, onStarted }: { assignment: DevelopmentPathAssignmentResponse; step: DevelopmentPathStepProgressResponse; onStarted: () => void }) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string>();
  async function start() {
    setStarting(true);
    setError(undefined);
    try {
      await apiFetch(`/api/my-development/${assignment.id}/steps/${step.step.id}/start`, { method: "POST", body: "{}" });
      onStarted();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start this step.");
    } finally {
      setStarting(false);
    }
  }
  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{step.step.type === "PRACTICE" ? "Practice" : "Assessment"}</Badge>
            <Badge variant={statusTone(step.locked ? "LOCKED" : step.status)}>{step.locked ? "Locked" : step.status.replaceAll("_", " ")}</Badge>
            {step.required ? <Badge variant="secondary">Required</Badge> : null}
          </div>
          <p className="mt-2 font-medium">{step.step.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {step.step.type === "PRACTICE" ? step.step.simulation?.title : step.step.assessment?.title}
          </p>
          {step.status === "NEEDS_REASSESSMENT" ? <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">Needs reassessment before this path can be completed.</p> : null}
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {step.actionHref ? <Button asChild size="sm"><Link href={step.actionHref}>{step.actionLabel}<ArrowRight className="size-4" /></Link></Button> : null}
          {!step.actionHref && !step.locked && (step.status === "NOT_STARTED" || step.status === "IN_PROGRESS") ? <Button size="sm" onClick={() => void start()} disabled={starting}>{starting ? "Starting..." : step.actionLabel}</Button> : null}
          {step.locked ? <Button size="sm" variant="outline" disabled><Lock className="size-4" />Locked</Button> : null}
        </div>
      </div>
    </div>
  );
}

function PathCard({ assignment, onRefresh }: { assignment: DevelopmentPathAssignmentResponse; onRefresh: () => void }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={assignment.status === "COMPLETED" ? "success" : assignment.status === "IN_PROGRESS" ? "warning" : "outline"}>{assignment.status.replaceAll("_", " ")}</Badge>
          {assignment.developmentPath.capabilities.map((capability) => <Badge key={capability} variant="outline">{capability}</Badge>)}
        </div>
        <CardTitle>{assignment.developmentPath.title}</CardTitle>
        <CardDescription>{assignment.reason || assignment.developmentPath.description || "Your manager assigned this development path to build readiness evidence."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl bg-muted/40 p-4">
          <div className="flex items-center justify-between text-sm"><span>{assignment.progress.completedRequiredSteps} of {assignment.progress.totalRequiredSteps} required steps complete</span><span className="font-semibold">{assignment.progress.percentComplete}%</span></div>
          <div className="mt-3 h-2 rounded-full bg-background"><div className="h-full rounded-full bg-primary" style={{ width: `${assignment.progress.percentComplete}%` }} /></div>
          {assignment.progress.currentStepTitle ? <p className="mt-2 text-xs text-muted-foreground">Current step: {assignment.progress.currentStepTitle}</p> : null}
        </div>
        <div className="space-y-3">{assignment.steps.map((step) => <StepRow key={step.step.id} assignment={assignment} step={step} onStarted={onRefresh} />)}</div>
      </CardContent>
    </Card>
  );
}

export function MyDevelopmentView() {
  const [data, setData] = useState<MyDevelopmentResponse>();
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    try {
      setData(await apiFetch<MyDevelopmentResponse>("/api/my-development"));
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load My Development.");
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  if (error) return <div className="mx-auto max-w-3xl py-20 text-center"><h1 className="text-xl font-semibold">My Development unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-6" onClick={() => void load()}><RefreshCw />Try again</Button></div>;
  if (!data) return <div className="mx-auto max-w-7xl animate-pulse space-y-6"><div className="h-32 rounded-2xl bg-muted" /><div className="h-96 rounded-xl bg-muted" /></div>;
  const all = [...data.assignments.assigned, ...data.assignments.inProgress, ...data.assignments.completed];
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeading eyebrow="My Development" title="Your assigned development paths" description="Development path steps combine ordered practice and readiness checks using the existing Sophia simulation, evaluation, and coaching flow." />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Assigned", value: data.summary.assigned, icon: Route }, { label: "In progress", value: data.summary.inProgress, icon: Target }, { label: "Completed", value: data.summary.completed, icon: CheckCircle2 }, { label: "Total", value: data.summary.total, icon: Route }].map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span></CardContent></Card>)}
      </section>
      {all.length ? <div className="grid gap-5">{all.map((assignment) => <PathCard key={assignment.id} assignment={assignment} onRefresh={() => void load()} />)}</div> : <Card><CardContent className="p-10 text-center"><Route className="mx-auto size-9 text-muted-foreground" /><p className="mt-3 font-medium">No development paths assigned yet</p><p className="mt-1 text-sm text-muted-foreground">When your manager assigns a structured path, it will appear here.</p></CardContent></Card>}
    </div>
  );
}
