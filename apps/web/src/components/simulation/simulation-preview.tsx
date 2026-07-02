"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  FilePenLine,
  Loader2,
  Play,
  Target,
  UserRound,
} from "lucide-react";
import type { SimulationDetail } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SimulationPreview({ id }: { id: string }) {
  const [item, setItem] = useState<SimulationDetail>();
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    try {
      setItem(await apiFetch(`/api/simulations/${id}`));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load simulation preview.",
      );
    }
  }, [id]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  if (!item)
    return (
      <div className="grid min-h-80 place-items-center">
        {error ? (
          <p className="text-destructive">{error}</p>
        ) : (
          <Loader2 className="animate-spin" />
        )}
      </div>
    );
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/simulation-studio/simulations">
          <ArrowLeft />
          Simulation library
        </Link>
      </Button>
      <section className="rounded-2xl border bg-card p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={item.status === "Active" ? "success" : "secondary"}
              >
                {item.status}
              </Badge>
              <Badge variant="outline">{item.difficulty}</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-semibold">{item.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>{item.department}</span>
              <span>{item.jobRole}</span>
              <span>{item.category}</span>
              <span className="flex items-center gap-1">
                <Clock3 className="size-3" />
                {item.estimatedMinutes} minutes
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {item.status === "Active" && (
              <Button asChild>
                <Link href={`/simulation-studio/simulations/${item.id}/run`}>
                  <Play />
                  Start simulation
                </Link>
              </Button>
            )}
            {item.canEdit && (
              <Button asChild variant="outline">
                <Link href={`/simulation-studio/simulations/${item.id}/edit`}>
                  <FilePenLine />
                  Edit simulation
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Scenario setup</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm leading-6">
            {item.scenarioSetup}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Success criteria</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm leading-6">
            {item.successCriteria}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-5 text-primary" />
              Persona
            </CardTitle>
          </CardHeader>
          <CardContent>
            {item.persona ? (
              <div>
                <p className="font-medium">{item.persona.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.persona.role}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No persona selected.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-5 text-primary" />
              Knowledge bases
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {item.knowledgeBases.length ? (
              item.knowledgeBases.map((base) => (
                <div key={base.id} className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm font-medium">{base.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {base.department}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No knowledge bases linked.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="size-5 text-primary" />
              Objectives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {item.objectives.map((objective, index) => (
                <li key={objective.id} className="flex gap-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  {objective.title}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Evaluation criteria</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {item.evaluationCriteria.map((criterion) => (
              <Badge key={criterion.id} variant="outline">
                {criterion.name}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
        Configuration preview. Active simulations can be opened in the Sophia
        MVP practice experience.
      </div>
    </div>
  );
}
