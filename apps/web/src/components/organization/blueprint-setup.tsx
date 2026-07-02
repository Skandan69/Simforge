"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Save } from "lucide-react";
import type { CapabilityPriority, CurrentUserResponse, OrganizationBlueprintInput, OrganizationBlueprintResponse, WorkforceCapability } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/auth/form-message";

const trainingGoals = ["Customer Service", "Sales", "Compliance", "Leadership", "Product Knowledge", "Technical Skills", "Communication", "Onboarding"];
const capabilities: WorkforceCapability[] = ["Communication", "Product Knowledge", "Policy Compliance", "Empathy", "Problem Solving", "Decision Making"];
const teamSizes = ["1–10", "11–50", "51–200", "201–500", "501–1,000", "1,001–5,000", "5,001+"];
const steps = ["Organization context", "Training goals", "Capability priorities", "Success definition", "Review"];
const initialPriorities = () => Object.fromEntries(capabilities.map((capability) => [capability, "Medium"])) as Record<WorkforceCapability, CapabilityPriority>;

export function BlueprintSetup() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [canEdit, setCanEdit] = useState(false);
  const [status, setStatus] = useState<"DRAFT" | "APPROVED">("DRAFT");
  const [industry, setIndustry] = useState("");
  const [teamSizeRange, setTeamSizeRange] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [priorities, setPriorities] = useState(initialPriorities);
  const [criticalDocumentsNotes, setCriticalDocumentsNotes] = useState("");
  const [successDefinition, setSuccessDefinition] = useState("");
  const [costlyMistakes, setCostlyMistakes] = useState("");
  const [nonNegotiables, setNonNegotiables] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([apiFetch<CurrentUserResponse>("/api/me"), apiFetch<OrganizationBlueprintResponse | null>("/api/organization-blueprint")])
      .then(([me, blueprint]) => {
        if (!active) return;
        const editable = me.role === "Owner" || me.role === "Admin";
        setCanEdit(editable);
        setIndustry(blueprint?.industry ?? me.organization?.industry ?? "");
        setTeamSizeRange(blueprint?.teamSizeRange ?? me.organization?.companySize ?? "");
        if (blueprint) {
          setStatus(blueprint.status);
          setGoals(blueprint.primaryTrainingGoals);
          setPriorities(Object.fromEntries(blueprint.priorityCapabilities.map((item) => [item.capability, item.priority])) as Record<WorkforceCapability, CapabilityPriority>);
          setCriticalDocumentsNotes(blueprint.criticalDocumentsNotes);
          setSuccessDefinition(blueprint.successDefinition);
          setCostlyMistakes(blueprint.costlyMistakes);
          setNonNegotiables(blueprint.nonNegotiables);
        }
        if (!editable) setStep(4);
      })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load the organization blueprint."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const input = useMemo<OrganizationBlueprintInput>(() => ({
    industry, teamSizeRange, primaryTrainingGoals: goals,
    priorityCapabilities: capabilities.map((capability) => ({ capability, priority: priorities[capability] })),
    criticalDocumentsNotes, successDefinition, costlyMistakes, nonNegotiables,
  }), [industry, teamSizeRange, goals, priorities, criticalDocumentsNotes, successDefinition, costlyMistakes, nonNegotiables]);

  const canContinue = step === 0 ? industry.trim().length >= 2 && Boolean(teamSizeRange) : step === 1 ? goals.length > 0 : step === 3 ? [successDefinition, costlyMistakes, nonNegotiables].every((value) => value.trim().length >= 3) : true;

  async function save(approve: boolean) {
    setPending(true); setError(undefined);
    try {
      const draft = await apiFetch<OrganizationBlueprintResponse>("/api/organization-blueprint", { method: "POST", body: JSON.stringify(input) });
      if (approve) {
        const approved = await apiFetch<OrganizationBlueprintResponse>("/api/organization-blueprint/approve", { method: "POST" });
        setStatus(approved.status);
      } else setStatus(draft.status);
      router.push("/dashboard"); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save the blueprint."); }
    finally { setPending(false); }
  }

  if (loading) return <div className="flex min-h-80 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Preparing your blueprint…</div>;

  return <div className="mx-auto max-w-4xl space-y-6">
    <div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Organization Blueprint</Badge><Badge variant={status === "APPROVED" ? "success" : "secondary"}>{status === "APPROVED" ? "Approved" : "Draft"}</Badge></div><h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Define what better looks like</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Capture the outcomes, capabilities, and guardrails that matter most to your organization.</p></div>
    <div className="grid grid-cols-5 gap-2" aria-label="Blueprint progress">{steps.map((label, index) => <div key={label}><div className={`h-1.5 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`} /><p className="mt-2 hidden text-xs text-muted-foreground md:block">{label}</p></div>)}</div>
    <Card><CardHeader><CardTitle>{steps[step]}</CardTitle><CardDescription>{step === 0 ? "Start with the shape of the team this blueprint supports." : step === 1 ? "Choose the areas where stronger workforce capability matters now." : step === 2 ? "Rate how important each capability is to your organization." : step === 3 ? "Describe outcomes and boundaries in plain language." : "Review the blueprint before saving or approving it."}</CardDescription></CardHeader><CardContent className="space-y-6">
      <FormMessage message={error} />
      {step === 0 && <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="industry">Industry</Label><Input id="industry" value={industry} onChange={(event) => setIndustry(event.target.value)} disabled={!canEdit} /></div><div className="space-y-2"><Label htmlFor="team-size">Team size range</Label><select id="team-size" value={teamSizeRange} onChange={(event) => setTeamSizeRange(event.target.value)} disabled={!canEdit} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select team size</option>{teamSizes.map((size) => <option key={size}>{size}</option>)}</select></div></div>}
      {step === 1 && <div className="space-y-6"><div className="grid gap-3 sm:grid-cols-2">{trainingGoals.map((goal) => { const selected = goals.includes(goal); return <button key={goal} type="button" disabled={!canEdit} onClick={() => setGoals(selected ? goals.filter((item) => item !== goal) : [...goals, goal])} className={`flex items-center justify-between rounded-xl border p-4 text-left text-sm font-medium transition-colors ${selected ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted/50"}`}>{goal}{selected && <Check className="size-4" />}</button>; })}</div><div className="space-y-2"><Label htmlFor="documents">Critical documents or guidance <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="documents" value={criticalDocumentsNotes} onChange={(event) => setCriticalDocumentsNotes(event.target.value)} disabled={!canEdit} placeholder="For example: customer verification policy, product handbook, escalation guide" /></div></div>}
      {step === 2 && <div className="divide-y rounded-xl border">{capabilities.map((capability) => <div key={capability} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{capability}</p><p className="text-xs text-muted-foreground">How strongly should this shape workforce practice?</p></div><select value={priorities[capability]} disabled={!canEdit} onChange={(event) => setPriorities({ ...priorities, [capability]: event.target.value as CapabilityPriority })} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option>High</option><option>Medium</option><option>Low</option></select></div>)}</div>}
      {step === 3 && <div className="space-y-5"><div className="space-y-2"><Label htmlFor="success">What should employees become better at?</Label><Textarea id="success" value={successDefinition} disabled={!canEdit} onChange={(event) => setSuccessDefinition(event.target.value)} placeholder="Describe the behavior or outcome you want to see more consistently." /></div><div className="space-y-2"><Label htmlFor="mistakes">What mistakes are most expensive?</Label><Textarea id="mistakes" value={costlyMistakes} disabled={!canEdit} onChange={(event) => setCostlyMistakes(event.target.value)} placeholder="Focus on mistakes that affect customers, revenue, safety, or trust." /></div><div className="space-y-2"><Label htmlFor="guardrails">What should never happen?</Label><Textarea id="guardrails" value={nonNegotiables} disabled={!canEdit} onChange={(event) => setNonNegotiables(event.target.value)} placeholder="List the non-negotiable boundaries employees must follow." /></div></div>}
      {step === 4 && <div className="space-y-5"><Review label="Organization context" value={`${industry} · ${teamSizeRange}`} /><Review label="Training goals" value={goals.join(", ")} /><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Capability priorities</p><div className="mt-2 flex flex-wrap gap-2">{input.priorityCapabilities.map((item) => <Badge key={item.capability} variant="outline">{item.capability}: {item.priority}</Badge>)}</div></div>{criticalDocumentsNotes && <Review label="Critical documents or guidance" value={criticalDocumentsNotes} />}<Review label="Employees should become better at" value={successDefinition} /><Review label="Most expensive mistakes" value={costlyMistakes} /><Review label="Non-negotiables" value={nonNegotiables} />{!canEdit && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Owners and Admins can update or approve this blueprint.</p>}</div>}
      <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"><Button variant="outline" onClick={() => step === 0 ? router.push("/dashboard") : setStep(step - 1)}><ArrowLeft />{step === 0 ? "Back to dashboard" : "Back"}</Button>{canEdit && step < 4 && <Button disabled={!canContinue} onClick={() => setStep(step + 1)}>Continue<ArrowRight /></Button>}{canEdit && step === 4 && <div className="flex flex-col gap-2 sm:flex-row"><Button variant="outline" disabled={pending} onClick={() => void save(false)}><Save />Save draft</Button><Button disabled={pending} onClick={() => void save(true)}>{pending && <Loader2 className="animate-spin" />}Approve blueprint</Button></div>}</div>
    </CardContent></Card>
  </div>;
}

function Review({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{value || "Not provided"}</p></div>;
}
