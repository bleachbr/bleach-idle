// Ranking incremental em memória (F-09).
// Semeia os resumos uma única vez a partir do SQLite e atualiza O(1) a cada save/exclusão,
// evitando varrer e fazer JSON.parse de milhares de saves (3,7 KB cada) no event loop do tick.
import { powerOf, stagesSum, type Progress } from "../../shared/src";
import * as db from "./db";
import * as guilds from "./guilds";

export interface RankingEntry {
  name: string;
  charId: string;
  level: number;
  exp: number;
  frags: number;
  guild: string;
  ach: number;
  stages: number;
  rebirths: number;
  dg: number;
  power: number;
}

export interface LiveRankingPlayer {
  id: string;
  name: string;
  charId: string;
  level: number;
  exp: number;
  frags: number;
  rebirths: number;
  power: number;
  prog: Pick<Progress, "ach" | "bestiary" | "dgBest">;
}

const CACHE_TTL_MS = 15_000;
const savedEntries = new Map<string, RankingEntry>();
let seeded = false;
let cache: { at: number; data: ReturnType<typeof buildRanking> } | null = null;

function entryFromSave(d: db.SaveData): RankingEntry {
  return {
    name: d.name,
    charId: d.charId,
    level: d.level,
    exp: d.exp,
    frags: d.frags ?? 0,
    guild: "",
    ach: d.prog?.ach.length ?? 0,
    stages: stagesSum(d.prog?.bestiary ?? {}),
    rebirths: d.rebirths ?? 0,
    dg: d.prog?.dgBest ?? 0,
    power: powerOf({
      charId: d.charId,
      level: d.level,
      rebirths: d.rebirths ?? 0,
      zanjutsu: d.zanjutsu ?? 0,
      reiryoku: d.reiryoku ?? 0,
      equip: d.equip ?? {},
      forge: d.forge ?? {},
    }),
  };
}

function entryFromLive(p: LiveRankingPlayer): RankingEntry {
  return {
    name: p.name,
    charId: p.charId,
    level: p.level,
    exp: p.exp,
    frags: p.frags,
    guild: "",
    ach: p.prog.ach.length,
    stages: stagesSum(p.prog.bestiary),
    rebirths: p.rebirths,
    dg: p.prog.dgBest ?? 0,
    power: p.power,
  };
}

function ensureSeeded(): void {
  if (seeded) return;
  seeded = true;
  for (const r of db.allChars()) savedEntries.set(r.id, entryFromSave(r.data));
}

export function upsertRankingSave(id: string, data: db.SaveData): void {
  if (!seeded) return;
  savedEntries.set(id, entryFromSave(data));
}

export function removeRankingEntry(id: string): void {
  if (!seeded) return;
  savedEntries.delete(id);
}

db.onCharWrite(upsertRankingSave, removeRankingEntry);

export function buildRanking(livePlayers: Iterable<LiveRankingPlayer>) {
  ensureSeeded();
  const rows = new Map<string, RankingEntry>();
  for (const [id, e] of savedEntries) rows.set(id, { ...e, guild: "" });
  for (const p of livePlayers) rows.set(p.id, entryFromLive(p));

  const memberOf = guilds.memberMap();
  const byId = new Map(guilds.all().map((g) => [g.id, g]));
  const gMap = new Map<number, { name: string; tag: string; members: number; levels: number; frags: number }>();

  for (const [id, r] of rows) {
    const gid = memberOf.get(id);
    const guild = gid ? byId.get(gid) : undefined;
    if (!guild) continue;
    r.guild = guild.tag;
    const e = gMap.get(guild.id) ?? { name: guild.name, tag: guild.tag, members: 0, levels: 0, frags: 0 };
    e.members++;
    e.levels += r.level;
    e.frags += r.frags;
    gMap.set(guild.id, e);
  }

  const list = [...rows.values()];
  return {
    nivel: [...list].sort((a, b) => b.rebirths - a.rebirths || b.exp - a.exp).slice(0, 20),
    poder: [...list].sort((a, b) => b.power - a.power).slice(0, 20),
    abates: list.filter((r) => r.frags > 0).sort((a, b) => b.frags - a.frags).slice(0, 20),
    guildas: [...gMap.values()].sort((a, b) => b.frags - a.frags || b.levels - a.levels).slice(0, 20),
    conquistas: list.filter((r) => r.ach > 0).sort((a, b) => b.ach - a.ach || b.exp - a.exp).slice(0, 20),
    dangai: list.filter((r) => r.dg > 0).sort((a, b) => b.dg - a.dg || b.exp - a.exp).slice(0, 20),
    bestiario: list.filter((r) => r.stages > 0).sort((a, b) => b.stages - a.stages || b.exp - a.exp).slice(0, 20),
  };
}

export function getRanking(livePlayers: Iterable<LiveRankingPlayer>, now = Date.now()) {
  if (!cache || now - cache.at > CACHE_TTL_MS) {
    cache = { at: now, data: buildRanking(livePlayers) };
  }
  return cache.data;
}

export function resetRankingCache(): void {
  savedEntries.clear();
  seeded = false;
  cache = null;
}
