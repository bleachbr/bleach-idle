// Telemetria operacional consolidada (/metrics e /healthz):
// - duração do tick (via tickStats)
// - duração e contagem dos lotes de save no SQLite (saveAll)
// - estado da sala de mundo (jogadores online, caçada offline, monstros, sacolas)
// - alerta mínimo quando tick ou save ultrapassam o orçamento de 50 ms
import { getTickStats, WARN_TICK_MS, type TickStats } from "./tickStats";

export const WARN_SAVE_MS = 50;
const WARN_COOLDOWN_MS = 5_000;

let totalSaves = 0;
let savedChars = 0;
let slowSaves = 0;
let lastSaveMs = 0;
let maxSaveMs = 0;
let lastWarnAt = -Infinity;

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface SaveStats {
  saves: number;
  savedChars: number;
  slowSaves: number;
  lastMs: number;
  maxMs: number;
}

export interface WorldMetricsSnapshot {
  players: { online: number; offlineHunt: number; totalInWorld: number };
  entities: { monsters: number; bags: number };
}

export interface OperationalMetrics extends Record<string, unknown> {
  uptimeS: number;
  alert: boolean;
  alerts: string[];
  tick: TickStats;
  saves: SaveStats;
  players: WorldMetricsSnapshot["players"];
  entities: WorldMetricsSnapshot["entities"];
}

let worldProvider: (() => WorldMetricsSnapshot) | null = null;

export function setWorldMetricsProvider(fn: (() => WorldMetricsSnapshot) | null): void {
  worldProvider = fn;
}

export function recordSave(durationMs: number, charsCount: number, now = Date.now()): void {
  const ms = Math.max(0, durationMs);
  totalSaves++;
  savedChars += Math.max(0, charsCount);
  lastSaveMs = ms;
  if (ms > maxSaveMs) maxSaveMs = ms;
  if (ms > WARN_SAVE_MS) {
    slowSaves++;
    if (now - lastWarnAt >= WARN_COOLDOWN_MS) {
      lastWarnAt = now;
      console.warn(`[save] lento: ${ms.toFixed(1)} ms (${charsCount} chars, limite ${WARN_SAVE_MS} ms, total lentos: ${slowSaves})`);
    }
  }
}

export function getSaveStats(): SaveStats {
  return {
    saves: totalSaves,
    savedChars,
    slowSaves,
    lastMs: round2(lastSaveMs),
    maxMs: round2(maxSaveMs),
  };
}

export function resetSaveStats(): void {
  totalSaves = 0;
  savedChars = 0;
  slowSaves = 0;
  lastSaveMs = 0;
  maxSaveMs = 0;
  lastWarnAt = -Infinity;
}

export function getOperationalMetrics(uptimeS: number): OperationalMetrics {
  const tick = getTickStats();
  const saves = getSaveStats();
  const world = worldProvider
    ? worldProvider()
    : { players: { online: 0, offlineHunt: 0, totalInWorld: 0 }, entities: { monsters: 0, bags: 0 } };
  const alerts: string[] = [];
  if (tick.lastMs > WARN_TICK_MS || tick.p95Ms > WARN_TICK_MS) alerts.push("tick_lento");
  if (saves.lastMs > WARN_SAVE_MS) alerts.push("save_lento");
  return {
    uptimeS,
    alert: alerts.length > 0,
    alerts,
    tick,
    saves,
    players: world.players,
    entities: world.entities,
  };
}
