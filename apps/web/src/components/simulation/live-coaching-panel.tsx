import { Activity, Circle } from "lucide-react";
import type { CommunicationIndicator, CommunicationState, LiveCoachingIndicator, LiveCoachingState } from "@/lib/live-evaluation";
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

const communicationStateStyle: Record<CommunicationState, string> = {
  "Not observed yet": stateStyle["Not observed yet"],
  Developing: stateStyle.Developing,
  Good: stateStyle.Observed,
  Strong: stateStyle.Strong,
  Excellent: "border-emerald-500/60 bg-emerald-900/60 text-emerald-50",
  "Needs attention": stateStyle["Needs attention"],
};

export function LiveCoachingPanel({ behavioralIndicators, communicationIndicators, showCommunication, onShowCommunicationChange }: { behavioralIndicators: LiveCoachingIndicator[]; communicationIndicators: CommunicationIndicator[]; showCommunication: boolean; onShowCommunicationChange: (visible: boolean) => void }) {
  return (
    <Card className="border-slate-700/50 bg-slate-950 text-slate-100" aria-label="Live coaching indicators">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="size-4 text-cyan-300" />
          Live Coaching
        </CardTitle>
        <p className="text-xs leading-5 text-slate-400">Supportive observations from this conversation. Your final evaluation remains authoritative.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <section aria-labelledby="behavioral-intelligence">
          <h3 id="behavioral-intelligence" className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Behavioral Intelligence</h3>
          <div className="space-y-2">
        {behavioralIndicators.map((indicator) => (
          <div key={indicator.capability} className="border-t border-slate-800 py-2 first:border-0 first:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Circle className={cn("size-2 fill-current", indicator.state === "Needs attention" ? "text-rose-300" : indicator.state === "Not observed yet" ? "text-slate-600" : "text-cyan-300")} aria-hidden="true" />
                {indicator.capability}
              </span>
              <Badge variant="outline" className={cn("font-normal", stateStyle[indicator.state])}>{indicator.state}</Badge>
            </div>
            {["Developing", "Needs attention"].includes(indicator.state) && <p className="mt-1.5 text-xs leading-5 text-slate-400">{indicator.helper}</p>}
          </div>
        ))}
          </div>
        </section>
        <section className="border-t border-slate-700 pt-4" aria-labelledby="communication-intelligence">
          <div className="mb-2 flex items-center justify-between gap-2"><h3 id="communication-intelligence" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Communication Intelligence</h3><button type="button" className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-900" aria-pressed={showCommunication} onClick={() => onShowCommunicationChange(!showCommunication)}>{showCommunication ? "On" : "Off"}</button></div>
          {showCommunication ? (
          <div className="space-y-2">
            {communicationIndicators.map((indicator) => (
              <div key={indicator.signal} className="border-t border-slate-800 py-2 first:border-0 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium"><Circle className={cn("size-2 fill-current", indicator.state === "Needs attention" ? "text-rose-300" : indicator.state === "Not observed yet" ? "text-slate-600" : "text-cyan-300")} aria-hidden="true" />{indicator.signal}</span>
                  <Badge variant="outline" className={cn("font-normal", communicationStateStyle[indicator.state])}>{indicator.state}</Badge>
                </div>
                {["Developing", "Needs attention"].includes(indicator.state) && <p className="mt-1.5 text-xs leading-5 text-slate-400">{indicator.helper}</p>}
              </div>
            ))}
          </div>
          ) : <p className="text-xs leading-5 text-slate-500">Communication feedback is hidden. Behavioral coaching remains active.</p>}
        </section>
      </CardContent>
    </Card>
  );
}
