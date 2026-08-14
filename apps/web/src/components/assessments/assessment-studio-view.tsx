"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { WORKFORCE_CAPABILITIES, type AssessmentAssignmentResponse, type AssessmentDashboardResponse, type ManagerLearnerListResponse, type MyAssessmentsResponse, type SaveAssessmentInput, type SimulationDashboardResponse, type WorkforceCapability } from "@simforge/shared";
import { ApiError, apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeading } from "@/components/layout/page-heading";

function statusVariant(status: string) {
  if (status === "ACTIVE" || status === "COMPLETED") return "success" as const;
  if (status === "IN_PROGRESS" || status === "DRAFT") return "warning" as const;
  return "outline" as const;
}

function assessmentActionHref(assignment: AssessmentAssignmentResponse) {
  if (assignment.canContinue && assignment.sessionId) {
    return `/simulation-studio/simulations/${assignment.assessment.simulation.id}/run?sessionId=${assignment.sessionId}&assessmentAssignmentId=${assignment.id}`;
  }
  if (assignment.canStart) {
    return `/simulation-studio/simulations/${assignment.assessment.simulation.id}/run?start=true&assessmentAssignmentId=${assignment.id}`;
  }
  if (assignment.reportAvailable && assignment.sessionId) {
    return `/simulation-studio/sessions/${assignment.sessionId}/report`;
  }
  return null;
}

function assessmentActionLabel(assignment: AssessmentAssignmentResponse) {
  if (assignment.canContinue) return "Continue assessment";
  if (assignment.canStart) return "Start assessment";
  if (assignment.reportAvailable) return assignment.result.coachAvailable ? "View coaching report" : "View results";
  return null;
}

