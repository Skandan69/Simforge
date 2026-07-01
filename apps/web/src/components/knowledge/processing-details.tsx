"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import type { ProcessingSourceDetail } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProcessingStatusBadge } from "./processing-status";
interface Log {
  id: string;
  event: string;
  message: string;
  createdAt: string;
}
export function ProcessingDetails({ id }: { id: string }) {
  const [source, setSource] = useState<ProcessingSourceDetail>();
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const load = useCallback(async () => {
    try {
      const [detail, history] = await Promise.all([
        apiFetch<ProcessingSourceDetail>(
          `/api/processing/documents/${id}/status`,
        ),
        apiFetch<Log[]>(`/api/processing/documents/${id}/logs`),
      ]);
      setSource(detail);
      setLogs(history);
      setError(undefined);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load processing details.",
      );
    }
  }, [id]);
  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    return () => clearTimeout(initial);
  }, [load]);
  async function action(name: "retry" | "cancel" | "reprocess") {
    setPending(true);
    try {
      await apiFetch(`/api/processing/documents/${id}/${name}`, {
        method: "POST",
      });
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : `Unable to ${name} processing.`,
      );
    } finally {
      setPending(false);
    }
  }
  if (!source)
    return (
      <div className="grid min-h-72 place-items-center">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <Loader2 className="animate-spin" />
        )}
      </div>
    );
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/knowledge-studio/processing">
          <ArrowLeft />
          Processing dashboard
        </Link>
      </Button>
      {error && (
        <p className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <section className="rounded-2xl border bg-card p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <ProcessingStatusBadge status={source.status} />
            <h1 className="mt-3 text-2xl font-semibold">{source.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {source.fileType} · {source.progress}% complete
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {source.status === "Failed" && (
              <Button onClick={() => void action("retry")} disabled={pending}>
                <RotateCcw />
                Retry
              </Button>
            )}
            {["Queued", "Processing"].includes(source.status) && (
              <Button
                variant="outline"
                onClick={() => void action("cancel")}
                disabled={pending}
              >
                <Ban />
                Cancel
              </Button>
            )}
            {["Completed", "Failed", "Cancelled"].includes(source.status) && (
              <Button
                variant="outline"
                onClick={() => void action("reprocess")}
                disabled={pending}
              >
                <RefreshCw />
                Reprocess
              </Button>
            )}
          </div>
        </div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary"
            style={{ width: `${source.progress}%` }}
          />
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Generated metadata</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            {[
              ["Pages / units", source.pageCount ?? "—"],
              ["Words", source.wordCount ?? "—"],
              ["Characters", source.characterCount ?? "—"],
              ["Estimated tokens", source.estimatedTokens ?? "—"],
              ["Language", source.language ?? "—"],
              ["Chunks", source.chunkCount],
              [
                "Duration",
                source.processingDurationMs
                  ? `${(source.processingDurationMs / 1000).toFixed(2)}s`
                  : "—",
              ],
              [
                "Processed",
                source.processedAt
                  ? new Date(source.processedAt).toLocaleString()
                  : "—",
              ],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 font-medium">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Processing log</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length ? (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="border-l-2 border-primary/30 pl-3"
                  >
                    <p className="text-sm font-medium capitalize">
                      {log.event}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.message}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No log entries yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
