"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Factory, FileQuestion, GraduationCap, Loader2, RefreshCw, Sparkles, Target, X } from "lucide-react";
import type { LearningFactoryAssetType, LearningFactoryDraftListResponse, LearningFactoryDraftResponse, LearningFactoryDraftStatus, LearningFactoryGenerateResponse, LearningFactoryPublishSimulationInput, LearningFactoryPublishSimulationResponse, SimulationDifficulty } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeading } from "@/components/layout/page-heading";

const assetTypes: Array<{ value: LearningFactoryAssetType; label: string }> = [
  { value: "SIMULATION", label: "Practice simulation" }, { value: "LEARNING_OBJECTIVE", label: "Learning objective" }, { value: "QUESTION_BANK", label: "Question bank" }, { value: "COACHING_FOCUS", label: "Coaching focus" },
];
const statuses: LearningFactoryDraftStatus[] = ["DRAFT", "APPROVED", "REJECTED", "PUBLISHED"];
const difficulties: SimulationDifficulty[] = ["Beginner", "Intermediate", "Advanced", "Expert"];
const icons = { SIMULATION: Sparkles, LEARNING_OBJECTIVE: GraduationCap, QUESTION_BANK: FileQuestion, COACHING_FOCUS: Target };
const assetLabel = (type: LearningFactoryAssetType) => assetTypes.find((item) => item.value === type)?.label ?? type;

