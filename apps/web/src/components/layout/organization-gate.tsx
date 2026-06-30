"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CurrentUserResponse } from "@simforge/shared";
import { AlertTriangle } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function OrganizationGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    apiFetch<CurrentUserResponse>("/api/me")
      .then((data) => {
        if (!active) return;
        if (!data.organization) router.replace("/onboarding");
        else setReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) router.replace("/login");
        else setError(error instanceof Error ? error.message : "Unable to prepare your workspace.");
      });
    return () => { active = false; };
  }, [router]);

  if (error) return <div className="grid min-h-screen place-items-center bg-background p-6"><div className="max-w-md text-center"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive"><AlertTriangle className="size-5" /></span><h1 className="mt-4 text-lg font-semibold">Workspace unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-5" onClick={() => window.location.reload()}>Try again</Button></div></div>;
  if (!ready) return <div className="grid min-h-screen place-items-center bg-background"><div className="flex items-center gap-3 text-sm text-muted-foreground"><span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />Preparing your workspace…</div></div>;
  return children;
}
