"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Clock3,
  Loader2,
  Mic,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import type {
  SimulationMessageResponse,
  SimulationRunConfiguration,
  SimulationSessionResponse,
} from "@simforge/shared";
import { ApiError, apiBlob, apiFetch } from "@/lib/api";
import { resolveSophiaAvatarState } from "@/lib/sophia-avatar";
import { startSophiaLipSync } from "@/lib/sophia-lip-sync";
import { deriveLiveEvaluationIntelligence } from "@/lib/live-evaluation";
import { useCommunicationIntelligence } from "@/hooks/use-communication-intelligence";
import {
  conversationRoleLabel,
  visibleConversationMessages,
} from "@/lib/simulation-session";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SophiaAvatarStage } from "./sophia-avatar-stage";
import { LiveCoachingPanel } from "./live-coaching-panel";

interface MessagePair {
  learnerMessage: SimulationMessageResponse;
  aiMessage: SimulationMessageResponse;
}
type VoiceState = "Ready" | "Listening" | "Uploading" | "Transcribing" | "Thinking" | "Speaking" | "Error";
export function SophiaSimulationRun({
  simulationId,
  autoStart = false,
}: {
  simulationId: string;
  autoStart?: boolean;
}) {
  const router = useRouter();
  const { communicationIntelligenceVisible, setCommunicationIntelligenceVisible } = useCommunicationIntelligence();
  const endRef = useRef<HTMLDivElement>(null);
  const autoStartHandled = useRef(false);
  const recorderRef = useRef<MediaRecorder | undefined>(undefined);
  const recordingStreamRef = useRef<MediaStream | undefined>(undefined);
  const recordingChunksRef = useRef<Blob[]>([]);
  const holdingToTalkRef = useRef(false);
  const recordingStartedAtRef = useRef<number | undefined>(undefined);
  const recordingTimerRef = useRef<number | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement | undefined>(undefined);
  const audioUrlRef = useRef<string | undefined>(undefined);
  const stopLipSyncRef = useRef<(() => void) | undefined>(undefined);
  const [configuration, setConfiguration] =
    useState<SimulationRunConfiguration>();
  const [session, setSession] = useState<SimulationSessionResponse>();
  const [messages, setMessages] = useState<SimulationMessageResponse[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("Ready");
  const [mouthOpen, setMouthOpen] = useState(0);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [voiceError, setVoiceError] = useState<string>();
  const [muted, setMuted] = useState(false);
  const [lastSophiaMessageId, setLastSophiaMessageId] = useState<string>();
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
  const liveIntelligence = useMemo(
    () => deriveLiveEvaluationIntelligence(
      messages.filter((message) => message.role === "learner").map((message) => message.content),
    ),
    [messages],
  );
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [conversation.length]);
  useEffect(() => () => {
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioRef.current?.pause();
    stopLipSyncRef.current?.();
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
  }, []);
  const start = useCallback(async () => {
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
      setLastSophiaMessageId([...created.messages].reverse().find((message) => message.role === "ai")?.id);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to start the simulation.",
      );
    } finally {
      setStarting(false);
    }
  }, [simulationId]);
  useEffect(() => {
    if (!autoStart || !configuration || session || autoStartHandled.current)
      return;
    autoStartHandled.current = true;
    void start();
  }, [autoStart, configuration, session, start]);

  const playSophiaMessage = useCallback(async (messageId: string) => {
    if (!session || muted) return;
    setVoiceError(undefined);
    try {
      setVoiceState("Speaking");
      const audio = await apiBlob(`/api/simulation-sessions/${session.id}/voice/speech`, {
        method: "POST",
        body: JSON.stringify({ messageId }),
      });
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const url = URL.createObjectURL(audio);
      audioUrlRef.current = url;
      const player = new Audio(url);
      audioRef.current = player;
      stopLipSyncRef.current?.();
      stopLipSyncRef.current = await startSophiaLipSync(player, setMouthOpen);
      player.onended = () => {
        stopLipSyncRef.current?.();
        stopLipSyncRef.current = undefined;
        setVoiceState("Ready");
      };
      player.onerror = () => {
        stopLipSyncRef.current?.();
        stopLipSyncRef.current = undefined;
        setVoiceState("Error");
        setVoiceError("Sophia audio could not be played. Her text response is still available.");
      };
      await player.play();
      setLastSophiaMessageId(messageId);
    } catch (caught) {
      stopLipSyncRef.current?.();
      stopLipSyncRef.current = undefined;
      setVoiceState("Error");
      setVoiceError(caught instanceof Error ? caught.message : "Sophia audio is unavailable. Continue with text.");
    }
  }, [muted, session]);

  const transcribeRecording = useCallback(async (audio: Blob, durationMs: number) => {
    if (!session) return;
    setVoiceError(undefined);
    try {
      setVoiceState("Uploading");
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      setVoiceState("Transcribing");
      const result = await apiFetch<{ transcript: string }>(`/api/simulation-sessions/${session.id}/voice/transcribe`, {
        method: "POST",
        headers: { "Content-Type": audio.type || "audio/webm", "X-Audio-Duration-Ms": String(durationMs) },
        body: audio,
      });
      setContent(result.transcript);
      setVoiceState("Ready");
    } catch (caught) {
      setVoiceState("Error");
      setVoiceError(caught instanceof Error ? caught.message : "The recording could not be transcribed. Try again or use text.");
    }
  }, [session]);

  async function beginPushToTalk() {
    if (!session || sending || evaluating) return;
    holdingToTalkRef.current = true;
    setVoiceError(undefined);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Microphone recording is not supported in this browser. Continue in text mode.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!holdingToTalkRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      const preferredType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) recordingChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
        stream.getTracks().forEach((track) => track.stop());
        const durationMs = recordingStartedAtRef.current ? Date.now() - recordingStartedAtRef.current : 0;
        const audio = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (audio.size && durationMs >= 1_000) void transcribeRecording(audio, durationMs);
        else {
          setVoiceState("Error");
          setVoiceError("Recording was too short. Please hold the microphone and speak for at least 1–2 seconds.");
        }
      };
      recorder.start();
      recordingStartedAtRef.current = Date.now();
      setRecordingDurationMs(0);
      recordingTimerRef.current = window.setInterval(() => setRecordingDurationMs(Date.now() - (recordingStartedAtRef.current ?? Date.now())), 100);
      setVoiceState("Listening");
    } catch (caught) {
      holdingToTalkRef.current = false;
      setVoiceState("Error");
      setVoiceError(caught instanceof Error ? caught.message : "Microphone access failed. Continue in text mode.");
    }
  }

  function endPushToTalk() {
    holdingToTalkRef.current = false;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function toggleMute() {
    setMuted((current) => {
      if (!current) {
        audioRef.current?.pause();
        stopLipSyncRef.current?.();
        stopLipSyncRef.current = undefined;
        setVoiceState("Ready");
      }
      return !current;
    });
  }
  async function send(event: React.FormEvent) {
    event.preventDefault();
    const value = content.trim();
    if (!session || !value || sending) return;
    setSending(true);
    setVoiceState("Thinking");
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
      setLastSophiaMessageId(pair.aiMessage.id);
      setVoiceState("Ready");
      if (!muted) void playSophiaMessage(pair.aiMessage.id);
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
    const endpoint = `/api/simulation-sessions/${session.id}/evaluate`;
    try {
      await apiFetch<SimulationSessionResponse>(endpoint, { method: "POST" });
      router.push(`/simulation-studio/sessions/${session.id}/report`);
    } catch (caught) {
      const failure =
        caught instanceof ApiError
          ? {
              endpoint,
              status: caught.status,
              code: caught.code ?? "UNKNOWN_API_ERROR",
              message: caught.message,
            }
          : {
              endpoint,
              status: undefined,
              code: "UNEXPECTED_CLIENT_ERROR",
              message:
                caught instanceof Error ? caught.message : "Unknown error",
            };
      console.error("Simulation evaluation failed", failure);
      setError(
        caught instanceof ApiError
          ? `Evaluation failed: ${caught.message} (${caught.code ?? `HTTP ${caught.status}`})`
          : caught instanceof Error
            ? `Evaluation failed: ${caught.message}`
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
  const avatarState = resolveSophiaAvatarState({ voiceState, sending, hasError: Boolean(voiceError) });
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
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-5">
        <SophiaAvatarStage
          state={avatarState}
          mouthOpen={mouthOpen}
          controls={<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center">
            <Button
              type="button"
              variant={voiceState === "Listening" ? "default" : "secondary"}
              className="touch-none"
              disabled={!session || sending || evaluating || ["Uploading", "Transcribing", "Speaking"].includes(voiceState)}
              aria-label="Hold to speak to Sophia"
              onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); void beginPushToTalk(); }}
              onPointerUp={endPushToTalk}
              onPointerCancel={endPushToTalk}
              onKeyDown={(event) => { if (!event.repeat && (event.key === " " || event.key === "Enter")) { event.preventDefault(); void beginPushToTalk(); } }}
              onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); endPushToTalk(); } }}
            >
              {voiceState === "Listening" ? <Loader2 className="animate-pulse" /> : <Mic />}
              {voiceState === "Listening" ? `${(recordingDurationMs / 1_000).toFixed(1)}s` : "Speak"}
            </Button>
            <Button type="button" variant="secondary" onClick={toggleMute} aria-label={muted ? "Unmute Sophia" : "Mute Sophia"}>
              {muted ? <VolumeX /> : <Volume2 />}{muted ? "Unmute" : "Mute"}
            </Button>
            <Button type="button" variant="secondary" disabled={!lastSophiaMessageId || muted || voiceState === "Speaking"} onClick={() => lastSophiaMessageId && void playSophiaMessage(lastSophiaMessageId)} aria-label="Replay Sophia's last response">
              <RotateCcw />Replay
            </Button>
            <Button type="button" variant="outline" disabled={!session || evaluating || !conversation.some((message) => message.role === "learner")} onClick={() => void evaluate()} aria-label="End simulation and generate report">
              {evaluating ? <Loader2 className="animate-spin" /> : null}{evaluating ? "Finishing…" : "End simulation"}
            </Button>
          </div>}
        />
        <aside className="order-3 space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1" aria-label="Simulation guidance">
          <LiveCoachingPanel behavioralIndicators={liveIntelligence.behavioral} communicationIndicators={liveIntelligence.communication} showCommunication={communicationIntelligenceVisible} onShowCommunicationChange={setCommunicationIntelligenceVisible} />
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4 text-primary" />Coaching tip</CardTitle></CardHeader>
            <CardContent><p className="text-sm leading-6 text-muted-foreground">Respond naturally, use specific evidence, and make your next action clear. Personalized coaching appears in the final report.</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Scenario</CardTitle></CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{configuration.scenarioSetup}</CardContent>
          </Card>
        </aside>
        <Card className="order-2 flex min-h-[520px] flex-col overflow-hidden lg:col-start-1 lg:row-start-2" aria-label="Simulation conversation">
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
                  {evaluating ? "Finishing…" : "Finish simulation"}
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
            {voiceError && (
              <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-300">
                {voiceError}
              </div>
            )}
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={send}
            >
              <Textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                disabled={!session || sending || evaluating || voiceState === "Listening"}
                className="min-h-20 flex-1 resize-none"
                placeholder={session ? "Speak above or type here, then review and edit before sending…" : "Start the simulation to respond"}
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
