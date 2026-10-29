// Passe de temporada (grátis) e eventos com horário: chefe mundial e fim de semana de XP em dobro.
import { dayKey } from "./progress";

/** Uma temporada por mês (no fuso de Brasília). Cada nível do passe pede `perTier` pontos. */
export const SEASON = { tiers: 30, perTier: 150 };

/** De onde vêm os pontos do passe. Abates rendem até um limite por dia, para quem caça offline não terminar em 2 dias. */
export const SEASON_PTS = {
  killEvery: 10, // a cada 10 abates...
  kill: 5, // ...5 pontos
  killDailyCap: 150,
  boss: 15,
  mission: 40,
  missionsAll: 30,
  daily: 30,
  worldBoss: 60,
};

const NAMES = [
  "Temporada da Lua Negra", "Temporada das Mil Pétalas", "Temporada do Céu Congelado", "Temporada da Chama Primordial",
  "Temporada do Deserto Branco", "Temporada da Máscara", "Temporada do Corredor", "Temporada do Palácio",
  "Temporada dos Capitães", "Temporada da Garganta", "Temporada do Eclipse", "Temporada do Rei",
];

/** "2026-10" */
export const seasonId = (ms: number) => dayKey(ms).slice(0, 7);
export const seasonName = (id: string) => NAMES[(Number(id.slice(5, 7)) - 1) % NAMES.length];

/** Quando a temporada acaba (meia-noite de Brasília do dia 1º do mês seguinte), em ms. */
export function seasonEnds(id: string): number {
  const [y, mo] = id.split("-").map(Number);
  return Date.UTC(mo === 12 ? y + 1 : y, mo === 12 ? 0 : mo, 1, 3);
}

export interface SeasonReward { gold?: number; crystals?: number; items?: { id: string; qty: number }[]; cos?: string }

/** Prêmio de cada nível (1 a 30). Depois do 30, cada nível a mais dá o prêmio bônus. */
export function seasonReward(tier: number): SeasonReward {
  if (tier > SEASON.tiers) return { crystals: 5, items: [{ id: "caixa_kisuke", qty: 1 }] };
  if (tier === 10) return { crystals: 30, cos: "aura_eclipse" };
  if (tier === 20) return { crystals: 40, cos: "tit_temporada" };
  if (tier === 30) return { crystals: 60, cos: "pet_eclipse" };
  if (tier % 5 === 0) return { crystals: 20, items: [{ id: "caixa_kisuke", qty: 2 }] };
  if (tier % 3 === 0) return { items: [{ id: tier % 2 ? "pergaminho_xp" : "incenso", qty: 1 }] };
  if (tier % 2 === 0) return { items: [{ id: tier < 15 ? "pocao_vida" : "pocao_grande", qty: 5 }, { id: tier < 15 ? "pocao_rei" : "pocao_rei_grande", qty: 5 }] };
  return { gold: 300 * tier, items: tier >= 7 ? [{ id: "pedra_reishi", qty: 2 }] : undefined };
}

export interface SeasonState {
  id: string;
  pts: number;
  /** último nível já resgatado */
  claimed: number;
  /** abates que ainda não viraram pontos, e pontos de abate ganhos hoje */
  kAcc: number;
  kDay: string;
  kPts: number;
}

export const newSeason = (ms: number): SeasonState => ({ id: seasonId(ms), pts: 0, claimed: 0, kAcc: 0, kDay: "", kPts: 0 });
export const seasonTier = (pts: number) => Math.floor(pts / SEASON.perTier);

// ---------- eventos ----------

/** Sábado e domingo (Brasília): XP em dobro dos monstros. */
export function xpWeekend(ms: number): boolean {
  const d = new Date(ms - 3 * 3600_000).getUTCDay();
  return d === 0 || d === 6;
}
export const WEEKEND_EXP = 2;

/** Chefe mundial: aparece em Karakura de tempos em tempos, com aviso antes. A vida cresce com quem está online. */
export const WORLD_BOSS = {
  kind: "menos_anciao",
  everyMs: 2 * 3600_000,
  firstMs: 20 * 60_000,
  warnMs: 5 * 60_000,
  durationMs: 15 * 60_000,
  hpBase: 30000,
  hpPerPlayer: 12000,
};
