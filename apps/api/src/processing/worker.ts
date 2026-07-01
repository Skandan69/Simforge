import { processingEngine } from "./engine.js";

export function startProcessingWorker(intervalMs = 3_000) {
  let running = false;
  const tick = async () => { if (running) return; running = true; try { while (await processingEngine.processNext()) { /* drain queue */ } } catch (error) { console.error("Processing worker error", error); } finally { running = false; } };
  void tick(); const timer = setInterval(() => void tick(), intervalMs); timer.unref(); return () => clearInterval(timer);
}
