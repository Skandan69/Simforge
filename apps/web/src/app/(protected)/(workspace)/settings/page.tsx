import { USER_ROLES } from "@simforge/shared";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";
import { MembersManagement } from "@/components/settings/members-management";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeading title="Settings" description="Workspace members, access roles, and platform preferences." />
      <MembersManagement />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-5 text-primary" />Workspace roles</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">Owner controls the workspace. Admins can manage non-privileged members. Trainers create learning experiences, Managers guide development, and Learners complete assigned work.</p>
          <div className="flex flex-wrap gap-2">{USER_ROLES.map((role) => <span key={role} className="rounded-full border bg-muted/60 px-3 py-1.5 text-sm font-medium">{role}</span>)}</div>
        </CardContent>
      </Card>
    </div>
  );
}
