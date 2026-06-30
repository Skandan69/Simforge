import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { OrganizationGate } from "@/components/layout/organization-gate";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const fullName = user?.user_metadata.full_name;

  return <OrganizationGate><AppShell user={{ email: user?.email ?? "", fullName: typeof fullName === "string" ? fullName : null }}>{children}</AppShell></OrganizationGate>;
}
