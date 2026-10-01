"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Trash2, UserPlus, Users } from "lucide-react";
import type { UserRole, WorkspaceMembersResponse } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MembersManagement() {
  const [data, setData] = useState<WorkspaceMembersResponse>();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("Learner");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const load = useCallback(async () => {
    try {
      setError(undefined);
      setData(await apiFetch<WorkspaceMembersResponse>("/api/members"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load workspace members.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(undefined); setNotice(undefined);
    try {
      const result = await apiFetch<{ invited: boolean }>("/api/members/invite", {
        method: "POST",
        body: JSON.stringify({ email, fullName: fullName || undefined, role }),
      });
      setNotice(result.invited ? "Invitation sent." : "Existing SimForge account added to this workspace.");
      setEmail(""); setFullName(""); setRole("Learner");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add the member.");
    } finally { setBusy(false); }
  }

  async function changeRole(membershipId: string, nextRole: UserRole) {
    setBusy(true); setError(undefined); setNotice(undefined);
    try {
      await apiFetch(`/api/members/${membershipId}/role`, { method: "PATCH", body: JSON.stringify({ role: nextRole }) });
      setNotice("Role updated.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update the role.");
    } finally { setBusy(false); }
  }

  async function remove(membershipId: string, label: string) {
    if (!window.confirm(`Remove ${label} from this workspace?`)) return;
    setBusy(true); setError(undefined); setNotice(undefined);
    try {
      await apiFetch(`/api/members/${membershipId}`, { method: "DELETE" });
      setNotice("Member removed.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to remove the member.");
    } finally { setBusy(false); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Users className="size-5 text-primary" />Workspace members</CardTitle>
        <CardDescription>Invite people and control access without leaving SimForge.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
        {notice && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</div>}

        {data ? (
          <>
            <form onSubmit={invite} className="grid gap-3 rounded-xl border bg-muted/20 p-4 md:grid-cols-[1.1fr_1fr_180px_auto] md:items-end">
              <div className="space-y-2"><Label htmlFor="member-email">Email</Label><Input id="member-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="learner@company.com" /></div>
              <div className="space-y-2"><Label htmlFor="member-name">Name</Label><Input id="member-name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Optional" /></div>
              <div className="space-y-2">
                <Label htmlFor="member-role">Role</Label>
                <select id="member-role" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                  {data.assignableRoles.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <Button type="submit" disabled={busy || !email.trim()}>{busy ? <Loader2 className="animate-spin" /> : <UserPlus />}Invite</Button>
            </form>

            <div className="divide-y rounded-xl border">
              {data.members.map((member) => {
                const manageable = member.role !== "Owner" && (data.assignableRoles.includes(member.role) || data.assignableRoles.includes("Admin"));
                return (
                  <div key={member.membershipId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{member.fullName || member.email}</p>
                      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    {manageable ? (
                      <select className="h-9 rounded-md border bg-background px-3 text-sm" value={member.role} disabled={busy} onChange={(event) => void changeRole(member.membershipId, event.target.value as UserRole)}>
                        {data.assignableRoles.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    ) : <span className="rounded-full border px-3 py-1 text-xs font-medium">{member.role}</span>}
                    {manageable && <Button type="button" variant="ghost" size="icon" disabled={busy} onClick={() => void remove(member.membershipId, member.fullName || member.email)} aria-label={`Remove ${member.fullName || member.email}`}><Trash2 className="size-4" /></Button>}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <Button variant="outline" onClick={() => void load()} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}Load members</Button>
        )}
      </CardContent>
    </Card>
  );
}