function AssignmentCard({ assignment }: { assignment: AssessmentAssignmentResponse }) {
  const href = assessmentActionHref(assignment);
  const label = assessmentActionLabel(assignment);
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(assignment.status)}>{assignment.status.replace("_", " ")}</Badge>
          <Badge variant="outline">Pass {assignment.assessment.passingScore}%</Badge>
          {assignment.result.passed !== null ? <Badge variant={assignment.result.passed ? "success" : "warning"}>{assignment.result.passed ? "Passed" : "Did not pass"}</Badge> : null}
        </div>
        <div>
          <CardTitle className="text-base">{assignment.assessment.title}</CardTitle>
          <CardDescription className="mt-1 line-clamp-2">{assignment.assessment.description || assignment.assessment.simulation.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-muted/30 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Formal readiness evidence</p>
          <p className="mt-1">{assignment.reason || "Complete this Sophia assessment to generate readiness evidence."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {assignment.assessment.capabilities.map((capability) => <Badge key={capability} variant="outline">{capability}</Badge>)}
        </div>
        <div className="flex flex-wrap gap-2">
          {href && label ? <Button asChild><Link href={href}>{label}<ArrowRight className="size-4" /></Link></Button> : null}
          {assignment.result.overallScore !== null ? <Badge variant="outline">{assignment.result.overallScore}% score</Badge> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function AssessmentForm({
  simulations,
  onSaved,
}: {
  simulations: SimulationDashboardResponse["simulations"];
  onSaved: () => void;
}) {
  const activeSimulations = simulations.filter((simulation) => simulation.status === "Active");
  const [form, setForm] = useState<SaveAssessmentInput>({
    title: "",
    description: "",
    simulationId: activeSimulations[0]?.id ?? "",
    capabilities: ["Communication"],
    passingScore: 70,
    status: "DRAFT",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  function toggleCapability(capability: WorkforceCapability) {
    setForm((current) => {
      const exists = current.capabilities.includes(capability);
      const next = exists ? current.capabilities.filter((item) => item !== capability) : [...current.capabilities, capability];
      return { ...current, capabilities: next.length ? next : [capability] };
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      await apiFetch("/api/assessments", { method: "POST", body: JSON.stringify(form) });
      setForm((current) => ({ ...current, title: "", description: "", status: "DRAFT" }));
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save this assessment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create readiness check</CardTitle>
        <CardDescription>Assessment v1 links exactly one active simulation to formal readiness evidence.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="assessment-title">Title</Label><Input id="assessment-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Refund readiness check" required /></div>
            <div className="space-y-2"><Label htmlFor="assessment-simulation">Simulation</Label><select id="assessment-simulation" value={form.simulationId} onChange={(event) => setForm({ ...form, simulationId: event.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required>{activeSimulations.map((simulation) => <option key={simulation.id} value={simulation.id}>{simulation.title}</option>)}</select></div>
          </div>
          <div className="space-y-2"><Label htmlFor="assessment-description">Description</Label><Textarea id="assessment-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} /></div>
          <div className="space-y-2"><Label>Assessed capabilities</Label><div className="flex flex-wrap gap-2">{WORKFORCE_CAPABILITIES.map((capability) => <Button type="button" key={capability} size="sm" variant={form.capabilities.includes(capability) ? "default" : "outline"} onClick={() => toggleCapability(capability)}>{capability}</Button>)}</div></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="passing-score">Passing threshold</Label><Input id="passing-score" type="number" min={0} max={100} value={form.passingScore} onChange={(event) => setForm({ ...form, passingScore: Number(event.target.value) })} /></div>
            <div className="space-y-2"><Label htmlFor="assessment-status">Lifecycle</Label><select id="assessment-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as SaveAssessmentInput["status"] })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option></select></div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={saving || !activeSimulations.length}>{saving ? <Loader2 className="animate-spin" /> : <ClipboardCheck />}Save assessment</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AssessmentManagement({
  data,
  simulations,
  learners,
  onRefresh,
}: {
  data: AssessmentDashboardResponse;
  simulations: SimulationDashboardResponse["simulations"];
  learners: ManagerLearnerListResponse["learners"];
  onRefresh: () => void;
}) {
  const [assigning, setAssigning] = useState<string>();
  const [learnerId, setLearnerId] = useState("");
  const [reason, setReason] = useState("");
  const learnerOptions = learners.filter((learner) => learner.role === "Learner");

  async function activate(id: string) {
    await apiFetch(`/api/assessments/${id}/activate`, { method: "POST" });
    onRefresh();
  }

  async function assign(id: string) {
    if (!learnerId) return;
    setAssigning(id);
    try {
      await apiFetch(`/api/assessments/${id}/assignments`, { method: "POST", body: JSON.stringify({ learnerId, reason }) });
      setReason("");
      onRefresh();
    } finally {
      setAssigning(undefined);
    }
  }

  return (
    <div className="space-y-6">
      {data.canManageAssessments ? <AssessmentForm simulations={simulations} onSaved={onRefresh} /> : null}
      <section className="grid gap-4 lg:grid-cols-2">
        {data.assessments.map((assessment) => (
          <Card key={assessment.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2"><Badge variant={statusVariant(assessment.status)}>{assessment.status}</Badge><Badge variant="outline">{assessment.simulation.title}</Badge><Badge variant="outline">Pass {assessment.passingScore}%</Badge></div>
              <CardTitle className="text-base">{assessment.title}</CardTitle>
              <CardDescription>{assessment.description || assessment.simulation.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">{assessment.capabilities.map((capability) => <Badge key={capability} variant="outline">{capability}</Badge>)}</div>
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div><p className="text-muted-foreground">Assignments</p><p className="font-semibold">{assessment.assignmentCount}</p></div>
                <div><p className="text-muted-foreground">Completed</p><p className="font-semibold">{assessment.completedAttemptCount}</p></div>
                <div><p className="text-muted-foreground">Passed</p><p className="font-semibold">{assessment.passCount}</p></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.canManageAssessments && assessment.status === "DRAFT" ? <Button size="sm" variant="outline" onClick={() => void activate(assessment.id)}>Activate</Button> : null}
              </div>
              {data.canAssignAssessments && assessment.status === "ACTIVE" ? (
                <div className="grid gap-3 rounded-xl border bg-muted/30 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <div className="space-y-2"><Label htmlFor={`learner-${assessment.id}`}>Learner</Label><select id={`learner-${assessment.id}`} value={learnerId} onChange={(event) => setLearnerId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select learner</option>{learnerOptions.map((learner) => <option key={learner.id} value={learner.id}>{learner.name}</option>)}</select></div>
                  <div className="space-y-2"><Label htmlFor={`reason-${assessment.id}`}>Reason</Label><Input id={`reason-${assessment.id}`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Readiness check" /></div>
                  <Button onClick={() => void assign(assessment.id)} disabled={!learnerId || assigning === assessment.id}>{assigning === assessment.id ? <Loader2 className="animate-spin" /> : null}Assign</Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

export function AssessmentStudioView() {
  const [dashboard, setDashboard] = useState<AssessmentDashboardResponse>();
  const [myAssessments, setMyAssessments] = useState<MyAssessmentsResponse>();
  const [simulations, setSimulations] = useState<SimulationDashboardResponse["simulations"]>([]);
  const [learners, setLearners] = useState<ManagerLearnerListResponse["learners"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [myResponse, dashboardResponse, simulationResponse, learnerResponse] = await Promise.allSettled([
        apiFetch<MyAssessmentsResponse>("/api/my-assessments"),
        apiFetch<AssessmentDashboardResponse>("/api/assessments"),
        apiFetch<SimulationDashboardResponse>("/api/simulations/dashboard"),
        apiFetch<ManagerLearnerListResponse>("/api/manager-intelligence/learners"),
      ]);
      if (myResponse.status === "fulfilled") setMyAssessments(myResponse.value);
      if (dashboardResponse.status === "fulfilled") setDashboard(dashboardResponse.value);
      if (simulationResponse.status === "fulfilled") setSimulations(simulationResponse.value.simulations);
      if (learnerResponse.status === "fulfilled") setLearners(learnerResponse.value.learners);
      if (dashboardResponse.status === "rejected" && myResponse.status === "rejected") {
        const failure = dashboardResponse.reason instanceof Error ? dashboardResponse.reason : myResponse.reason;
        throw failure;
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to load assessments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const mySections = useMemo(() => myAssessments?.assignments, [myAssessments]);

  if (loading) return <div className="mx-auto max-w-7xl animate-pulse space-y-6"><div className="h-32 rounded-2xl bg-muted" /><div className="grid gap-4 md:grid-cols-2"><div className="h-72 rounded-xl bg-muted" /><div className="h-72 rounded-xl bg-muted" /></div></div>;
  if (error) return <div className="mx-auto max-w-3xl py-20 text-center"><AlertTriangle className="mx-auto size-8 text-destructive" /><h1 className="mt-4 text-xl font-semibold">Assessments unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-6" onClick={() => void load()}><RefreshCw />Try again</Button></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeading eyebrow="Assessment Studio" title="Capability readiness checks" description="Create formal readiness evidence from one active Sophia simulation, then let learners start or continue their assigned assessment without duplicate sessions." />
      {myAssessments ? (
        <section className="grid gap-4 sm:grid-cols-4">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Assigned</p><p className="mt-2 text-2xl font-semibold">{myAssessments.summary.assigned}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">In progress</p><p className="mt-2 text-2xl font-semibold">{myAssessments.summary.inProgress}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Completed</p><p className="mt-2 text-2xl font-semibold">{myAssessments.summary.completed}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Passed</p><p className="mt-2 text-2xl font-semibold">{myAssessments.summary.passed}</p></CardContent></Card>
        </section>
      ) : null}
      {dashboard ? <AssessmentManagement data={dashboard} simulations={simulations} learners={learners} onRefresh={() => void load()} /> : null}
      {mySections ? (
        <section className="space-y-5">
          <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /><h2 className="text-lg font-semibold">My Assessments</h2></div>
          {myAssessments?.summary.total === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card p-10 text-center"><CheckCircle2 className="mx-auto size-9 text-muted-foreground" /><h3 className="mt-4 font-semibold">No formal assessments assigned yet</h3><p className="mt-2 text-sm text-muted-foreground">When your manager assigns a readiness check, it will appear here.</p></div>
          ) : (
            <div className="space-y-6">
              {[...mySections.assigned, ...mySections.inProgress, ...mySections.completed].map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} />)}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
