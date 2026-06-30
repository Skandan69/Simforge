"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Bell, BookOpen, Boxes, BrainCircuit, ChevronDown, ClipboardCheck, FileBarChart,
  LayoutDashboard, Menu, Moon, Search, Settings, Sun, UserRound, Users, X,
} from "lucide-react";
import { NAVIGATION_ITEMS } from "@simforge/shared";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const icons = {
  Dashboard: LayoutDashboard,
  "Knowledge Studio": BookOpen,
  "Simulation Studio": BrainCircuit,
  Assessments: ClipboardCheck,
  Learners: Users,
  Reports: FileBarChart,
  Settings,
};

interface AppShellProps {
  children: React.ReactNode;
  user: { email: string; fullName: string | null };
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <nav className="flex-1 space-y-1 px-3">{NAVIGATION_ITEMS.map((item) => { const Icon = icons[item.label]; const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)); return <Link key={item.href} href={item.href} onClick={onNavigate} className={cn("group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", active ? "bg-sidebar-accent text-primary" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground")}><Icon className={cn("size-[18px]", active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground")} />{item.label}</Link>; })}</nav>;
}

function Brand() {
  return <Link href="/dashboard" className="flex h-16 items-center gap-3 px-5 font-semibold tracking-tight"><span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/20"><Boxes className="size-[18px]" /></span><span>SimForge</span></Link>;
}

export function AppShell({ children, user }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const initials = (user.fullName ?? user.email).split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex"><Brand /><Navigation /><div className="m-4 rounded-xl border bg-background/50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace</p><p className="mt-2 truncate text-sm font-medium">Enterprise foundation</p><p className="mt-1 text-xs text-muted-foreground">Sprint 1</p></div></aside>

      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[min(82vw,19rem)] flex-col border-r bg-sidebar shadow-2xl transition-transform md:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full")}><div className="flex items-center justify-between"><Brand /><Button variant="ghost" size="icon" className="mr-3" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></Button></div><Navigation onNavigate={() => setMobileOpen(false)} /></aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></Button>
          <div className="relative hidden w-full max-w-md sm:block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="border-transparent bg-muted/70 pl-9 shadow-none focus-visible:bg-background" placeholder="Search SimForge" aria-label="Search" /></div>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" aria-label="Notifications"><Bell /></Button>
            <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>{resolvedTheme === "dark" ? <Sun /> : <Moon />}</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" className="h-10 gap-2 px-2"><span className="grid size-8 place-items-center rounded-full bg-primary/12 text-xs font-semibold text-primary">{initials}</span><span className="hidden max-w-32 truncate text-sm sm:block">{user.fullName ?? user.email}</span><ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60"><DropdownMenuLabel><span className="block truncate">{user.fullName ?? "SimForge user"}</span><span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">{user.email}</span></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem asChild><Link href="/settings"><UserRound />Profile & settings</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={signOut}>Sign out</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
