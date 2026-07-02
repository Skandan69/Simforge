"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Lightbulb,
  Loader2,
  RotateCcw,
  Target,
} from "lucide-react";
import type { SimulationSessionResponse } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { sortCapabilityScores } from "@/lib/simulation-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SimulationCapabilityReport({
  sessionId,
}: {
  sessionId: string;
}) {
  const [session, setSession] = useState<SimulationSessionResponse>();
  const [error, setError] = useState<string>();
  const [retrying, setRetrying] = useState(false);
  const load = useCallback(async () => {
    try {
      setSession(await apiFetch(`/api/simulation-sessions/${sessionId}`));
      setError(undefined);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load the capability report.",
      );
    }
  }, [sessionId]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  const scores = useMemo(
    () => sortCapabilityScores(session?.capabilityScores ?? []),
    [session],
  );
  async function retryEvaluation() {
    setRetrying(true);
    try {
      setSession(
        await apiFetch(`/api/simulation-sessions/${sessionId}/evaluate`, {
          method: "POST",
        }),
      );
      setError(undefined);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to generate the capability report.",
      );
    } finally {
      setRetrying(false);
    }
  }
  if (!session)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        {error ? (
          <div className="text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button className="mt-4" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : (
          <Loader2 className="animate-spin text-primary" />
        )}
      </div>
    );
  if (!session.evaluation)
    return (
      <div className="mx-auto max-w-xl rounded-xl border bg-card p-8 text-center">
        <Target className="mx-auto size-8 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-semibold">Report not generated</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This session does not have a saved evaluation yet.
        </p>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <Button
          className="mt-5"
          onClick={() => void retryEvaluation()}
          disabled={retrying}
        >
          {retrying ? <Loader2 className="animate-spin" /> : <RotateCcw />}
          {retrying ? "Generating…" : "Generate report"}
        </Button>
      </div>
    );
  const evaluation = session.evaluation;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/simulation-studio/simulations/${session.simulationId}`}>
          <ArrowLeft />
          Simulation details
        </Link>
      </Button>
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant="success">Completed</Badge>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
              Capability report
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {session.simulation.title} · Completed{" "}
              {session.completedAt
                ? new Date(session.completedAt).toLocaleString()
                : "recently"}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/30 px-8 py-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Overall score
            </p>
            <p className="mt-1 text-4xl font-semibold text-primary">
              {Math.round(evaluation.overallScore)}
            </p>
            <p className="text-xs text-muted-foreground">out of 100</p>
          </div>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {scores.map((score) => (
          <Card key={score.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">
                  {score.capabilityName}
                </CardTitle>
                <span className="text-lg font-semibold text-primary">
                  {Math.round(score.score)}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.max(0, Math.min(100, score.score))}%`,
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Evidence
                </p>
                <p className="mt-1 leading-6">{score.evidence}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recommendation
                </p>
                <p className="mt-1 leading-6 text-muted-foreground">
                  {score.recommendation}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-primary" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {evaluation.strengths.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="size-5 text-primary" />
              Improvement areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {evaluation.improvementAreas.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-500" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Evaluation evidence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {evaluation.evidence.map((item) => (
              <div
                key={`${item.capability}-${item.observation}`}
                className="rounded-lg bg-muted/45 p-3"
              >
                <p className="text-xs font-semibold">{item.capability}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {item.observation}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="size-5 text-primary" />
              Recommended next practice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6">
              {evaluation.recommendedNextPractice}
            </p>
            <Button asChild variant="outline" className="mt-5">
              <Link
                href={`/simulation-studio/simulations/${session.simulationId}/run`}
              >
                <RotateCcw />
                Practice again
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
        MVP evaluation is deterministic and intended for workflow validation.
        Production AI evaluation will replace this scoring adapter.
      </div>
    </div>
  );
}
