"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Gauge, ListChecks, Library } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "Dashboard", href: "/simulation-studio", icon: Gauge },
  {
    label: "Simulations",
    href: "/simulation-studio/simulations",
    icon: Library,
  },
  { label: "Personas", href: "/simulation-studio/personas", icon: Bot },
  {
    label: "Evaluation Criteria",
    href: "/simulation-studio/evaluation-criteria",
    icon: ListChecks,
  },
];
export function SimulationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto grid max-w-[1500px] gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <div className="mb-3 px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Simulation Studio
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Structured practice design
          </p>
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
          {items.map(({ label, href, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/simulation-studio" &&
                pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
