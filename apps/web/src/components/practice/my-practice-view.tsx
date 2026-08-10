"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, ClipboardList, RefreshCw, TrendingUp } from "lucide-react";
import type { MyPracticeAssignmentResponse, MyPracticeResponse } from "@simforge/shared";
import { ApiError, apiFetch } from "@/lib/api";
import { practiceActionHref, practiceActionLabel, practiceStatusLabel } from "@/lib/my-practice";
import { PageHeading } from "@/components/layout/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatDate(value: string | null) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function statusTone(status: MyPracticeAssignmentResponse["status"]) {
  if (status === "ASSIGNED") return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (status === "IN_PROGRESS") return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
  if (status === "COMPLETED") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return "bg-muted text-muted-foreground";
}

function AssignmentCard({ assignment }: { assignment: MyPracticeAssignmentResponse }) {
  const href = practiceActionHref(assignment);
  const actionLabel = practiceActionLabel(assignment);
  return (
    <Card className="h-full">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={statusTone(assignment.status)} variant="secondary">{practiceStatusLabel(assignment.status)}</Badge>
          {assignment.focusCapability && <Badge variant="outline">{assignment.focusCapability}</Badge>}
          {assignment.session?.overallScore !== null && assignment.session?.overallScore !== undefined && (
            <Badge variant="outline">{assignment.session.overallScore}% score</Badge>
          )}
        </div>
        <div>
          <CardTitle className="text-base">{assignment.simulation.title}</CardTitle>
          <CardDescription className="mt-1 line-clamp-2">{assignment.simulation.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-muted/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why this practice was assigned</p>
          <p className="mt-1 text-sm">{assignment.reason || "Your manager assigned this practice to gather more capability evidence."}</p>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Assigned by</dt><dd className="font-medium">{assignment.assignedBy.name}</dd></div>
          <div><dt className="text-muted-foreground">Assigned</dt><dd className="font-medium">{formatDate(assignment.assignedAt)}</dd></div>
          <div><dt className="text-muted-foreground">Started</dt><dd className="font-medium">{formatDate(assignment.startedAt)}</dd></div>
          <div><dt className="text-muted-foreground">Completed</dt><dd className="font-medium">{formatDate(assignment.completedAt)}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-2">
          {href && actionLabel && (
            <Button asChild>
              <Link href={href}>{actionLabel}<ArrowRight className="size-4" /></Link>
            </Button>
          )}
          {assignment.reportAvailable && assignment.session?.id && (
            <Button asChild variant="outline">
              <Link href={`/simulation-studio/sessions/${assignment.session.id}/report`}>
                {assignment.coachAvailable ? "AI Coach included" : "View results"}
              </Link>
            </Button>
          )}
          {!href && !assignment.reportAvailable && (
            <p className="text-sm text-muted-foreground">
              {assignment.simulation.status === "Active"
                ? "This assignment does not have an available action yet."
                : "This simulation is not active right now."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AssignmentSection({
  title,
  description,
  assignments,
}: {
  title: string;
  description: string;
  assignments: MyPracticeAssignmentResponse[];
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {assignments.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {assignments.map((assignment) => <AssignmentCard key={assignment.assignmentId} assignment={assignment} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
          <ClipboardList className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No practice here right now</p>
          <p className="mt-1 text-sm text-muted-foreground">New manager-assigned practice will appear here.</p>
        </div>
      )}
    </section>
  );
}

function MyPracticeSkeleton() {
  return <div className="mx-auto max-w-7xl animate-pulse space-y-6"><div className="h-28 rounded-2xl bg-muted" /><div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div className="h-28 rounded-xl bg-muted" key={index} />)}</div><div className="h-96 rounded-xl bg-muted" /></div>;
}

export function MyPracticeView() {
  const [data, setData] = useState<MyPracticeResponse>();
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    try {
      setError(undefined);
      setData(await apiFetch<MyPracticeResponse>("/api/my-practice"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load your practice.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    void apiFetch<MyPracticeResponse>("/api/my-practice")
      .then((response) => { if (active) setData(response); })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof ApiError ? caught.message : "Unable to load your practice.");
      });
    return () => { active = false; };
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl py-20 text-center">
        <AlertCircle className="mx-auto size-8 text-destructive" />
        <h1 className="mt-4 text-xl font-semibold">We couldn&apos;t load My Practice</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-6" onClick={() => void load()}><RefreshCw />Try again</Button>
      </div>
    );
  }

  if (!data) return <MyPracticeSkeleton />;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeading
        eyebrow="Learner practice"
        title="My Practice"
        description="Your manager-assigned simulations, coaching reports, and capability progress in one focused place."
      />

      <section className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <Card className="border-primary/20">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><TrendingUp className="size-5" /></span>
              <div>
                <h2 className="font-semibold">Learner progress summary</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.progress.status} · {data.progress.simulationCount} completed simulation{data.progress.simulationCount === 1 ? "" : "s"}
                  {data.progress.change !== null ? ` · ${data.progress.change >= 0 ? "+" : ""}${data.progress.change} overall change` : ""}
                </p>
                {data.progress.recommendedFocusAreas.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {data.progress.recommendedFocusAreas.map((capability) => <Badge key={capability} variant="outline">{capability}</Badge>)}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">Complete assigned practice to build enough evidence for capability guidance.</p>
                )}
              </div>
            </div>
            <Button asChild variant="outline"><Link href="/capability-profile">View Capability Profile</Link></Button>
          </CardContent>
        </Card>
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Needs attention</p><p className="mt-2 text-2xl font-semibold">{data.summary.needsAttention}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">In progress</p><p className="mt-2 text-2xl font-semibold">{data.summary.inProgress}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Completed</p><p className="mt-2 text-2xl font-semibold">{data.summary.completed}</p></CardContent></Card>
        </div>
      </section>

      {data.summary.total === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
          <CheckCircle2 className="mx-auto size-9 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">No assigned practice yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            When a manager assigns a Sophia practice simulation, it will appear here with a clear start or continue action.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <AssignmentSection title="Needs Attention" description="New practice assigned by your manager." assignments={data.assignments.needsAttention} />
          <AssignmentSection title="In Progress" description="Resume existing Sophia sessions without creating duplicate attempts." assignments={data.assignments.inProgress} />
          <AssignmentSection title="Completed" description="Review reports, coaching insight, and capability evidence from finished practice." assignments={data.assignments.completed} />
        </div>
      )}
    </div>
  );
}
