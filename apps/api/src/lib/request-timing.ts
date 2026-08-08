import type { Request, RequestHandler } from "express";

export interface TimingMark {
  name: string;
  durationMs: number;
}

export interface TimedRequest extends Request {
  simforgeTiming?: {
    startedAt: number;
    marks: TimingMark[];
  };
}

export function nowMs() {
  return performance.now();
}

export const startRequestTiming: RequestHandler = (request, _response, next) => {
  (request as TimedRequest).simforgeTiming = { startedAt: nowMs(), marks: [] };
  next();
};

export async function timeRequestStage<T>(request: Request, name: string, operation: () => Promise<T>): Promise<T> {
  const startedAt = nowMs();
  try {
    return await operation();
  } finally {
    (request as TimedRequest).simforgeTiming?.marks.push({ name, durationMs: Math.round(nowMs() - startedAt) });
  }
}

export function debugTimingsRequested(request: Request) {
  return request.header("x-simforge-debug-timings") === "true";
}

export function requestTimingSummary(request: Request) {
  const timing = (request as TimedRequest).simforgeTiming;
  if (!timing) return null;
  return {
    requestTotalMs: Math.round(nowMs() - timing.startedAt),
    stages: timing.marks,
  };
}
