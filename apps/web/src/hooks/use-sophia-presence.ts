"use client";

import { useEffect, useState } from "react";
import type { SophiaAvatarState } from "@/lib/sophia-avatar";

export function nextBlinkDelay(random = Math.random) {
  return 2_800 + Math.round(random() * 3_800);
}

export function useSophiaPresence(state: SophiaAvatarState) {
  const [blinking, setBlinking] = useState(false);
  useEffect(() => {
    if (state === "error" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let blinkTimer = 0;
    let openTimer = 0;
    const schedule = () => {
      blinkTimer = window.setTimeout(() => {
        setBlinking(true);
        openTimer = window.setTimeout(() => {
          setBlinking(false);
          schedule();
        }, 135);
      }, nextBlinkDelay());
    };
    schedule();
    return () => {
      window.clearTimeout(blinkTimer);
      window.clearTimeout(openTimer);
      setBlinking(false);
    };
  }, [state]);
  return { blinking };
}
