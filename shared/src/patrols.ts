import { own } from "./lookup";
import type { Slot } from "./items";

export interface PatrolSector {
  id: string;
  name: string;
  description: string;
  minLevel: number;
  tier: number;
  baseExpPerHour: number;
  baseGoldPerHour: number;
  fragsPerHour: number;
  possibleDrops: { itemId: string; chance: number; maxQty?: number }[];
}

export interface PatrolState {
  sectorId: string;
  durationHours: number;
  startedAt: number;
  completedAt: number;
  partyBonus?: boolean;
}

export interface PatrolRewards {
  exp: number;
  gold: number;
  frags: number;
  items: Slot[];
}

export interface PatrolRewardOptions {
  partyBonus?: boolean;
  seed?: number;
}

export const PATROL_DURATIONS = [1, 4, 8, 12] as const;
export type PatrolDuration = (typeof PATROL_DURATIONS)[number];

export const DURATION_EFFICIENCY: Record<number, number> = {
  1: 1.0,
  4: 1.05,
  8: 1.15,
  12: 1.25,
};

export const PATROL_SECTORS: Record<string, PatrolSector> = {
  karakura_periferia: {
    id: "karakura_periferia",
    name: "Periferia de Karakura",
    description: "Vigília preventiva contra Hollows menores nos subúrbios.",
    minLevel: 1,
    tier: 1,
    baseExpPerHour: 1_200,
    baseGoldPerHour: 80,
    fragsPerHour: 2,
    possibleDrops: [
      { itemId: "garra", chance: 0.5, maxQty: 3 },
      { itemId: "pedra_reishi", chance: 0.35, maxQty: 2 },
      { itemId: "nucleo", chance: 0.2, maxQty: 1 },
      { itemId: "mascara", chance: 0.05, maxQty: 1 },
    ],
  },
  rukongai_distritos: {
    id: "rukongai_distritos",
    name: "Distritos de Rukongai",
    description: "Patrulha de contenção e vigilância nos distritos externos da Soul Society.",
    minLevel: 15,
    tier: 2,
    baseExpPerHour: 4_500,
    baseGoldPerHour: 250,
    fragsPerHour: 4,
    possibleDrops: [
      { itemId: "pedra_reishi", chance: 0.6, maxQty: 3 },
      { itemId: "nucleo", chance: 0.4, maxQty: 2 },
      { itemId: "talisma_kido", chance: 0.15, maxQty: 1 },
      { itemId: "botas_shunpo", chance: 0.08, maxQty: 1 },
    ],
  },
  floresta_menos: {
    id: "floresta_menos",
    name: "Floresta dos Menos",
    description: "Expedição de alto risco no subterrâneo contra Gillians e Adjuchas.",
    minLevel: 35,
    tier: 3,
    baseExpPerHour: 14_000,
    baseGoldPerHour: 750,
    fragsPerHour: 8,
    possibleDrops: [
      { itemId: "pedra_reishi", chance: 0.8, maxQty: 5 },
      { itemId: "nucleo", chance: 0.6, maxQty: 4 },
      { itemId: "elmo_osso", chance: 0.2, maxQty: 1 },
      { itemId: "lua_negra", chance: 0.1, maxQty: 1 },
      { itemId: "caixa_kisuke", chance: 0.15, maxQty: 1 },
    ],
  },
  deserto_hueco_mundo: {
    id: "deserto_hueco_mundo",
    name: "Deserto do Hueco Mundo",
    description: "Vigilância profunda em território de Arrancars sob as noites eternas de Las Noches.",
    minLevel: 60,
    tier: 4,
    baseExpPerHour: 40_000,
    baseGoldPerHour: 2_200,
    fragsPerHour: 15,
    possibleDrops: [
      { itemId: "pedra_reishi", chance: 0.95, maxQty: 8 },
      { itemId: "osso_resurreccion", chance: 0.4, maxQty: 2 },
      { itemId: "mascara_vasto", chance: 0.1, maxQty: 1 },
      { itemId: "espada_arrancar", chance: 0.12, maxQty: 1 },
      { itemId: "caixa_kisuke", chance: 0.3, maxQty: 2 },
    ],
  },
};

export function calculatePatrolRewards(
  sectorId: string,
  durationHours: number,
  playerLevel: number,
  options: PatrolRewardOptions = {}
): PatrolRewards {
  const sector = own(PATROL_SECTORS, sectorId);
  if (!sector) throw new Error(`Setor inválido: ${sectorId}`);
  if (!PATROL_DURATIONS.includes(durationHours as any)) {
    throw new Error(`Duração de patrulha inválida: ${durationHours}h`);
  }

  const durationMult = DURATION_EFFICIENCY[durationHours] ?? 1.0;
  const partyMult = options.partyBonus ? 1.15 : 1.0;
  const levelBonus = 1 + Math.max(0, playerLevel - sector.minLevel) * 0.01;

  const rawExp = sector.baseExpPerHour * durationHours * durationMult * levelBonus;
  const rawGold = sector.baseGoldPerHour * durationHours * durationMult * levelBonus;
  const rawFrags = Math.max(1, sector.fragsPerHour * durationHours * durationMult);

  const exp = Math.round(rawExp * partyMult);
  const gold = Math.round(rawGold * partyMult);
  const frags = Math.round(rawFrags * partyMult);

  // Gerador pseudo-aleatório determinístico LCG
  let seed = (options.seed ?? (durationHours * 1000 + playerLevel * 37)) >>> 0;
  function rnd(): number {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  const items: Slot[] = [];
  for (const drop of sector.possibleDrops) {
    const effectiveChance = Math.min(0.95, drop.chance * (durationHours * 0.75));
    if (rnd() < effectiveChance) {
      const max = drop.maxQty ?? 1;
      const qty = Math.max(1, Math.floor(rnd() * max) + 1);
      items.push({ id: drop.itemId, qty });
    }
  }

  return { exp, gold, frags, items };
}

export function canClaimPatrol(patrol: PatrolState | null | undefined, nowMs: number): boolean {
  if (!patrol) return false;
  return nowMs >= patrol.completedAt;
}

export function patrolRemainingMs(patrol: PatrolState | null | undefined, nowMs: number): number {
  if (!patrol) return 0;
  return Math.max(0, patrol.completedAt - nowMs);
}
