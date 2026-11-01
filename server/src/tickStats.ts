// Métrica de duração do tick do mundo (TICK_MS = 100 ms).
// Mantém janela circular das últimas 100 amostras (10 s) sem alocar no tick e emite aviso acima de 50 ms.

export const WARN_TICK_MS = 50;
const WINDOW_SIZE = 100;
const WARN_COOLDOWN_MS = 5_000;

const samples = new Float64Array(WINDOW_SIZE);
let sampleCount = 0;
let writeIdx = 0;
let totalTicks = 0;
let slowTicks = 0;
let lastMs = 0;
let maxMs = 0;
let lastWarnAt = -Infinity;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function recordTick(durationMs: number, now = Date.now()): void {
  const ms = Math.max(0, durationMs);
  samples[writeIdx] = ms;
  writeIdx = (writeIdx + 1) % WINDOW_SIZE;
  if (sampleCount < WINDOW_SIZE) sampleCount++;
  totalTicks++;
  lastMs = ms;
  if (ms > maxMs) maxMs = ms;

  if (ms > WARN_TICK_MS) {
    slowTicks++;
    if (now - lastWarnAt >= WARN_COOLDOWN_MS) {
      lastWarnAt = now;
      console.warn(`[tick] lento: ${ms.toFixed(1)} ms (limite ${WARN_TICK_MS} ms, total lentos: ${slowTicks})`);
    }
  }
}

export interface TickStats {
  ticks: number;
  slowTicks: number;
  lastMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
}

export function getTickStats(): TickStats {
  if (sampleCount === 0) {
    return { ticks: 0, slowTicks: 0, lastMs: 0, p50Ms: 0, p95Ms: 0, maxMs: 0 };
  }
  const active = Array.from(samples.subarray(0, sampleCount)).sort((a, b) => a - b);
  const p50 = active[Math.floor((active.length - 1) * 0.5)];
  const p95 = active[Math.floor((active.length - 1) * 0.95)];
  return {
    ticks: totalTicks,
    slowTicks,
    lastMs: round2(lastMs),
    p50Ms: round2(p50),
    p95Ms: round2(p95),
    maxMs: round2(maxMs),
  };
}

export function resetTickStats(): void {
  samples.fill(0);
  sampleCount = 0;
  writeIdx = 0;
  totalTicks = 0;
  slowTicks = 0;
  lastMs = 0;
  maxMs = 0;
  lastWarnAt = -Infinity;
}
