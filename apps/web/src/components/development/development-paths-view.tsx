"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Archive, CheckCircle2, Loader2, Plus, RefreshCw, Route, Send } from "lucide-react";
import { WORKFORCE_CAPABILITIES, type AssessmentDashboardResponse, type DevelopmentPathDashboardResponse, type DevelopmentPathResponse, type ManagerLearnerListResponse, type SimulationDashboardResponse, type WorkforceCapability } from "@simforge/shared";
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
  if (status === "IN_PROGRESS" || status === "ASSIGNED") return "warning" as const;
  return "outline" as const;
}

function PathCard({ path, onActivate, onArchive }: { path: DevelopmentPathResponse; onActivate: (id: string) => void; onArchive: (id: string) => void }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(path.status)}>{path.status}</Badge>
          {path.capabilities.map((capability) => <Badge key={capability} variant="outline">{capability}</Badge>)}
        </div>
        <CardTitle className="text-base">{path.title}</CardTitle>
        <CardDescription>{path.description || "Structured practice and readiness evidence."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-muted-foreground">Department:</span> {path.department || "Any"}</p>
          <p><span className="text-muted-foreground">Target role:</span> {path.targetRole || "Any"}</p>
          <p><span className="text-muted-foreground">Assignments:</span> {path.assignmentCount}</p>
          <p><span className="text-muted-foreground">Steps:</span> {path.steps.length}</p>
        </div>
        <ol className="space-y-2">
          {path.steps.map((step) => (
            <li key={step.id} className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between gap-3"><span className="font-medium">{step.sortOrder}. {step.title}</span><Badge variant="outline">{step.type}</Badge></div>
              <p className="mt-1 text-xs text-muted-foreground">{step.type === "PRACTICE" ? step.simulation?.title : step.assessment?.title}</p>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          {path.status === "DRAFT" ? <Button size="sm" onClick={() => onActivate(path.id)}><CheckCircle2 />Activate</Button> : null}
          {path.status !== "ARCHIVED" ? <Button size="sm" variant="outline" onClick={() => onArchive(path.id)}><Archive />Archive</Button> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function DevelopmentPathsView() {
  const [dashboard, setDashboard] = useState<DevelopmentPathDashboardResponse>();
  const [simulations, setSimulations] = useState<SimulationDashboardResponse>();
  const [assessments, setAssessments] = useState<AssessmentDashboardResponse>();
  const [learners, setLearners] = useState<ManagerLearnerListResponse>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    targetRole: "",
    department: "",
    capability: "Communication" as WorkforceCapability,
    simulationId: "",
    assessmentId: "",
  });
  const [assignmentForm, setAssignmentForm] = useState({ pathId: "", learnerId: "", reason: "" });

  const activeSimulations = useMemo(() => simulations?.simulations.filter((simulation) => simulation.status === "Active") ?? [], [simulations]);
  const activeAssessments = useMemo(() => assessments?.assessments.filter((assessment) => assessment.status === "ACTIVE") ?? [], [assessments]);

  const load = useCallback(async () => {
    try {
      const [pathResponse, simulationResponse, assessmentResponse, learnerResponse] = await Promise.all([
        apiFetch<DevelopmentPathDashboardResponse>("/api/development-paths"),
        apiFetch<SimulationDashboardResponse>("/api/simulations/dashboard").catch(() => undefined),
        apiFetch<AssessmentDashboardResponse>("/api/assessments").catch(() => undefined),
        apiFetch<ManagerLearnerListResponse>("/api/manager-intelligence/learners").catch(() => undefined),
      ]);
      setDashboard(pathResponse);
      setSimulations(simulationResponse);
      setAssessments(assessmentResponse);
      setLearners(learnerResponse);
      setError(undefined);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 403) setError("Development Paths are available to Owners, Admins, Trainers, and Managers.");
      else setError(caught instanceof Error ? caught.message : "Unable to load Development Paths.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function createPath() {
    setSaving(true);
    setError(undefined);
    try {
      await apiFetch("/api/development-paths", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          targetRole: form.targetRole,
          department: form.department,
          capabilities: [form.capability],
          status: "DRAFT",
          steps: [
            { type: "PRACTICE", sortOrder: 1, title: "Complete targeted Sophia practice", required: true, simulationId: form.simulationId },
            { type: "ASSESSMENT", sortOrder: 2, title: "Complete readiness assessment", required: true, assessmentId: form.assessmentId },
          ],
        }),
      });
      setForm({ title: "", description: "", targetRole: "", department: "", capability: "Communication", simulationId: "", assessmentId: "" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create this path.");
    } finally {
      setSaving(false);
    }
  }

  async function activate(id: string) {
    await apiFetch(`/api/development-paths/${id}/activate`, { method: "POST", body: "{}" });
    await load();
  }
  async function archive(id: string) {
    await apiFetch(`/api/development-paths/${id}/archive`, { method: "POST", body: "{}" });
    await load();
  }
  async function assignPath() {
    setAssigning(true);
    setError(undefined);
    try {
      await apiFetch(`/api/development-paths/${assignmentForm.pathId}/assignments`, { method: "POST", body: JSON.stringify({ learnerId: assignmentForm.learnerId, reason: assignmentForm.reason }) });
      setAssignmentForm({ pathId: "", learnerId: "", reason: "" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to assign this path.");
    } finally {
      setAssigning(false);
    }
  }

  if (error && !dashboard) return <div className="mx-auto max-w-3xl py-20 text-center"><AlertTriangle className="mx-auto size-8 text-destructive" /><h1 className="mt-4 text-xl font-semibold">Development Paths unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-6" onClick={() => void load()}><RefreshCw />Try again</Button></div>;
  if (!dashboard) return <div className="mx-auto max-w-7xl animate-pulse space-y-6"><div className="h-32 rounded-2xl bg-muted" /><div className="h-96 rounded-xl bg-muted" /></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeading eyebrow="Development Paths" title="Structured capability development" description="Create ordered Practice and Assessment paths that reuse SimForge evidence instead of becoming an LMS." />
      {error ? <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        {dashboard.canManagePaths ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Create path</CardTitle><CardDescription>v1 supports ordered Practice → Assessment steps.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="path-title">Title</Label><Input id="path-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Refund readiness path" /></div>
                <div className="space-y-2"><Label htmlFor="path-capability">Capability</Label><select id="path-capability" value={form.capability} onChange={(event) => setForm({ ...form, capability: event.target.value as WorkforceCapability })} className="h-10 w-full rounded-md border bg-background px-3 text-sm">{WORKFORCE_CAPABILITIES.map((capability) => <option key={capability}>{capability}</option>)}</select></div>
                <div className="space-y-2"><Label htmlFor="path-role">Target role</Label><Input id="path-role" value={form.targetRole} onChange={(event) => setForm({ ...form, targetRole: event.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="path-dept">Department</Label><Input id="path-dept" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="path-description">Description</Label><Textarea id="path-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} /></div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="path-simulation">Practice simulation</Label><select id="path-simulation" value={form.simulationId} onChange={(event) => setForm({ ...form, simulationId: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Select active simulation</option>{activeSimulations.map((simulation) => <option key={simulation.id} value={simulation.id}>{simulation.title}</option>)}</select></div>
                <div className="space-y-2"><Label htmlFor="path-assessment">Readiness assessment</Label><select id="path-assessment" value={form.assessmentId} onChange={(event) => setForm({ ...form, assessmentId: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Select active assessment</option>{activeAssessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title}</option>)}</select></div>
              </div>
              <Button onClick={() => void createPath()} disabled={saving || !form.title || !form.simulationId || !form.assessmentId}>{saving ? <Loader2 className="animate-spin" /> : <Plus />}Create draft path</Button>
            </CardContent>
          </Card>
        ) : null}

        {dashboard.canAssignPaths ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Assign path</CardTitle><CardDescription>Managers assign active paths; learners complete the steps in My Development.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label htmlFor="assign-path">Active path</Label><select id="assign-path" value={assignmentForm.pathId} onChange={(event) => setAssignmentForm({ ...assignmentForm, pathId: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Select path</option>{dashboard.paths.filter((path) => path.status === "ACTIVE").map((path) => <option key={path.id} value={path.id}>{path.title}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor="assign-learner">Learner</Label><select id="assign-learner" value={assignmentForm.learnerId} onChange={(event) => setAssignmentForm({ ...assignmentForm, learnerId: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Select learner</option>{learners?.learners.filter((learner) => learner.role === "Learner").map((learner) => <option key={learner.id} value={learner.id}>{learner.name}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor="assign-reason">Reason</Label><Textarea id="assign-reason" value={assignmentForm.reason} onChange={(event) => setAssignmentForm({ ...assignmentForm, reason: event.target.value })} rows={3} /></div>
              <Button onClick={() => void assignPath()} disabled={assigning || !assignmentForm.pathId || !assignmentForm.learnerId}>{assigning ? <Loader2 className="animate-spin" /> : <Send />}Assign path</Button>
            </CardContent>
          </Card>
        ) : null}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {dashboard.paths.length ? dashboard.paths.map((path) => <PathCard key={path.id} path={path} onActivate={(id) => void activate(id)} onArchive={(id) => void archive(id)} />) : <Card><CardContent className="p-10 text-center"><Route className="mx-auto size-9 text-muted-foreground" /><p className="mt-3 font-medium">No development paths yet</p><p className="mt-1 text-sm text-muted-foreground">Create a simple ordered path from existing practice and assessment assets.</p></CardContent></Card>}
      </section>
    </div>
  );
}
