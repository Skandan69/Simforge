"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, BrainCircuit, ClipboardCheck, Plus, RefreshCw, UserPlus, Users } from "lucide-react";
import type { DashboardResponse } from "@simforge/shared";
import { ApiError, apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";

const kpiConfig = [
  { key: "users", label: "Users", icon: Users, tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { key: "knowledgeBases", label: "Knowledge Bases", icon: BookOpen, tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  { key: "simulations", label: "Simulations", icon: BrainCircuit, tone: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  { key: "assessments", label: "Assessments", icon: ClipboardCheck, tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
] as const;

const quickActions = [
  { label: "Invite users", description: "Grow your workspace team", href: "/settings", icon: UserPlus },
  { label: "Create knowledge base", description: "Prepare source material", href: "/knowledge-studio", icon: BookOpen },
  { label: "New simulation", description: "Open Simulation Studio", href: "/simulation-studio", icon: BrainCircuit },
];

function DashboardSkeleton() {
  return <div className="mx-auto max-w-7xl animate-pulse space-y-8"><div className="h-28 rounded-2xl bg-muted" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 rounded-xl bg-muted" />)}</div><div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]"><div className="h-80 rounded-xl bg-muted" /><div className="h-80 rounded-xl bg-muted" /></div></div>;
}

export function DashboardView() {
  const router = useRouter();
  const [data, setData] = useState<DashboardResponse>();
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<DashboardResponse>("/api/dashboard"));
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "ORGANIZATION_REQUIRED") {
        router.replace("/onboarding");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Unable to load the dashboard.");
    }
  }, [router]);

  useEffect(() => {
    let active = true;
    void apiFetch<DashboardResponse>("/api/dashboard")
      .then((response) => { if (active) setData(response); })
      .catch((caught: unknown) => {
        if (!active) return;
        if (caught instanceof ApiError && caught.code === "ORGANIZATION_REQUIRED") {
          router.replace("/onboarding");
          return;
        }
        setError(caught instanceof Error ? caught.message : "Unable to load the dashboard.");
      });
    return () => { active = false; };
  }, [router]);

  if (error) return <div className="mx-auto max-w-3xl py-20 text-center"><h1 className="text-xl font-semibold">We couldn’t load your dashboard</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-6" onClick={() => { setError(undefined); void load(); }}><RefreshCw />Try again</Button></div>;
  if (!data) return <DashboardSkeleton />;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="absolute inset-y-0 right-0 hidden w-2/5 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.17),transparent_65%)] sm:block" />
        <div className="relative"><p className="text-sm font-medium text-primary">{data.organization.name}</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Welcome to your workspace</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Your SimForge foundation is ready. Start by inviting your team or reviewing the studios prepared for upcoming sprints.</p><div className="mt-5 flex items-center gap-2"><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{data.role}</span><span className="text-xs text-muted-foreground">{data.organization.industry} · {data.organization.companySize} employees</span></div></div>
      </section>

      <section><PageHeading eyebrow="Overview" title="Workspace pulse" description="A clear view of the people and learning assets in your organization." /><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpiConfig.map(({ key, label, icon: Icon, tone }) => <Card key={key} className="transition-shadow hover:shadow-md"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{data.kpis[key].toLocaleString()}</p></div><span className={`grid size-10 place-items-center rounded-xl ${tone}`}><Icon className="size-5" /></span></div><p className="mt-4 text-xs text-muted-foreground">Across this workspace</p></CardContent></Card>)}</div></section>

      <section className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent activity</CardTitle><CardDescription>Latest changes across your organization.</CardDescription></CardHeader>
          <CardContent>{data.recentActivity.length ? <div className="space-y-1">{data.recentActivity.map((activity) => <div key={activity.id} className="flex gap-3 rounded-lg px-2 py-3 hover:bg-muted/60"><span className="mt-1 size-2 shrink-0 rounded-full bg-primary" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{activity.description}</p><p className="mt-1 text-xs text-muted-foreground">{activity.actorName} · {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(activity.createdAt))}</p></div></div>)}</div> : <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center"><RefreshCw className="size-6 text-muted-foreground" /><p className="mt-3 text-sm font-medium">No activity yet</p><p className="mt-1 text-xs text-muted-foreground">Workspace updates will appear here.</p></div>}</CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Quick actions</CardTitle><CardDescription>Common places to begin.</CardDescription></CardHeader>
          <CardContent className="space-y-2">{quickActions.map(({ label, description, href, icon: Icon }) => <Link key={label} href={href} className="group flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-primary/30 hover:bg-accent/50"><span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"><Icon className="size-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{label}</span><span className="block truncate text-xs text-muted-foreground">{description}</span></span><Plus className="size-4 text-muted-foreground" /></Link>)}</CardContent>
        </Card>
      </section>
    </div>
  );
}
