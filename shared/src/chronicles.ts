// Rotação semanal determinística e persistência do ciclo de Crônicas (M1-01 e M1-05, ADR-002).
import type { ChronicleProgress, Progress } from "./progress";

export const TOTAL_CRONICAS = 5;
export const MS_PER_WEEK = 7 * 24 * 3600 * 1000;

/** Âncora temporal alinhada à segunda-feira 26/10/2026 00:00 BRT (03:00 UTC). */
export const CHRONICLE_EPOCH = Date.UTC(2026, 9, 26, 3, 0, 0);

/** Número da semana desde a âncora. Só aritmética sobre o instante UTC: não depende do fuso (TZ) do processo. */
export const weekNumber = (now = Date.now()): number => Math.floor((now - CHRONICLE_EPOCH) / MS_PER_WEEK);

/** Índice da crônica ativa (0 a 4) para qualquer instante. */
export function weekIndex(now = Date.now()): number {
  const weeks = weekNumber(now);
  return ((weeks % TOTAL_CRONICAS) + TOTAL_CRONICAS) % TOTAL_CRONICAS;
}

/** Chave gravada em `ChronicleProgress.activeWeekKey`. Vira no mesmo instante que `weekIndex`. */
export const currentWeekKey = (now = Date.now()): string => `w${weekNumber(now)}`;

/**
 * Sincroniza o estado da crônica do personagem para a semana atual (M1-05).
 * Na virada de semana, zera `questKills` e remove `completedAt` sem rotina batch no banco.
 */
export function syncChronicleProgress(prog: Pick<Progress, "chronicle">, now = Date.now()): ChronicleProgress {
  const key = currentWeekKey(now);
  if (!prog.chronicle || prog.chronicle.activeWeekKey !== key) {
    prog.chronicle = { activeWeekKey: key, questKills: 0 };
  }
  return prog.chronicle;
}
