import { processingEngine } from "./engine.js";

const DEFAULT_STALE_AFTER_MS = 15 * 60_000;
const SWEEP_INTERVAL_MS = 60_000;

export function startProcessingWorker(intervalMs = 3_000, staleAfterMs = Number(process.env.PROCESSING_STALE_AFTER_MS) || DEFAULT_STALE_AFTER_MS) {
  let running = false;
  let lastSweep = 0;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      if (Date.now() - lastSweep >= SWEEP_INTERVAL_MS) {
        lastSweep = Date.now();
        const recovered = await processingEngine.recoverStaleJobs(staleAfterMs);
        if (recovered.requeued || recovered.failed) console.warn("Recovered stale processing jobs", recovered);
      }
      while (await processingEngine.processNext()) { /* drain queue */ }
    } catch (error) {
      console.error("Processing worker error", error);
    } finally {
      running = false;
    }
  };
  void tick();
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
