"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Clock3,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import type {
  SimulationMessageResponse,
  SimulationRunConfiguration,
  SimulationSessionResponse,
} from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import {
  conversationRoleLabel,
  visibleConversationMessages,
} from "@/lib/simulation-session";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface MessagePair {
  learnerMessage: SimulationMessageResponse;
  aiMessage: SimulationMessageResponse;
}
export function SophiaSimulationRun({
  simulationId,
}: {
  simulationId: string;
}) {
  const router = useRouter();
  const endRef = useRef<HTMLDivElement>(null);
  const [configuration, setConfiguration] =
    useState<SimulationRunConfiguration>();
  const [session, setSession] = useState<SimulationSessionResponse>();
  const [messages, setMessages] = useState<SimulationMessageResponse[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string>();
  const loadConfiguration = useCallback(async () => {
    setLoading(true);
    try {
      setConfiguration(
        await apiFetch(`/api/simulation-sessions/simulations/${simulationId}`),
      );
      setError(undefined);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load this simulation.",
      );
    } finally {
      setLoading(false);
    }
  }, [simulationId]);
  useEffect(() => {
    const timer = setTimeout(() => void loadConfiguration(), 0);
    return () => clearTimeout(timer);
  }, [loadConfiguration]);
  const conversation = useMemo(
    () => visibleConversationMessages(messages),
    [messages],
  );
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [conversation.length]);
  async function start() {
    setStarting(true);
    setError(undefined);
    try {
      const created = await apiFetch<SimulationSessionResponse>(
        "/api/simulation-sessions",
        { method: "POST", body: JSON.stringify({ simulationId }) },
      );
      setSession(created);
      setConfiguration(created.simulation);
      setMessages(created.messages);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to start the simulation.",
      );
    } finally {
      setStarting(false);
    }
  }
  async function send(event: React.FormEvent) {
    event.preventDefault();
    const value = content.trim();
    if (!session || !value || sending) return;
    setSending(true);
    setError(undefined);
    try {
      const pair = await apiFetch<MessagePair>(
        `/api/simulation-sessions/${session.id}/messages`,
        { method: "POST", body: JSON.stringify({ content: value }) },
      );
      setMessages((current) => [
        ...current,
        pair.learnerMessage,
        pair.aiMessage,
      ]);
      setContent("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Your message could not be sent.",
      );
    } finally {
      setSending(false);
    }
  }
  async function evaluate() {
    if (!session) return;
    setEvaluating(true);
    setError(undefined);
    try {
      await apiFetch<SimulationSessionResponse>(
        `/api/simulation-sessions/${session.id}/evaluate`,
        { method: "POST" },
      );
      router.push(`/simulation-studio/sessions/${session.id}/report`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The capability report could not be generated.",
      );
      setEvaluating(false);
    }
  }
  if (loading)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            Preparing simulation…
          </p>
        </div>
      </div>
    );
  if (!configuration)
    return (
      <div className="grid min-h-80 place-items-center rounded-xl border bg-card p-8 text-center">
        <div>
          <h1 className="font-semibold">Simulation unavailable</h1>
          <p className="mt-2 text-sm text-destructive">{error}</p>
          <Button className="mt-5" onClick={() => void loadConfiguration()}>
            Try again
          </Button>
        </div>
      </div>
    );
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Sophia Simulation</Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="size-3" />
                {configuration.estimatedMinutes} minutes
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              {configuration.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {configuration.description}
            </p>
          </div>
          {session ? (
            <Badge variant="success">Session in progress</Badge>
          ) : (
            <Button size="lg" onClick={() => void start()} disabled={starting}>
              {starting ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              {starting ? "Starting…" : "Start simulation"}
            </Button>
          )}
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </div>
              <CardTitle className="mt-3">Sophia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">AI simulation trainer</p>
              <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs leading-5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  This MVP uses structured placeholder responses. Your messages
                  are saved for the capability report.
                </span>
              </div>
              {configuration.persona && (
                <div className="border-t pt-3">
                  <p className="flex items-center gap-2 font-medium">
                    <UserRound className="size-4" />
                    Scenario persona
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {configuration.persona.name} · {configuration.persona.role}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tone: {configuration.persona.tone}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scenario</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {configuration.scenarioSetup}
            </CardContent>
          </Card>
        </aside>
        <Card className="flex min-h-[620px] flex-col overflow-hidden">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Conversation</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Respond as you would in the real situation.
                </p>
              </div>
              {session && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void evaluate()}
                  disabled={
                    evaluating ||
                    !conversation.some((message) => message.role === "learner")
                  }
                >
                  {evaluating ? <Loader2 className="animate-spin" /> : null}
                  {evaluating ? "Evaluating…" : "End & evaluate"}
                </Button>
              )}
            </div>
          </CardHeader>
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {!session ? (
              <div className="grid h-full min-h-80 place-items-center text-center">
                <div className="max-w-sm">
                  <Sparkles className="mx-auto size-7 text-muted-foreground" />
                  <h2 className="mt-3 font-medium">Ready when you are</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Start the session to receive Sophia’s opening prompt. Your
                    capability report will be generated when you end the
                    simulation.
                  </p>
                </div>
              </div>
            ) : conversation.length ? (
              conversation.map((message) => (
                <article
                  key={message.id}
                  className={cn(
                    "rounded-xl border p-4",
                    message.role === "learner"
                      ? "ml-auto max-w-[90%] border-primary/25 bg-primary/5"
                      : "mr-auto max-w-[94%] bg-muted/35",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {conversationRoleLabel(message.role)}
                    </p>
                    <time className="text-[11px] text-muted-foreground">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                    {message.content}
                  </p>
                </article>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Sophia is preparing the opening prompt.
              </p>
            )}
            <div ref={endRef} />
          </div>
          <div className="border-t bg-background p-4 sm:p-5">
            {error && (
              <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={send}
            >
              <Textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                disabled={!session || sending || evaluating}
                className="min-h-20 resize-none"
                placeholder={
                  session
                    ? "Describe what you would say or do next…"
                    : "Start the simulation to respond"
                }
              />
              <Button
                type="submit"
                disabled={!session || !content.trim() || sending || evaluating}
                className="sm:h-20 sm:w-28"
              >
                {sending ? <Loader2 className="animate-spin" /> : <Send />}
                {sending ? "Sending" : "Send"}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
