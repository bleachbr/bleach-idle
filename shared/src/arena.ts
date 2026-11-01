export const DEFAULT_ARENA_RATING = 1000;
export const ARENA_MIN_LEVEL = 20;
export const ARENA_K_FACTOR = 32;
export const ARENA_COUNTDOWN_SEC = 3;
export const ARENA_MATCH_TIMEOUT_SEC = 180;
export const ARENA_WIN_GOLD = 150;
export const ARENA_WIN_SEASON_PTS = 25;

export interface ArenaTier {
  id: string;
  name: string;
  minRating: number;
}

export const ARENA_TIERS: ArenaTier[] = [
  { id: "bronze", name: "Bronze", minRating: 0 },
  { id: "prata", name: "Prata", minRating: 1200 },
  { id: "ouro", name: "Ouro", minRating: 1400 },
  { id: "platina", name: "Platina", minRating: 1600 },
  { id: "diamante", name: "Diamante", minRating: 1800 },
  { id: "capitao", name: "Capitão", minRating: 2000 },
];

export function getArenaTier(rating: number): ArenaTier {
  for (let i = ARENA_TIERS.length - 1; i >= 0; i--) {
    if (rating >= ARENA_TIERS[i].minRating) {
      return ARENA_TIERS[i];
    }
  }
  return ARENA_TIERS[0];
}

export type DuelOutcome = "win" | "loss" | "draw";

export interface EloChange {
  playerDelta: number;
  opponentDelta: number;
}

export function calculateEloChange(
  playerRating: number,
  opponentRating: number,
  outcome: DuelOutcome,
  k = ARENA_K_FACTOR
): EloChange {
  const expectedA = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actualA = outcome === "win" ? 1 : outcome === "loss" ? 0 : 0.5;

  const playerDelta = Math.round(k * (actualA - expectedA));
  const opponentDelta = playerDelta === 0 ? 0 : -playerDelta;

  return { playerDelta, opponentDelta };
}

export function matchmakingTolerance(elapsedMs: number): number {
  const base = 100;
  const expansion = Math.floor(elapsedMs / 10_000) * 50;
  return Math.min(500, base + expansion);
}

export function validateStepInterval(
  lastStepMs: number,
  currentMs: number,
  effectiveStepMs: number
): boolean {
  if (lastStepMs <= 0) return true;
  const minInterval = Math.floor(effectiveStepMs * 0.9);
  return currentMs - lastStepMs >= minInterval;
}

export interface ArenaProgress {
  rating: number;
  wins: number;
  losses: number;
  streak: number;
  bestRating: number;
}

export function newArenaProgress(): ArenaProgress {
  return {
    rating: DEFAULT_ARENA_RATING,
    wins: 0,
    losses: 0,
    streak: 0,
    bestRating: DEFAULT_ARENA_RATING,
  };
}
