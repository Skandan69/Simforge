import { USER_ROLES } from "@simforge/shared";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";

export default function SettingsPage() {
  return <div className="mx-auto max-w-6xl space-y-8"><PageHeading title="Settings" description="Workspace identity, access roles, and platform preferences." /><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-5 text-primary" />Role foundation</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">SimForge recognizes five workspace roles. Assignment controls arrive with user management.</p><div className="flex flex-wrap gap-2">{USER_ROLES.map((role) => <span key={role} className="rounded-full border bg-muted/60 px-3 py-1.5 text-sm font-medium">{role}</span>)}</div></CardContent></Card></div>;
}
