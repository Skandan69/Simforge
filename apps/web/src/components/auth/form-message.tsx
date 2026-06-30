import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FormMessage({ message, variant = "error" }: { message?: string; variant?: "error" | "success" }) {
  if (!message) return null;
  const Icon = variant === "success" ? CheckCircle2 : AlertCircle;
  return <div role="status" className={cn("flex gap-2 rounded-lg border px-3 py-2.5 text-sm", variant === "success" ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-destructive/25 bg-destructive/10 text-destructive")}><Icon className="mt-0.5 size-4 shrink-0" /><span>{message}</span></div>;
}
