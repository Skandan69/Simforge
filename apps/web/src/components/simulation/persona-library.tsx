"use client";
import { useCallback, useEffect, useState } from "react";
import { Bot, Library, Loader2, Plus } from "lucide-react";
import type {
  EnterprisePersonaTemplate,
  SimulationDashboardResponse,
  SimulationPersonaSummary,
} from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeading } from "@/components/layout/page-heading";

export function PersonaLibrary() {
  const [items, setItems] = useState<SimulationPersonaSummary[]>();
  const [templates, setTemplates] = useState<EnterprisePersonaTemplate[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [installing, setInstalling] = useState<string>();
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    try {
      const [personas, dashboard, templateList] = await Promise.all([
        apiFetch<SimulationPersonaSummary[]>("/api/simulation-personas"),
        apiFetch<SimulationDashboardResponse>("/api/simulations/dashboard"),
        apiFetch<EnterprisePersonaTemplate[]>("/api/simulation-personas/templates"),
      ]);
      setItems(personas);
      setCanEdit(dashboard.canEdit);
      setTemplates(templateList);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load personas.",
      );
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch("/api/simulation-personas", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form)),
      });
      setOpen(false);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to create persona.",
      );
    } finally {
      setPending(false);
    }
  }
  async function install(templateId: string) {
    setInstalling(templateId);
    setError(undefined);
    try {
      await apiFetch(`/api/simulation-personas/templates/${templateId}/install`, { method: "POST" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add this persona template.");
    } finally {
      setInstalling(undefined);
    }
  }
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Reusable configuration"
        title="Personas"
        description="Define the people and behaviors trainers can reuse across practice scenarios."
        action={
          canEdit ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus />
                  Create persona
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create persona</DialogTitle>
                  <DialogDescription>
                    Describe a counterpart clearly enough for trainers to reuse
                    later.
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={create}>
                  {[
                    ["name", "Name", "Angry customer"],
                    ["role", "Role", "Customer"],
                    ["personality", "Personality", "Impatient but reasonable"],
                    ["tone", "Tone", "Frustrated and direct"],
                  ].map(([name, label, placeholder]) => (
                    <div key={name} className="space-y-2">
                      <Label htmlFor={name}>{label}</Label>
                      <Input
                        id={name}
                        name={name}
                        placeholder={placeholder}
                        required
                      />
                    </div>
                  ))}
                  <div className="space-y-2">
                    <Label htmlFor="difficultyBehavior">
                      Difficulty behavior
                    </Label>
                    <Textarea
                      id="difficultyBehavior"
                      name="difficultyBehavior"
                      placeholder="How the persona becomes more challenging"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backgroundContext">
                      Background context
                    </Label>
                    <Textarea
                      id="backgroundContext"
                      name="backgroundContext"
                      placeholder="Relevant history and circumstances"
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={pending}>
                      {pending ? "Creating…" : "Create persona"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />
      {error && (
        <p className="rounded-lg border p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <section className="space-y-4" aria-labelledby="starter-personas">
        <div><div className="flex items-center gap-2"><Library className="size-5 text-primary" /><h2 id="starter-personas" className="text-lg font-semibold">Enterprise starter library</h2></div><p className="mt-1 text-sm text-muted-foreground">Install a governed starting point, then select it in any simulation. Templates configure the existing Sophia Runtime.</p></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => {
            const installed = items?.some((item) => item.name === template.displayName);
            return <Card key={template.id} className="flex h-full flex-col"><CardContent className="flex h-full flex-col p-5"><div className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><Bot className="size-5" /></span><Badge variant="outline">{template.category}</Badge></div><h3 className="mt-4 font-semibold">{template.displayName}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{template.description}</p><div className="mt-4 flex flex-wrap gap-2"><Badge variant="secondary">{template.industry}</Badge><Badge variant="secondary">{template.challengeLevel} challenge</Badge></div>{canEdit && <Button type="button" variant="outline" size="sm" className="mt-5" disabled={installed || Boolean(installing)} onClick={() => void install(template.id)}>{installing === template.id ? <Loader2 className="animate-spin" /> : <Plus />}{installed ? "Added to workspace" : "Add to workspace"}</Button>}</CardContent></Card>;
          })}
        </div>
      </section>
      <section className="space-y-4" aria-labelledby="workspace-personas">
        <div><h2 id="workspace-personas" className="text-lg font-semibold">Workspace personas</h2><p className="mt-1 text-sm text-muted-foreground">Reusable persona configurations available to simulation creators.</p></div>
      {!items ? (
        <div className="grid min-h-60 place-items-center">
          <Loader2 className="animate-spin" />
        </div>
      ) : items.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-5">
                <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Bot className="size-5" />
                </span>
                <h2 className="mt-4 font-semibold">{item.name}</h2>
                <p className="text-sm text-muted-foreground">{item.role}</p>
                <div className="mt-4 space-y-2 text-xs">
                  <p>
                    <span className="font-medium">Personality:</span>{" "}
                    {item.personality}
                  </p>
                  <p>
                    <span className="font-medium">Tone:</span> {item.tone}
                  </p>
                  <p className="line-clamp-3 text-muted-foreground">
                    {item.backgroundContext}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Bot className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No personas yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create one reusable counterpart, such as a customer, manager,
            candidate, patient, or vendor.
          </p>
        </div>
      )}
      </section>
    </div>
  );
}
