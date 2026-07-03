"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  Save,
  X,
} from "lucide-react";
import {
  SIMULATION_DIFFICULTIES,
  SIMULATION_STATUSES,
  type EnterprisePersonaTemplate,
  type KnowledgeBaseSummary,
  type SaveSimulationInput,
  type SimulationCriterionSummary,
  type SimulationDashboardResponse,
  type SimulationDetail,
  type SimulationPersonaSummary,
} from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeading } from "@/components/layout/page-heading";

const steps = [
  "Basics",
  "Knowledge Bases",
  "Persona",
  "Objectives",
  "Evaluation",
  "Review & Save",
];
const initial: SaveSimulationInput = {
  title: "",
  description: "",
  industry: "",
  department: "",
  jobRole: "",
  category: "",
  difficulty: "Beginner",
  status: "Draft",
  estimatedMinutes: 15,
  personaId: null,
  scenarioSetup: "",
  successCriteria: "",
  objectives: [""],
  knowledgeBaseIds: [],
  criterionIds: [],
};
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
export function SimulationBuilder({ id }: { id?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [value, setValue] = useState<SaveSimulationInput>(initial);
  const [bases, setBases] = useState<KnowledgeBaseSummary[]>([]);
  const [personas, setPersonas] = useState<SimulationPersonaSummary[]>([]);
  const [personaTemplates, setPersonaTemplates] = useState<EnterprisePersonaTemplate[]>([]);
  const [criteria, setCriteria] = useState<SimulationCriterionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [installingPersona, setInstallingPersona] = useState<string>();
  const [error, setError] = useState<string>();
  const [canEdit, setCanEdit] = useState(false);
  useEffect(() => {
    let active = true;
    void Promise.all([
      apiFetch<KnowledgeBaseSummary[]>("/api/knowledge-bases?status=Active"),
      apiFetch<SimulationPersonaSummary[]>("/api/simulation-personas"),
      apiFetch<EnterprisePersonaTemplate[]>("/api/simulation-personas/templates"),
      apiFetch<SimulationCriterionSummary[]>("/api/simulation-criteria"),
      apiFetch<SimulationDashboardResponse>("/api/simulations/dashboard"),
      id
        ? apiFetch<SimulationDetail>(`/api/simulations/${id}`)
        : Promise.resolve(undefined),
    ])
      .then(([knowledge, personaList, templateList, criterionList, dashboard, existing]) => {
        if (!active) return;
        setBases(knowledge);
        setPersonas(personaList);
        setPersonaTemplates(templateList);
        setCriteria(criterionList);
        setCanEdit(dashboard.canEdit);
        if (existing)
          setValue({
            title: existing.title,
            description: existing.description,
            industry: existing.industry,
            department: existing.department,
            jobRole: existing.jobRole,
            category: existing.category,
            difficulty: existing.difficulty,
            status: existing.status,
            estimatedMinutes: existing.estimatedMinutes,
            personaId: existing.persona?.id ?? null,
            scenarioSetup: existing.scenarioSetup,
            successCriteria: existing.successCriteria,
            objectives: existing.objectives.map((item) => item.title),
            knowledgeBaseIds: existing.knowledgeBases.map((item) => item.id),
            criterionIds: existing.evaluationCriteria.map((item) => item.id),
          });
      })
      .catch(
        (caught: unknown) =>
          active &&
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load the builder.",
          ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);
  const selectedPersona = personas.find((item) => item.id === value.personaId);
  const selectedBases = useMemo(
    () => bases.filter((item) => value.knowledgeBaseIds.includes(item.id)),
    [bases, value.knowledgeBaseIds],
  );
  const selectedCriteria = useMemo(
    () => criteria.filter((item) => value.criterionIds.includes(item.id)),
    [criteria, value.criterionIds],
  );
  const patch = <K extends keyof SaveSimulationInput>(
    key: K,
    next: SaveSimulationInput[K],
  ) => setValue((current) => ({ ...current, [key]: next }));
  const toggle = (key: "knowledgeBaseIds" | "criterionIds", idValue: string) =>
    patch(
      key,
      value[key].includes(idValue)
        ? value[key].filter((item) => item !== idValue)
        : [...value[key], idValue],
    );
  async function selectPersonaTemplate(templateId: string) {
    if (!canEdit || installingPersona) return;
    setInstallingPersona(templateId);
    setError(undefined);
    try {
      const installed = await apiFetch<SimulationPersonaSummary>(
        `/api/simulation-personas/templates/${templateId}/install`,
        { method: "POST" },
      );
      setPersonas((current) =>
        current.some((item) => item.id === installed.id)
          ? current
          : [installed, ...current],
      );
      patch("personaId", installed.id);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to configure this persona template.",
      );
    } finally {
      setInstallingPersona(undefined);
    }
  }
  function validateCurrent() {
    if (
      step === 0 &&
      (!value.title.trim() ||
        !value.description.trim() ||
        !value.industry.trim() ||
        !value.department.trim() ||
        !value.jobRole.trim() ||
        !value.category.trim() ||
        !value.scenarioSetup.trim() ||
        !value.successCriteria.trim())
    )
      return "Complete all basic scenario fields.";
    if (step === 1 && bases.length > 0 && !value.knowledgeBaseIds.length)
      return "Select at least one active knowledge base.";
    if (step === 3 && !value.objectives.some((item) => item.trim()))
      return "Add at least one objective.";
    if (step === 4 && !value.criterionIds.length)
      return "Select at least one evaluation criterion.";
    return undefined;
  }
  function next() {
    const message = validateCurrent();
    if (message) {
      setError(message);
      return;
    }
    setError(undefined);
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }
  async function save() {
    const message = validateCurrent();
    if (message) {
      setError(message);
      return;
    }
    setPending(true);
    try {
      const payload = {
        ...value,
        objectives: value.objectives.map((item) => item.trim()).filter(Boolean),
      };
      const result = await apiFetch<SimulationDetail>(
        id ? `/api/simulations/${id}` : "/api/simulations",
        { method: id ? "PUT" : "POST", body: JSON.stringify(payload) },
      );
      router.push(`/simulation-studio/simulations/${result.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save simulation.",
      );
    } finally {
      setPending(false);
    }
  }
  if (loading)
    return (
      <div className="grid min-h-80 place-items-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  if (!canEdit)
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <h1 className="font-semibold">Builder access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only Owners, Admins, and Trainers can configure simulations.
        </p>
      </div>
    );
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Guided builder"
        title={id ? "Edit simulation" : "Create simulation"}
        description="Build one clear practice scenario at a time. You can keep it as a draft until it is ready."
      />
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[720px] gap-2">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => index < step && setStep(index)}
              className={cn(
                "flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium",
                index === step
                  ? "border-primary bg-primary/10 text-primary"
                  : index < step
                    ? "bg-muted"
                    : "text-muted-foreground",
              )}
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full border">
                {index < step ? <Check className="size-3" /> : index + 1}
              </span>
              {label}
            </button>
          ))}
        </div>
      </div>
      <Card>
        <CardContent className="p-5 sm:p-7">
          {step === 0 && (
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Title">
                <Input
                  value={value.title}
                  onChange={(event) => patch("title", event.target.value)}
                  placeholder="Difficult billing conversation"
                />
              </Field>
              <Field label="Industry">
                <Input
                  value={value.industry}
                  onChange={(event) => patch("industry", event.target.value)}
                  placeholder="Financial services"
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Description">
                  <Textarea
                    value={value.description}
                    onChange={(event) =>
                      patch("description", event.target.value)
                    }
                    placeholder="Explain what this practice scenario teaches."
                  />
                </Field>
              </div>
              <Field label="Department">
                <Input
                  value={value.department}
                  onChange={(event) => patch("department", event.target.value)}
                  placeholder="Customer Support"
                />
              </Field>
              <Field label="Job role">
                <Input
                  value={value.jobRole}
                  onChange={(event) => patch("jobRole", event.target.value)}
                  placeholder="Support specialist"
                />
              </Field>
              <Field label="Use case / category">
                <Input
                  value={value.category}
                  onChange={(event) => patch("category", event.target.value)}
                  placeholder="Complaint handling"
                />
              </Field>
              <Field label="Estimated duration (minutes)">
                <Input
                  type="number"
                  min={1}
                  max={240}
                  value={value.estimatedMinutes}
                  onChange={(event) =>
                    patch("estimatedMinutes", Number(event.target.value))
                  }
                />
              </Field>
              <Field label="Difficulty">
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={value.difficulty}
                  onChange={(event) =>
                    patch(
                      "difficulty",
                      event.target.value as SaveSimulationInput["difficulty"],
                    )
                  }
                >
                  {SIMULATION_DIFFICULTIES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={value.status}
                  onChange={(event) =>
                    patch(
                      "status",
                      event.target.value as SaveSimulationInput["status"],
                    )
                  }
                >
                  {SIMULATION_STATUSES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Scenario setup">
                  <Textarea
                    className="min-h-28"
                    value={value.scenarioSetup}
                    onChange={(event) =>
                      patch("scenarioSetup", event.target.value)
                    }
                    placeholder="Describe the situation, constraints, and starting context."
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Success criteria">
                  <Textarea
                    value={value.successCriteria}
                    onChange={(event) =>
                      patch("successCriteria", event.target.value)
                    }
                    placeholder="Describe what a successful outcome looks like."
                  />
                </Field>
              </div>
            </div>
          )}
          {step === 1 && (
            <SelectionEmpty
              title="Connect company knowledge"
              description="Choose the active knowledge bases trainers expect this simulation to draw from."
              empty={!bases.length}
              emptyDescription="No reusable knowledge bases are available yet. You can continue without company knowledge or upload reusable knowledge later."
            >
              {bases.map((item) => (
                <Choice
                  key={item.id}
                  selected={value.knowledgeBaseIds.includes(item.id)}
                  onClick={() => toggle("knowledgeBaseIds", item.id)}
                  title={item.name}
                  description={`${item.department} · ${item.documentCount} documents`}
                />
              ))}
            </SelectionEmpty>
          )}
          {step === 2 && (
            <div className="space-y-7">
              <div>
                <h2 className="font-semibold">Choose a persona template</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Templates configure Sophia&apos;s identity, communication style,
                  emotional profile, challenge, and role boundaries without
                  changing the runtime.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {personaTemplates.map((template) => {
                  const installed = personas.find(
                    (item) => item.name === template.displayName,
                  );
                  return (
                    <Choice
                      key={template.id}
                      selected={Boolean(
                        installed && value.personaId === installed.id,
                      )}
                      onClick={() =>
                        installed
                          ? patch(
                              "personaId",
                              value.personaId === installed.id
                                ? null
                                : installed.id,
                            )
                          : void selectPersonaTemplate(template.id)
                      }
                      title={template.displayName}
                      description={`${template.industry} · ${template.challengeLevel} challenge · ${template.description}`}
                    />
                  );
                })}
              </div>
              {installingPersona && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Configuring persona…
                </p>
              )}
            <SelectionEmpty
              title="Choose a reusable persona"
              description="The persona defines the counterpart’s role, tone, and behavior. A persona is optional."
              empty={!personas.length}
            >
              {personas.map((item) => (
                <Choice
                  key={item.id}
                  selected={value.personaId === item.id}
                  onClick={() =>
                    patch(
                      "personaId",
                      value.personaId === item.id ? null : item.id,
                    )
                  }
                  title={item.name}
                  description={`${item.role} · ${item.tone}`}
                />
              ))}
            </SelectionEmpty>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-semibold">Learning objectives</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add observable actions the learner should practice.
                </p>
              </div>
              {value.objectives.map((objective, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={objective}
                    onChange={(event) =>
                      patch(
                        "objectives",
                        value.objectives.map((item, itemIndex) =>
                          itemIndex === index ? event.target.value : item,
                        ),
                      )
                    }
                    placeholder="Show empathy and acknowledge the concern"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove objective"
                    onClick={() =>
                      patch(
                        "objectives",
                        value.objectives.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      )
                    }
                  >
                    <X />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => patch("objectives", [...value.objectives, ""])}
              >
                <Plus />
                Add objective
              </Button>
            </div>
          )}
          {step === 4 && (
            <SelectionEmpty
              title="Evaluation criteria"
              description="Select the dimensions trainers will eventually use to evaluate performance. No scoring is performed yet."
              empty={!criteria.length}
            >
              {criteria.map((item) => (
                <Choice
                  key={item.id}
                  selected={value.criterionIds.includes(item.id)}
                  onClick={() => toggle("criterionIds", item.id)}
                  title={item.name}
                  description={item.description}
                />
              ))}
            </SelectionEmpty>
          )}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">
                  {value.title || "Untitled simulation"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {value.description}
                </p>
              </div>
              <Review
                label="Basics"
                value={`${value.department} · ${value.jobRole} · ${value.difficulty} · ${value.estimatedMinutes} minutes`}
              />
              <Review
                label="Knowledge bases"
                value={
                  selectedBases.map((item) => item.name).join(", ") ||
                  "No knowledge bases linked"
                }
              />
              <Review
                label="Persona"
                value={
                  selectedPersona
                    ? `${selectedPersona.name} — ${selectedPersona.role}`
                    : "No persona selected"
                }
              />
              <Review
                label="Objectives"
                value={value.objectives.filter(Boolean).join(" • ")}
              />
              <Review
                label="Evaluation"
                value={selectedCriteria.map((item) => item.name).join(", ")}
              />
              <Review label="Scenario" value={value.scenarioSetup} />
              <Review label="Success criteria" value={value.successCriteria} />
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => (step ? setStep(step - 1) : router.back())}
        >
          <ArrowLeft />
          {step ? "Back" : "Cancel"}
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={next}>
            Continue
            <ArrowRight />
          </Button>
        ) : (
          <Button onClick={() => void save()} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />}
            {pending ? "Saving…" : "Save simulation"}
          </Button>
        )}
      </div>
    </div>
  );
}
function SelectionEmpty({
  title,
  description,
  empty,
  emptyDescription,
  children,
}: {
  title: string;
  description: string;
  empty: boolean;
  emptyDescription?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {empty ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {emptyDescription ??
            "Nothing is available yet. You can continue and return after creating reusable resources."}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">{children}</div>
      )}
    </div>
  );
}
function Choice({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-colors",
        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block font-medium">{title}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {description}
          </span>
        </span>
        {selected && (
          <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3" />
          </span>
        )}
      </span>
    </button>
  );
}
function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t pt-4 first:border-0 first:pt-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
        {value || "Not provided"}
      </p>
    </div>
  );
}
