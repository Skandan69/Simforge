"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import type { ManagerIntelligenceOverviewResponse } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";

export function ReportsView() {
  const [data, setData] = useState<ManagerIntelligenceOverviewResponse>();
  const [error, setError] = useState<string>();

  async function load() {
    try {
      setError(undefined);
      setData(await apiFetch<ManagerIntelligenceOverviewResponse>("/api/manager-intelligence"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load reports.");
    }
  }

  useEffect(() => {
    let active = true;
    void apiFetch<ManagerIntelligenceOverviewResponse>("/api/manager-intelligence")
      .then((result) => { if (active) setData(result); })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to load reports.");
      });
    return () => { active = false; };
  }, []);

  function downloadCsv() {
    if (!data) return;
    const rows = [
      ["Capability", "Average score", "Previous average", "Change", "Assessments", "Learners"],
      ...data.capabilityOverview.map((item) => [
        item.capabilityName,
        item.averageScore ?? "",
        item.previousAverageScore ?? "",
        item.change ?? "",
        item.assessmentCount,
        item.learnerCount,
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = "simforge-capability-report.csv"; link.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <div className="mx-auto max-w-4xl space-y-6"><PageHeading title="Reports" description="Capability, practice, assessment, and development evidence." /><Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">{error}</p><Button className="mt-4" variant="outline" onClick={() => void load()}><RefreshCw />Try again</Button></CardContent></Card></div>;
  if (!data) return <div className="mx-auto max-w-6xl animate-pulse space-y-4"><div className="h-24 rounded-xl bg-muted" /><div className="h-72 rounded-xl bg-muted" /></div>;

  const metrics = [
    ["Learners", data.totals.learners],
    ["Completed simulations", data.totals.completedSimulations],
    ["Completed assessments", data.totals.completedAssessments],
    ["Passed assessments", data.totals.passedAssessments],
    ["Completed paths", data.totals.completedDevelopmentPaths],
    ["Open assignments", data.totals.openAssignments],
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeading title="Reports" description="Evidence from simulations, practice, assessments, and development paths." />
        <Button variant="outline" onClick={downloadCsv}><Download />Download capability CSV</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(([label, value]) => <Card key={String(label)}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{Number(value).toLocaleString()}</p></CardContent></Card>)}
      </div>

      <Card>
        <CardHeader><CardTitle>Capability evidence</CardTitle><CardDescription>Current team averages compared with the previous measured state.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-3 pr-4">Capability</th><th>Current</th><th>Previous</th><th>Change</th><th>Assessments</th><th>Learners</th></tr></thead>
            <tbody>{data.capabilityOverview.map((item) => <tr key={item.capabilityName} className="border-b last:border-0"><td className="py-3 pr-4 font-medium">{item.capabilityName}</td><td>{item.averageScore ?? "—"}</td><td>{item.previousAverageScore ?? "—"}</td><td>{item.change === null ? "—" : item.change > 0 ? `+${item.change}` : item.change}</td><td>{item.assessmentCount}</td><td>{item.learnerCount}</td></tr>)}</tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Development path status</CardTitle><CardDescription>Latest assigned development paths and their evidence-derived progress.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {data.developmentPaths.length ? data.developmentPaths.slice(0, 20).map((path) => <div key={path.assignmentId} className="rounded-lg border p-4"><div className="flex items-center justify-between gap-4"><div><p className="font-medium">{path.learnerName}</p><p className="text-sm text-muted-foreground">{path.pathTitle} · {path.currentStepTitle ?? "Complete"}</p></div><span className="text-sm font-semibold">{path.percentComplete}%</span></div></div>) : <p className="text-sm text-muted-foreground">No development path evidence yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
