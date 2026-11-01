import {
  matchmakingTolerance,
  calculateEloChange,
  getArenaTier,
  ARENA_COUNTDOWN_SEC,
  ARENA_MATCH_TIMEOUT_SEC,
  ARENA_WIN_GOLD,
  ARENA_WIN_SEASON_PTS,
  type ArenaProgress,
  type DuelOutcome,
} from "../../shared/src/arena";

export interface QueueEntry {
  playerId: string;
  name: string;
  rating: number;
  queuedAt: number;
}

export interface DuelSpawnPos {
  map: string;
  x: number;
  y: number;
}

export interface ArenaDuel {
  id: string;
  p1Id: string;
  p2Id: string;
  p1Name: string;
  p2Name: string;
  p1Rating: number;
  p2Rating: number;
  p1Return?: DuelSpawnPos;
  p2Return?: DuelSpawnPos;
  startedAt: number;
  countdownUntil: number;
  timeoutUntil: number;
  state: "countdown" | "fighting" | "finished";
}

export interface DuelResult {
  duel: ArenaDuel;
  winnerId: string | null;
  reason: "ko" | "timeout" | "forfeit";
  p1Outcome: DuelOutcome;
  p2Outcome: DuelOutcome;
  p1Delta: number;
  p2Delta: number;
  p1NewRating: number;
  p2NewRating: number;
  goldReward: number;
  seasonPts: number;
}

let queue: QueueEntry[] = [];
const activeDuels = new Map<string, ArenaDuel>();
const playerToDuel = new Map<string, string>();
let duelCounter = 0;

export function enqueue(entry: QueueEntry): boolean {
  if (isInQueue(entry.playerId) || isInDuel(entry.playerId)) return false;
  queue.push(entry);
  return true;
}

export function dequeue(playerId: string): boolean {
  const idx = queue.findIndex((e) => e.playerId === playerId);
  if (idx < 0) return false;
  queue.splice(idx, 1);
  return true;
}

export function isInQueue(playerId: string): boolean {
  return queue.some((e) => e.playerId === playerId);
}

export function isInDuel(playerId: string): boolean {
  return playerToDuel.has(playerId);
}

export function getQueueStatus(playerId: string, nowMs = Date.now()) {
  const entry = queue.find((e) => e.playerId === playerId);
  if (!entry) return { inQueue: false };
  const elapsedMs = Math.max(0, nowMs - entry.queuedAt);
  return {
    inQueue: true,
    elapsedSec: Math.floor(elapsedMs / 1000),
    tolerance: matchmakingTolerance(elapsedMs),
  };
}

export function matchmake(nowMs = Date.now()): [QueueEntry, QueueEntry][] {
  const matches: [QueueEntry, QueueEntry][] = [];
  const matchedIds = new Set<string>();

  for (let i = 0; i < queue.length; i++) {
    const e1 = queue[i];
    if (matchedIds.has(e1.playerId)) continue;

    const tol1 = matchmakingTolerance(nowMs - e1.queuedAt);

    let bestIdx = -1;
    let minDiff = Infinity;

    for (let j = i + 1; j < queue.length; j++) {
      const e2 = queue[j];
      if (matchedIds.has(e2.playerId)) continue;

      const tol2 = matchmakingTolerance(nowMs - e2.queuedAt);
      const diff = Math.abs(e1.rating - e2.rating);

      if (diff <= Math.max(tol1, tol2) && diff < minDiff) {
        minDiff = diff;
        bestIdx = j;
      }
    }

    if (bestIdx >= 0) {
      const e2 = queue[bestIdx];
      matchedIds.add(e1.playerId);
      matchedIds.add(e2.playerId);
      matches.push([e1, e2]);
    }
  }

  if (matchedIds.size > 0) {
    queue = queue.filter((e) => !matchedIds.has(e.playerId));
  }

  return matches;
}

export function createDuel(p1: QueueEntry, p2: QueueEntry, nowMs = Date.now()): ArenaDuel {
  const id = `duel_${++duelCounter}_${nowMs.toString(36)}`;
  const duel: ArenaDuel = {
    id,
    p1Id: p1.playerId,
    p2Id: p2.playerId,
    p1Name: p1.name,
    p2Name: p2.name,
    p1Rating: p1.rating,
    p2Rating: p2.rating,
    startedAt: nowMs,
    countdownUntil: nowMs + ARENA_COUNTDOWN_SEC * 1000,
    timeoutUntil: nowMs + ARENA_MATCH_TIMEOUT_SEC * 1000,
    state: "countdown",
  };

  activeDuels.set(id, duel);
  playerToDuel.set(p1.playerId, id);
  playerToDuel.set(p2.playerId, id);

  return duel;
}

export function getDuelByPlayer(playerId: string): ArenaDuel | undefined {
  const duelId = playerToDuel.get(playerId);
  if (!duelId) return undefined;
  return activeDuels.get(duelId);
}

export function removeDuel(duelId: string): ArenaDuel | undefined {
  const duel = activeDuels.get(duelId);
  if (!duel) return undefined;

  activeDuels.delete(duelId);
  playerToDuel.delete(duel.p1Id);
  playerToDuel.delete(duel.p2Id);
  return duel;
}

export function getActiveDuels(): ArenaDuel[] {
  return Array.from(activeDuels.values());
}

export function resolveDuel(
  duelId: string,
  winnerId: string | null,
  reason: "ko" | "timeout" | "forfeit"
): DuelResult | undefined {
  const duel = activeDuels.get(duelId);
  if (!duel) return undefined;

  let p1Outcome: DuelOutcome = "draw";
  let p2Outcome: DuelOutcome = "draw";

  if (winnerId === duel.p1Id) {
    p1Outcome = "win";
    p2Outcome = "loss";
  } else if (winnerId === duel.p2Id) {
    p1Outcome = "loss";
    p2Outcome = "win";
  }

  const { playerDelta, opponentDelta } = calculateEloChange(duel.p1Rating, duel.p2Rating, p1Outcome);
  const p1NewRating = Math.max(100, duel.p1Rating + playerDelta);
  const p2NewRating = Math.max(100, duel.p2Rating + opponentDelta);

  removeDuel(duelId);

  return {
    duel,
    winnerId,
    reason,
    p1Outcome,
    p2Outcome,
    p1Delta: playerDelta,
    p2Delta: opponentDelta,
    p1NewRating,
    p2NewRating,
    goldReward: ARENA_WIN_GOLD,
    seasonPts: ARENA_WIN_SEASON_PTS,
  };
}

export function applyArenaProgress(
  prog: ArenaProgress,
  outcome: DuelOutcome,
  newRating: number
): void {
  prog.rating = newRating;
  prog.bestRating = Math.max(prog.bestRating, newRating);
  if (outcome === "win") {
    prog.wins++;
    prog.streak++;
  } else if (outcome === "loss") {
    prog.losses++;
    prog.streak = 0;
  }
}

export function _resetForTests(): void {
  queue = [];
  activeDuels.clear();
  playerToDuel.clear();
  duelCounter = 0;
}
