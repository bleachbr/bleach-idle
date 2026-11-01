// Relatório da caçada offline (W-05): consolida o que o personagem fez enquanto o jogador esteve fora.
import { MONSTERS } from "./data";
import { ITEMS } from "./items";

/** A caçada offline dura no máximo 12 h; depois disso o personagem sai do mundo. */
export const OFFLINE_MAX_MS = 12 * 3600_000;
const TOP_KINDS = 5;

export interface OfflineDeath { by: string; exp: number; gold: number; items: string[]; protected: boolean; at: number }

export interface OfflineReportInput {
  since: number;
  now: number;
  expAtLeave: number; exp: number;
  goldAtLeave: number; gold: number;
  zanAtLeave: number; zan: number;
  reiAtLeave: number; rei: number;
  level: number;
  /** abates por tipo de monstro */
  kinds: Record<string, number>;
  /** loot por id de item */
  items: Record<string, number>;
  deaths: OfflineDeath[];
}

export interface OfflineReport {
  awayMinutes: number;
  huntMinutes: number;
  /** true quando o jogador voltou depois do limite de 12 h: a caçada já tinha parado */
  stopped: boolean;
  kills: number;
  killsPerHour: number;
  expPerHour: number;
  exp: number;
  gold: number;
  expLost: number;
  goldLost: number;
  deathCount: number;
  deaths: OfflineDeath[];
  topKills: { kind: string; name: string; n: number }[];
  otherKinds: number;
  items: { id: string; name: string; qty: number }[];
  zanGain: number;
  reiGain: number;
  level: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildOfflineReport(i: OfflineReportInput): OfflineReport {
  const awayMs = Math.max(0, i.now - i.since);
  const huntMs = Math.min(awayMs, OFFLINE_MAX_MS);
  const hours = huntMs / 3600_000;
  const sortedKinds = Object.entries(i.kinds).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const kills = sortedKinds.reduce((s, [, n]) => s + n, 0);
  const exp = i.exp - i.expAtLeave;
  return {
    awayMinutes: Math.round(awayMs / 60_000),
    huntMinutes: Math.round(huntMs / 60_000),
    stopped: awayMs > OFFLINE_MAX_MS,
    kills,
    killsPerHour: hours ? round1(kills / hours) : 0,
    expPerHour: hours ? Math.round(exp / hours) : 0,
    exp,
    gold: i.gold - i.goldAtLeave,
    expLost: i.deaths.reduce((s, d) => s + d.exp, 0),
    goldLost: i.deaths.reduce((s, d) => s + d.gold, 0),
    deathCount: i.deaths.length,
    deaths: i.deaths,
    topKills: sortedKinds.slice(0, TOP_KINDS).map(([kind, n]) => ({ kind, name: MONSTERS[kind]?.name ?? kind, n })),
    otherKinds: Math.max(0, sortedKinds.length - TOP_KINDS),
    items: Object.entries(i.items).sort((a, b) => b[1] - a[1]).map(([id, qty]) => ({ id, name: ITEMS[id]?.name ?? id, qty })),
    zanGain: i.zan - i.zanAtLeave,
    reiGain: i.rei - i.reiAtLeave,
    level: i.level,
  };
}
