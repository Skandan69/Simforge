import { Activity, Circle } from "lucide-react";
import type { LiveCoachingIndicator, LiveCoachingState } from "@/lib/live-evaluation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const stateStyle: Record<LiveCoachingState, string> = {
  "Not observed yet": "border-slate-700 bg-slate-900 text-slate-400",
  Developing: "border-amber-700/50 bg-amber-950/40 text-amber-200",
  Observed: "border-sky-700/50 bg-sky-950/40 text-sky-200",
  Improving: "border-cyan-700/50 bg-cyan-950/40 text-cyan-200",
  Consistent: "border-emerald-700/50 bg-emerald-950/40 text-emerald-200",
  Strong: "border-emerald-600/60 bg-emerald-900/50 text-emerald-100",
  "Needs attention": "border-rose-700/50 bg-rose-950/40 text-rose-200",
};

export function LiveCoachingPanel({ indicators }: { indicators: LiveCoachingIndicator[] }) {
  return (
    <Card className="border-slate-700/50 bg-slate-950 text-slate-100" aria-label="Live coaching indicators">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="size-4 text-cyan-300" />
          Live Coaching
        </CardTitle>
        <p className="text-xs leading-5 text-slate-400">Supportive observations from this conversation. Your final evaluation remains authoritative.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {indicators.map((indicator) => (
          <div key={indicator.capability} className="border-t border-slate-800 pt-3 first:border-0 first:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Circle className={cn("size-2 fill-current", indicator.state === "Needs attention" ? "text-rose-300" : indicator.state === "Not observed yet" ? "text-slate-600" : "text-cyan-300")} aria-hidden="true" />
                {indicator.capability}
              </span>
              <Badge variant="outline" className={cn("font-normal", stateStyle[indicator.state])}>{indicator.state}</Badge>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-slate-400">{indicator.helper}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
