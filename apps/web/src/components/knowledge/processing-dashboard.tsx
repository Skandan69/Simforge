"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Clock3,
  FileCheck2,
  Loader2,
  RefreshCw,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import type { ProcessingDashboardResponse } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";
import { ProcessingStatusBadge } from "./processing-status";
export function ProcessingDashboard() {
  const [data, setData] = useState<ProcessingDashboardResponse>();
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    try {
      setData(await apiFetch("/api/processing/dashboard"));
      setError(undefined);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load processing activity.",
      );
    }
  }, []);
  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), 5000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [load]);
  if (!data && !error)
    return (
      <div className="grid min-h-72 place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  const metrics: Array<[string, string | number, LucideIcon]> = data
    ? [
        ["Queued", data.totals.Queued, Clock3],
        ["Processing", data.totals.Processing, Activity],
        ["Completed", data.totals.Completed, FileCheck2],
        ["Failed", data.totals.Failed, RotateCcw],
        ["Avg. time", `${(data.averageProcessingTimeMs / 1000).toFixed(1)}s`, Clock3],
      ]
    : [];
  return (
    <div className="space-y-7">
      <PageHeading
        title="Processing dashboard"
        description="Track extraction and chunk preparation across every knowledge source."
        action={
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw />
            Refresh
          </Button>
        }
      />
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {metrics.map(([label, value, Icon]) => (
              <Card key={String(label)}>
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {String(label)}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {String(value)}
                    </p>
                  </div>
                  <Icon className="size-5 text-primary" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Recent sources</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recent.length ? (
                <div className="divide-y">
                  {data.recent.map((source) => (
                    <div
                      key={source.sourceId}
                      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <Link
                          className="truncate font-medium hover:text-primary"
                          href={`/knowledge-studio/processing/${source.documentId}`}
                        >
                          {source.title}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {source.fileType} · {source.chunkCount} chunks ·{" "}
                          {source.wordCount ?? 0} words
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <ProcessingStatusBadge status={source.status} />
                        <span className="w-10 text-right text-xs text-muted-foreground">
                          {source.progress}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No sources have entered the processing queue yet.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