export function LearningFactoryView() {
  const router = useRouter();
  const [data, setData] = useState<LearningFactoryDraftListResponse>();
  const [assetType, setAssetType] = useState<LearningFactoryAssetType | "">("");
  const [status, setStatus] = useState<LearningFactoryDraftStatus | "">("");
  const [pending, setPending] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [reviewingDraft, setReviewingDraft] = useState<LearningFactoryDraftResponse | null>(null);

  const load = useCallback(async () => {
    const query = new URLSearchParams();
    if (assetType) query.set("assetType", assetType);
    if (status) query.set("status", status);
    try { setData(await apiFetch<LearningFactoryDraftListResponse>(`/api/learning-factory/drafts?${query}`)); setError(undefined); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load Learning Factory drafts."); }
  }, [assetType, status]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function generate() {
    setPending("generate"); setError(undefined); setNotice(undefined);
    try {
      const result = await apiFetch<LearningFactoryGenerateResponse>("/api/learning-factory/generate", { method: "POST", body: "{}" });
      setNotice(result.generated ? `${result.generated} new draft${result.generated === 1 ? "" : "s"} created for review.` : "No new drafts were needed; existing source drafts were preserved.");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to generate drafts."); }
    finally { setPending(undefined); }
  }

  async function review(id: string, action: "approve" | "reject") {
    setPending(`${action}-${id}`); setError(undefined);
    try { await apiFetch(`/api/learning-factory/drafts/${id}/${action}`, { method: "POST" }); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : `Unable to ${action} this draft.`); }
    finally { setPending(undefined); }
  }

  async function publishSimulation(draft: LearningFactoryDraftResponse, input: LearningFactoryPublishSimulationInput) {
    setPending(`publish-${draft.id}`); setError(undefined); setNotice(undefined);
    try {
      const result = await apiFetch<LearningFactoryPublishSimulationResponse>(`/api/learning-factory/drafts/${draft.id}/publish-simulation`, { method: "POST", body: JSON.stringify(cleanPublishInput(input)) });
      setReviewingDraft(null);
      setNotice(result.alreadyPublished ? "This draft had already created a simulation. Opening it now." : "Simulation draft created in Simulation Studio for trainer review.");
      await load();
      router.push(`/simulation-studio/simulations/${result.simulation.id}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to create a simulation from this draft."); }
    finally { setPending(undefined); }
  }

  return <div className="mx-auto max-w-7xl space-y-8">
    <PageHeading eyebrow="Learning Factory" title="Turn knowledge into training drafts" description="Create practice-ready drafts from approved organizational priorities and governed knowledge. Every output requires trainer review." action={data?.canManage ? <Button onClick={() => void generate()} disabled={pending === "generate"}>{pending === "generate" ? <Loader2 className="animate-spin" /> : <Factory />}Generate drafts</Button> : undefined} />

    <Card className="border-primary/25"><CardContent className="grid gap-4 p-5 md:grid-cols-3"><div><p className="text-sm font-semibold">1. Prioritize</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Uses approved Blueprint priorities and Critical or Important knowledge.</p></div><div><p className="text-sm font-semibold">2. Prepare</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Creates simulations, objectives, questions, coaching focus, and capability links.</p></div><div><p className="text-sm font-semibold">3. Review</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Owners and Admins approve or reject every draft. Nothing is published automatically.</p></div></CardContent></Card>

    {error && <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
    {notice && <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</div>}

    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center"><select value={assetType} onChange={(event) => setAssetType(event.target.value as LearningFactoryAssetType | "")} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">All asset types</option>{assetTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value as LearningFactoryDraftStatus | "")} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item.charAt(0) + item.slice(1).toLowerCase()}</option>)}</select><Button variant="ghost" onClick={() => { setAssetType(""); setStatus(""); }}><RefreshCw />Reset filters</Button></div>

    {!data ? <div className="grid min-h-64 place-items-center rounded-xl border bg-card"><Loader2 className="animate-spin text-primary" /></div> : data.drafts.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{data.drafts.map((draft) => <DraftCard key={draft.id} draft={draft} canManage={data.canManage} canPublishSimulation={data.canPublishSimulation} pending={pending} onReview={review} onOpenPublishReview={setReviewingDraft} />)}</div> : <div className="grid min-h-72 place-items-center rounded-xl border border-dashed bg-card p-8 text-center"><div><Factory className="mx-auto size-9 text-muted-foreground" /><h2 className="mt-4 font-semibold">No drafts match this view</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">Generate drafts after the Organization Blueprint is approved and Knowledge Intelligence has identified Critical or Important sections.</p>{data.canManage && <Button className="mt-5" onClick={() => void generate()} disabled={pending === "generate"}>Generate drafts</Button>}</div></div>}
    <SimulationPublishDialog draft={reviewingDraft} pending={pending === `publish-${reviewingDraft?.id}`} onOpenChange={(open) => !open && setReviewingDraft(null)} onPublish={publishSimulation} />
  </div>;
}

function DraftCard({ draft, canManage, canPublishSimulation, pending, onReview, onOpenPublishReview }: { draft: LearningFactoryDraftResponse; canManage: boolean; canPublishSimulation: boolean; pending?: string; onReview: (id: string, action: "approve" | "reject") => Promise<void>; onOpenPublishReview: (draft: LearningFactoryDraftResponse) => void }) {
  const Icon = icons[draft.assetType];
  return <Card className="flex h-full flex-col"><CardHeader><div className="flex items-start justify-between gap-3"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span><Badge variant={draft.status === "APPROVED" ? "success" : draft.status === "REJECTED" ? "secondary" : "outline"}>{draft.status === "DRAFT" ? "Review required" : draft.status.charAt(0) + draft.status.slice(1).toLowerCase()}</Badge></div><CardTitle className="mt-3 text-base">{draft.title}</CardTitle><CardDescription>{assetLabel(draft.assetType)}</CardDescription></CardHeader><CardContent className="flex flex-1 flex-col"><p className="text-sm leading-6 text-muted-foreground">{draft.description}</p><div className="mt-4 flex flex-wrap gap-2"><Badge variant="secondary">{draft.importance}</Badge><Badge variant="outline">{Math.round(draft.confidence * 100)}% confidence</Badge>{draft.capabilityMappings.map((capability) => <Badge key={capability} variant="outline">{capability}</Badge>)}</div><div className="mt-5 rounded-lg bg-muted/40 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Business value</p><p className="mt-1 text-xs leading-5">{draft.businessValue}</p></div><div className="mt-auto space-y-2 pt-5">{canPublishSimulation && draft.assetType === "SIMULATION" && draft.status === "APPROVED" && <Button size="sm" className="w-full" disabled={Boolean(pending)} onClick={() => onOpenPublishReview(draft)}><Sparkles />Review & create simulation</Button>}{draft.status === "PUBLISHED" && draft.publishedSimulationId && <Button asChild size="sm" variant="outline" className="w-full"><Link href={`/simulation-studio/simulations/${draft.publishedSimulationId}`}><ExternalLink />Open simulation</Link></Button>}{canManage && draft.status !== "PUBLISHED" && <div className="flex gap-2"><Button size="sm" variant={draft.status === "APPROVED" ? "outline" : "default"} className="flex-1" disabled={Boolean(pending)} onClick={() => void onReview(draft.id, "approve")}><Check />Approve</Button><Button size="sm" variant="outline" className="flex-1" disabled={Boolean(pending)} onClick={() => void onReview(draft.id, "reject")}><X />Reject</Button></div>}</div></CardContent></Card>;
}

function draftString(draft: LearningFactoryDraftResponse | null, key: string, fallback: string) {
  const value = draft?.payload?.[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function draftObjectives(draft: LearningFactoryDraftResponse) {
  const value = draft.payload?.objectives;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").join("\n") : "Apply approved knowledge accurately\nExplain the decision using company guidance";
}

function cleanPublishInput(input: LearningFactoryPublishSimulationInput): LearningFactoryPublishSimulationInput {
  const cleaned: LearningFactoryPublishSimulationInput = {};
  for (const [key, value] of Object.entries(input) as Array<[keyof LearningFactoryPublishSimulationInput, unknown]>) {
    if (typeof value === "string" && !value.trim()) continue;
    if (Array.isArray(value) && !value.length) continue;
    Object.assign(cleaned, { [key]: value });
  }
  return cleaned;
}

function SimulationPublishDialog({ draft, pending, onOpenChange, onPublish }: { draft: LearningFactoryDraftResponse | null; pending: boolean; onOpenChange: (open: boolean) => void; onPublish: (draft: LearningFactoryDraftResponse, input: LearningFactoryPublishSimulationInput) => Promise<void> }) {
  return <Dialog open={Boolean(draft)} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Review simulation draft</DialogTitle><DialogDescription>Trainer review stays in control. This creates a Draft simulation in Simulation Studio; it does not auto-publish a learner experience.</DialogDescription></DialogHeader>{draft && <SimulationPublishForm key={draft.id} draft={draft} pending={pending} onOpenChange={onOpenChange} onPublish={onPublish} />}</DialogContent></Dialog>;
}

function initialPublishForm(draft: LearningFactoryDraftResponse): LearningFactoryPublishSimulationInput {
  return {
    title: draft.title.replace(/^Practice:\s*/iu, ""),
    description: draft.description,
    industry: "",
    department: "",
    jobRole: "Learner",
    category: draft.capabilityMappings[0] ?? "Knowledge-grounded practice",
    difficulty: (draft.payload.suggestedDifficulty as SimulationDifficulty | undefined) ?? "Intermediate",
    estimatedMinutes: 10,
    scenarioSetup: draftString(draft, "scenarioSetup", "Practice applying approved company guidance in a realistic workplace situation."),
    successCriteria: draftString(draft, "successCriteria", "The learner applies approved guidance accurately and explains the next step clearly."),
    objectives: draftObjectives(draft).split("\n").map((item) => item.trim()).filter(Boolean),
  };
}

function SimulationPublishForm({ draft, pending, onOpenChange, onPublish }: { draft: LearningFactoryDraftResponse; pending: boolean; onOpenChange: (open: boolean) => void; onPublish: (draft: LearningFactoryDraftResponse, input: LearningFactoryPublishSimulationInput) => Promise<void> }) {
  const [form, setForm] = useState<LearningFactoryPublishSimulationInput>(() => initialPublishForm(draft));
  const update = (key: keyof LearningFactoryPublishSimulationInput, value: string | number | string[] | null) => setForm((current) => ({ ...current, [key]: value }));

  return <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void onPublish(draft, form); }}><div className="grid gap-2"><Label htmlFor="simulation-title">Title</Label><Input id="simulation-title" value={form.title ?? ""} onChange={(event) => update("title", event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="simulation-description">Description</Label><Textarea id="simulation-description" value={form.description ?? ""} onChange={(event) => update("description", event.target.value)} /></div><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="simulation-job-role">Learner role</Label><Input id="simulation-job-role" value={form.jobRole ?? ""} onChange={(event) => update("jobRole", event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="simulation-duration">Estimated minutes</Label><Input id="simulation-duration" type="number" min={1} max={240} value={form.estimatedMinutes ?? 10} onChange={(event) => update("estimatedMinutes", Number(event.target.value))} /></div><div className="grid gap-2"><Label htmlFor="simulation-category">Use case</Label><Input id="simulation-category" value={form.category ?? ""} onChange={(event) => update("category", event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="simulation-difficulty">Difficulty</Label><select id="simulation-difficulty" value={form.difficulty ?? "Intermediate"} onChange={(event) => update("difficulty", event.target.value as SimulationDifficulty)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{difficulties.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}</select></div></div><div className="grid gap-2"><Label htmlFor="simulation-scenario">Scenario setup</Label><Textarea id="simulation-scenario" className="min-h-28" value={form.scenarioSetup ?? ""} onChange={(event) => update("scenarioSetup", event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="simulation-objectives">Objectives</Label><Textarea id="simulation-objectives" value={(form.objectives ?? []).join("\n")} onChange={(event) => update("objectives", event.target.value.split("\n").map((item) => item.trim()).filter(Boolean))} /><p className="text-xs text-muted-foreground">One objective per line.</p></div><div className="grid gap-2"><Label htmlFor="simulation-success">Success criteria</Label><Textarea id="simulation-success" value={form.successCriteria ?? ""} onChange={(event) => update("successCriteria", event.target.value)} /></div><div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">Provenance will be saved from this Learning Factory draft and its linked knowledge source. The created simulation remains editable in Simulation Studio.</div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Sparkles />}Create draft simulation</Button></DialogFooter></form>;
}
