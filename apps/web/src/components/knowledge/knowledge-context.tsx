"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { KnowledgeDashboardResponse } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface KnowledgeContextValue {
  dashboard: KnowledgeDashboardResponse;
  refresh: () => Promise<void>;
}

const KnowledgeContext = createContext<KnowledgeContextValue | null>(null);

export function KnowledgeProvider({ children }: { children: React.ReactNode }) {
  const [dashboard, setDashboard] = useState<KnowledgeDashboardResponse>();
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    const result = await apiFetch<KnowledgeDashboardResponse>("/api/knowledge-bases/dashboard");
    setDashboard(result);
    setError(undefined);
  }, []);

  useEffect(() => {
    let active = true;
    void apiFetch<KnowledgeDashboardResponse>("/api/knowledge-bases/dashboard")
      .then((result) => { if (active) setDashboard(result); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load Knowledge Studio."); });
    return () => { active = false; };
  }, []);

  if (error) return <div className="grid min-h-96 place-items-center rounded-xl border bg-card p-8 text-center"><div><AlertTriangle className="mx-auto size-8 text-destructive" /><h2 className="mt-4 font-semibold">Knowledge Studio is unavailable</h2><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-5" onClick={() => void refresh()}><RefreshCw />Try again</Button></div></div>;
  if (!dashboard) return <div className="grid min-h-96 place-items-center rounded-xl border bg-card"><div className="flex items-center gap-3 text-sm text-muted-foreground"><span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />Loading Knowledge Studio…</div></div>;
  return <KnowledgeContext.Provider value={{ dashboard, refresh }}>{children}</KnowledgeContext.Provider>;
}

export function useKnowledgeStudio() {
  const value = useContext(KnowledgeContext);
  if (!value) throw new Error("useKnowledgeStudio must be used within KnowledgeProvider");
  return value;
}
