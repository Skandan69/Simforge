"use client";

import { useCallback, useSyncExternalStore } from "react";

export const COMMUNICATION_INTELLIGENCE_PREFERENCE_KEY = "simforge.communication-intelligence.visible";
const preferenceEvent = "simforge-communication-preference";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(preferenceEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(preferenceEvent, callback);
  };
}

const getSnapshot = () => window.localStorage.getItem(COMMUNICATION_INTELLIGENCE_PREFERENCE_KEY) !== "false";
const getServerSnapshot = () => true;

export function useCommunicationIntelligence() {
  const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setVisible = useCallback((next: boolean) => {
    window.localStorage.setItem(COMMUNICATION_INTELLIGENCE_PREFERENCE_KEY, String(next));
    window.dispatchEvent(new Event(preferenceEvent));
  }, []);
  return { communicationIntelligenceVisible: visible, setCommunicationIntelligenceVisible: setVisible };
}
