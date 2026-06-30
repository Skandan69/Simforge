import Link from "next/link";
import { APP_NAME } from "@simforge/shared";
import { Boxes, ShieldCheck, Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="relative hidden overflow-hidden border-r bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.35),transparent_36%),radial-gradient(circle_at_80%_80%,rgba(14,165,233,0.22),transparent_34%)]" />
        <Link href="/" className="relative z-10 flex items-center gap-3 text-lg font-semibold">
          <span className="grid size-10 place-items-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/25"><Boxes className="size-5" /></span>
          {APP_NAME}
        </Link>
        <div className="relative z-10 max-w-xl">
          <div className="mb-8 flex items-center gap-2 text-sm font-medium text-indigo-200"><Sparkles className="size-4" /> Enterprise simulation platform</div>
          <h1 className="text-5xl font-semibold leading-tight tracking-tight">Turn institutional knowledge into confident decisions.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">Create structured learning experiences, measure readiness, and help teams practice what matters.</p>
        </div>
        <div className="relative z-10 flex items-center gap-3 text-sm text-slate-300"><ShieldCheck className="size-5 text-emerald-400" /> Secure, role-aware workspace foundation</div>
      </section>
      <section className="flex min-h-screen items-center justify-center p-6 sm:p-10">{children}</section>
    </main>
  );
}
