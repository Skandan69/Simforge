"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Clock3,
  Copy,
  FilePenLine,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  SIMULATION_DIFFICULTIES,
  SIMULATION_STATUSES,
  type SimulationDashboardResponse,
  type SimulationSummary,
} from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeading } from "@/components/layout/page-heading";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const badge = (status: string) =>
  status === "Active"
    ? ("success" as const)
    : status === "Draft"
      ? ("warning" as const)
      : ("secondary" as const);
export function SimulationLibrary({
  dashboard = false,
}: {
  dashboard?: boolean;
}) {
  const [data, setData] = useState<SimulationDashboardResponse>();
  const [error, setError] = useState<string>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [department, setDepartment] = useState("");
  const [deleteItem, setDeleteItem] = useState<SimulationSummary>();
  const [pending, setPending] = useState(false);
  const load = useCallback(async () => {
    try {
      setData(await apiFetch("/api/simulations/dashboard"));
      setError(undefined);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load simulations.",
      );
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  const departments = useMemo(
    () =>
      [
        ...new Set(data?.simulations.map((item) => item.department) ?? []),
      ].sort(),
    [data],
  );
  const filtered = data?.simulations.filter(
    (item) =>
      (!search ||
        `${item.title} ${item.description}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (!status || item.status === status) &&
      (!difficulty || item.difficulty === difficulty) &&
      (!department || item.department === department),
  );
  async function action(id: string, name: "duplicate" | "archive" | "delete") {
    setPending(true);
    try {
      await apiFetch(
        `/api/simulations/${id}${name === "delete" ? "" : `/${name}`}`,
        { method: name === "delete" ? "DELETE" : "POST" },
      );
      setDeleteItem(undefined);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : `Unable to ${name} simulation.`,
      );
    } finally {
      setPending(false);
    }
  }
  if (!data && !error)
    return (
      <div className="grid min-h-80 place-items-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Simulation Studio"
        title={dashboard ? "Practice design dashboard" : "Simulation library"}
        description="Create structured, knowledge-grounded practice scenarios before any live conversation begins."
        action={
          data?.canEdit ? (
            <Button asChild>
              <Link href="/simulation-studio/simulations/new">
                <Plus />
                Create simulation
              </Link>
            </Button>
          ) : undefined
        }
      />
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
      {data && dashboard && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Total simulations", data.totals.total],
            ["Draft", data.totals.draft],
            ["Active", data.totals.active],
            ["Archived", data.totals.archived],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <CardContent className="p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-3xl font-semibold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[minmax(200px,1fr)_repeat(3,minmax(130px,0.45fr))]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
            placeholder="Search simulations"
          />
        </div>
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        >
          <option value="">All departments</option>
          {departments.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value)}
        >
          <option value="">All difficulties</option>
          {SIMULATION_DIFFICULTIES.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          {SIMULATION_STATUSES.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      {filtered?.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={badge(item.status)}>{item.status}</Badge>
                      <Badge variant="outline">{item.difficulty}</Badge>
                    </div>
                    <Link
                      href={`/simulation-studio/simulations/${item.id}`}
                      className="mt-3 block truncate text-lg font-semibold hover:text-primary"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                  <span>{item.department}</span>
                  <span>{item.jobRole}</span>
                  <span className="flex items-center gap-1">
                    <Clock3 className="size-3" />
                    {item.estimatedMinutes} min
                  </span>
                  <span>Updated {formatDate(item.updatedAt)}</span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/simulation-studio/simulations/${item.id}`}>
                      Preview
                    </Link>
                  </Button>
                  {data?.canEdit && (
                    <>
                      <Button asChild size="sm" variant="ghost">
                        <Link
                          href={`/simulation-studio/simulations/${item.id}/edit`}
                        >
                          <FilePenLine />
                          Edit
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void action(item.id, "duplicate")}
                        disabled={pending}
                      >
                        <Copy />
                        Duplicate
                      </Button>
                      {item.status !== "Archived" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void action(item.id, "archive")}
                          disabled={pending}
                        >
                          <Archive />
                          Archive
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setDeleteItem(item)}
                      >
                        <Trash2 />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-card p-8 text-center">
          <div>
            <p className="font-semibold">No simulations found</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Start with one practice scenario. Define the situation, the person
              a learner will face, and what good performance should include.
            </p>
            {data?.canEdit && (
              <Button asChild className="mt-5">
                <Link href="/simulation-studio/simulations/new">
                  <Plus />
                  Create your first simulation
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
      <AlertDialog
        open={Boolean(deleteItem)}
        onOpenChange={(open) => !open && setDeleteItem(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this simulation?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {deleteItem?.title} and its version
              history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => deleteItem && void action(deleteItem.id, "delete")}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
