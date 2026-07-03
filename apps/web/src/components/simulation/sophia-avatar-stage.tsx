"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { SOPHIA_AVATAR_PRESENTATION, type SophiaAvatarState } from "@/lib/sophia-avatar";
import { useSophiaPresence } from "@/hooks/use-sophia-presence";
import { projectSophiaMouthToStage, SOPHIA_FACE_CONFIG } from "@/lib/sophia-face-config";

export function SophiaAvatarFallback() {
  return <div className="grid h-full place-items-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 text-center text-white" role="img" aria-label="Sophia, AI simulation trainer">
    <div><span className="mx-auto grid size-20 place-items-center rounded-full border border-white/15 bg-white/10"><UserRound className="size-9" /></span><p className="mt-4 text-lg font-semibold">Sophia</p><p className="mt-1 text-sm text-slate-300">AI simulation trainer</p></div>
  </div>;
}

export function SophiaAvatarStage({ state, controls, mouthOpen = 0 }: { state: SophiaAvatarState; controls: React.ReactNode; mouthOpen?: number }) {
  const [failed, setFailed] = useState(false);
  const portraitRef = useRef<HTMLDivElement>(null);
  const [mouthGeometry, setMouthGeometry] = useState<ReturnType<typeof projectSophiaMouthToStage>>();
  const { blinking } = useSophiaPresence(state);
  const presentation = SOPHIA_AVATAR_PRESENTATION[state];
  useEffect(() => {
    const portrait = portraitRef.current;
    if (!portrait) return;
    const update = () => {
      if (portrait.clientWidth && portrait.clientHeight) setMouthGeometry(projectSophiaMouthToStage({ width: portrait.clientWidth, height: portrait.clientHeight }));
    };
    update();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(update);
      observer.observe(portrait);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950 shadow-2xl shadow-slate-950/20" aria-label="Sophia avatar">
    <div ref={portraitRef} className="relative min-h-[340px] overflow-hidden sm:min-h-[400px] lg:min-h-[420px]">
      {failed ? <SophiaAvatarFallback /> : <Image src="/assets/sophia/sophia-avatar-v1.png" alt="Sophia, professional AI simulation trainer" fill sizes="(max-width: 1024px) 100vw, 70vw" data-state={state} className={cn("sophia-presence-image transition-[filter,transform] duration-700", state === "thinking" && "brightness-90")} style={{ objectFit: SOPHIA_FACE_CONFIG.objectFit, objectPosition: SOPHIA_FACE_CONFIG.objectPosition }} onError={() => setFailed(true)} />}
      {!failed && <div className={cn("sophia-eyelids pointer-events-none absolute inset-0 transition-opacity duration-75", blinking ? "opacity-100" : "opacity-0")} aria-hidden="true"><span className="absolute left-[43.5%] top-[48%] h-[3px] w-[5.5%] rounded-full bg-slate-950/70 sm:top-[50%] lg:top-[52%]" /><span className="absolute right-[43.5%] top-[48%] h-[3px] w-[5.5%] rounded-full bg-slate-950/70 sm:top-[50%] lg:top-[52%]" /></div>}
      {!failed && state === "speaking" && mouthGeometry && <span data-sophia-mouth-anchor className="pointer-events-none absolute rounded-[50%] bg-rose-950/40 shadow-[0_0_4px_rgba(30,10,15,0.25)] transition-transform duration-75" style={{ left: mouthGeometry.centerX, top: mouthGeometry.centerY, width: mouthGeometry.width, height: mouthGeometry.height, transformOrigin: SOPHIA_FACE_CONFIG.transformOrigin, transform: `translate(-50%, -50%) scaleY(${0.35 + Math.min(1, mouthOpen) * SOPHIA_FACE_CONFIG.speakingScale})` }} aria-hidden="true" />}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/10" />
      {state === "speaking" && <div className="pointer-events-none absolute inset-5 rounded-2xl border border-cyan-300/35 animate-pulse" />}
      {state === "listening" && <div className="pointer-events-none absolute inset-x-12 bottom-28 h-px bg-cyan-300 shadow-[0_0_28px_8px_rgba(103,232,249,0.35)] animate-pulse" />}
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-white"><div className="flex items-center gap-2"><Sparkles className="size-4 text-cyan-300" /><span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Sophia</span></div><p className="mt-2 text-2xl font-semibold">AI Simulation Trainer</p><p className="mt-1 text-sm text-slate-300">{presentation.description}</p></div>
          <div className="rounded-full border border-white/15 bg-slate-950/75 px-4 py-2 text-xs font-medium text-white backdrop-blur" aria-live="polite">{presentation.label}</div>
        </div>
      </div>
    </div>
    <div className="border-t border-white/10 bg-slate-950/95 p-4">{controls}</div>
  </section>;
}
