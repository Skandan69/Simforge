"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, FileStack, LayoutDashboard, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { KnowledgeProvider } from "./knowledge-context";

const items = [
  { label: "Dashboard", href: "/knowledge-studio", icon: LayoutDashboard },
  { label: "Knowledge Bases", href: "/knowledge-studio/knowledge-bases", icon: BookOpen },
  { label: "Documents", href: "/knowledge-studio/documents", icon: FileStack },
  { label: "Processing", href: "/knowledge-studio/processing", icon: Activity },
  { label: "Search", href: "/knowledge-studio/search", icon: Search },
];

export function KnowledgeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <KnowledgeProvider><div className="mx-auto grid max-w-[1500px] gap-6 lg:grid-cols-[220px_minmax(0,1fr)]"><aside className="lg:sticky lg:top-24 lg:h-fit"><div className="mb-3 px-2"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Knowledge Studio</p><p className="mt-1 text-xs text-muted-foreground">Metadata & document control</p></div><nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">{items.map(({ label, href, icon: Icon }) => { const active = pathname === href || (href !== "/knowledge-studio" && pathname.startsWith(`${href}/`)); return <Link key={href} href={href} className={cn("flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}><Icon className="size-4" />{label}</Link>; })}</nav></aside><section className="min-w-0">{children}</section></div></KnowledgeProvider>;
}
