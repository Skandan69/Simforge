"use client";
import { useCallback, useEffect, useState } from "react";
import { ListChecks, Loader2, Plus } from "lucide-react";
import type {
  SimulationCriterionSummary,
  SimulationDashboardResponse,
} from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
export function CriteriaLibrary() {
  const [items, setItems] = useState<SimulationCriterionSummary[]>();
  const [canEdit, setCanEdit] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    try {
      const [list, dashboard] = await Promise.all([
        apiFetch<SimulationCriterionSummary[]>("/api/simulation-criteria"),
        apiFetch<SimulationDashboardResponse>("/api/simulations/dashboard"),
      ]);
      setItems(list);
      setCanEdit(dashboard.canEdit);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load criteria.",
      );
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch("/api/simulation-criteria", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form)),
      });
      setOpen(false);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to create criterion.",
      );
    }
  }
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Evaluation framework"
        title="Evaluation criteria"
        description="Choose clear dimensions for future evaluation. This sprint defines criteria only; it does not score performance."
        action={
          canEdit ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus />
                  Create criterion
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create evaluation criterion</DialogTitle>
                  <DialogDescription>
                    Add a reusable performance dimension for trainers.
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={create}>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Active listening"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="What trainers should observe"
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit">Create criterion</Button>
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
      {!items ? (
        <div className="grid min-h-60 place-items-center">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex gap-4 p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <ListChecks className="size-5" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{item.name}</h2>
                    {item.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
