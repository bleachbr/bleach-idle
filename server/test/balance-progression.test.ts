import { describe, it, expect } from "vitest";
import { CHARS, MONSTERS, equipBonus, maxHp, maxRei, playerAtk, playerDef, START_KIT, TRAVEL } from "../../shared/src/index.js";
import { SPAWNS } from "../src/maps.js";

const PROGRESSION_LADDER = [
  "fishbone",
  "adjuchas",
  "arrancar",
  "arrancar_numeros",
  "exequias",
  "fraccion",
  "fraccion_espada",
  "arrancar_resurreccion",
  "vasto_lorde",
  "soldado_wandenreich",
  "sternritter",
  "sternritter_vollstandig",
] as const;

const MAP_MIN_LEVEL: Record<string, number> = Object.fromEntries(
  TRAVEL.map((t) => [t.map, Math.min(t.minLevel, ...(TRAVEL.filter((x) => x.map === t.map).map((x) => x.minLevel)))]),
);

function huntSim(charId: string, level: number, kind: string) {
  const ch = CHARS[charId];
  const m = MONSTERS[kind];
  const eq = equipBonus(START_KIT.equip);
  const atk = playerAtk(ch.atk, level) + eq.atk;
  const def = playerDef(ch.def, level) + eq.def;
  const form = ch.forms[0];
  const avgDmg = (a: number, mult: number, d: number) => Math.max(1, (a * mult * 50) / (50 + d));
  const melee = avgDmg(atk, form.dmgMult, m.def) / (form.attackMs / 1000);
  const reiPerS = (maxRei(level) + eq.rei) * 0.02;
  const skillsPerS = Math.min(1 / (ch.skill.cdMs / 1000), reiPerS / ch.skill.cost);
  const dps = melee + skillsPerS * avgDmg(atk, ch.skill.mult, m.def);
  const ttk = m.hp / dps;
  const taken = (avgDmg(m.atk, 1, def) / (m.attackMs / 1000)) * ttk;
  const hp = maxHp(level) + eq.hp;
  const rest = Math.max(0, taken - hp * 0.01 * ttk) / (hp * 0.04);
  const cycle = ttk + 3 + rest;
  const alive = SPAWNS.filter((sp) => sp.kind === kind && (MAP_MIN_LEVEL[sp.map] ?? 1) <= level).reduce((n, sp) => n + sp.count, 0);
  if (!alive) return { kind, risk: 999, expH: 0 };
  const killsH = Math.min(3600 / cycle, (alive * 3600) / (m.respawnMs / 1000 + ttk));
  return { kind, risk: taken / hp, expH: m.exp * killsH };
}

describe("Balanceamento dos mapas intermediários e avançados (F-15)", () => {
  it("escada de monstros de Soul Society (25) ao Wandenreich (150) cresce estritamente em HP, ATK, DEF, XP e XP/HP", () => {
    for (let i = 1; i < PROGRESSION_LADDER.length; i++) {
      const prev = MONSTERS[PROGRESSION_LADDER[i - 1]];
      const curr = MONSTERS[PROGRESSION_LADDER[i]];
      expect(curr.hp, `${curr.id}.hp deve ser > ${prev.id}.hp`).toBeGreaterThan(prev.hp);
      expect(curr.atk, `${curr.id}.atk deve ser > ${prev.id}.atk`).toBeGreaterThan(prev.atk);
      expect(curr.def, `${curr.id}.def deve ser > ${prev.id}.def`).toBeGreaterThan(prev.def);
      expect(curr.exp, `${curr.id}.exp deve ser > ${prev.id}.exp`).toBeGreaterThan(prev.exp);
      expect(curr.exp / curr.hp, `${curr.id} exp/hp deve ser > ${prev.id} exp/hp`).toBeGreaterThan(prev.exp / prev.hp);
    }
  });

  it("nenhum mapa ou monstro de Hueco Mundo, Las Noches, Karakura Falsa e Wandenreich é pulado na curva ótima de caça segura", () => {
    const kinds = Object.values(MONSTERS).filter((m) => !m.dummy);
    const bestByLevel = new Map<number, string>();
    for (let lv = 25; lv <= 150; lv += 5) {
      const best = kinds
        .map((k) => huntSim("ichigo", lv, k.id))
        .filter((h) => h.risk <= 0.6 && h.expH > 0)
        .sort((a, b) => b.expH - a.expH)[0];
      expect(best, `nível ${lv} sem caça segura`).toBeDefined();
      bestByLevel.set(lv, best.kind);
    }
    const chosen = new Set(bestByLevel.values());
    for (const expected of PROGRESSION_LADDER) {
      expect(chosen.has(expected), `monstro ${expected} foi pulado na progressão ótima (${[...chosen].join(", ")})`).toBe(true);
    }
  });
});
