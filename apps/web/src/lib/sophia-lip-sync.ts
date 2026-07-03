export function amplitudeToMouthOpen(samples: Uint8Array, previous = 0) {
  if (!samples.length) return 0;
  let energy = 0;
  for (const sample of samples) {
    const normalized = (sample - 128) / 128;
    energy += normalized * normalized;
  }
  const rms = Math.sqrt(energy / samples.length);
  const target = Math.max(0, Math.min(1, (rms - 0.015) * 7));
  return previous * 0.62 + target * 0.38;
}

export async function startSophiaLipSync(audio: HTMLAudioElement, onMouthOpen: (value: number) => void): Promise<() => void> {
  if (typeof window === "undefined" || !window.AudioContext) return () => onMouthOpen(0);
  const context = new window.AudioContext();
  try {
    await context.resume();
    if (context.state !== "running") {
      await context.close();
      return () => onMouthOpen(0);
    }
    const source = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    source.connect(analyser);
    analyser.connect(context.destination);
    const samples = new Uint8Array(analyser.fftSize);
    let frame = 0;
    let stopped = false;
    let openness = 0;
    const update = () => {
      if (stopped) return;
      analyser.getByteTimeDomainData(samples);
      openness = amplitudeToMouthOpen(samples, openness);
      onMouthOpen(openness);
      frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      onMouthOpen(0);
      void context.close();
    };
  } catch {
    await context.close().catch(() => undefined);
    onMouthOpen(0);
    return () => onMouthOpen(0);
  }
}
