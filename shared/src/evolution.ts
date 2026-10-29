// Evolução do personagem: técnicas por nível, forma final, Poder e títulos.
import { CHARS, type SkillDef } from "./data";
import { playerAtk, playerDef, maxHp, maxRei } from "./formulas";
import { zanMult, reiMult } from "./training";
import { rebirthBonus } from "./progress";
import { gearBonus, setBonuses, type EquipSlot } from "./items";

/** Teclas das técnicas (1, 4, 5 e 6: 2 e 3 continuam sendo as poções). */
export const TECH_SLOTS = [1, 4, 5, 6];

/** Técnicas do personagem na ordem das teclas: a 1 vem do começo, as outras com o nível. */
export function techniques(charId: string): SkillDef[] {
  const ch = CHARS[charId];
  return [{ ...ch.skill, minLevel: 1 }, ...ch.techs];
}

/** Técnica i como ela sai na forma atual (a técnica 1 evolui a cada forma). */
export function techniqueFor(charId: string, i: number, form: number): SkillDef | undefined {
  const t = techniques(charId)[i];
  if (!t) return undefined;
  const evo = i === 0 ? CHARS[charId].forms[form]?.skill : undefined;
  return evo ? { ...t, ...evo } : t;
}

/** Forma mais alta que o nível permite (0, 1 ou 2). */
export function maxForm(charId: string, level: number): number {
  const f = CHARS[charId].forms;
  for (let i = f.length - 1; i > 0; i--) if (level >= f[i].minLevel) return i;
  return 0;
}

export interface PowerInput {
  charId: string;
  level: number;
  rebirths: number;
  zanjutsu: number;
  reiryoku: number;
  equip: Partial<Record<EquipSlot, string>>;
  forge?: Partial<Record<EquipSlot, number>>;
}

/** Poder: um número só que resume ataque, defesa, vida, perícias, equipamento e renascimentos. */
export function powerOf(p: PowerInput): number {
  const ch = CHARS[p.charId];
  if (!ch) return 0;
  const g = gearBonus(p.equip, p.forge);
  const rb = rebirthBonus(p.rebirths);
  const atk = (playerAtk(ch.atk, p.level) + g.atk) * rb.dmg * setBonuses(p.equip).total.dmg;
  const def = playerDef(ch.def, p.level) + g.def;
  const hp = (maxHp(p.level) + g.hp) * rb.hp;
  const rei = maxRei(p.level) + g.rei;
  const skill = (zanMult(p.zanjutsu) + reiMult(p.reiryoku)) / 2;
  return Math.round((atk * 5 + def * 4 + hp * 0.5 + rei * 0.3) * skill);
}

/** Títulos por Poder: cada um acende uma aura mais forte em volta do personagem. */
export const POWER_TIERS: { min: number; title: string; color: number }[] = [
  { min: 0, title: "Aspirante", color: 0 },
  { min: 300, title: "Oficial", color: 0xdfe6f0 },
  { min: 700, title: "Assento", color: 0x6ab8ff },
  { min: 1500, title: "Tenente", color: 0x6aff9a },
  { min: 3000, title: "Capitão", color: 0xffd34a },
  { min: 6000, title: "Capitão-Comandante", color: 0xff4a3a },
  { min: 12000, title: "Lenda", color: 0xc26aff },
  { min: 25000, title: "Rei das Almas", color: 0xffffff },
];

export function powerTier(power: number): number {
  let i = 0;
  while (i + 1 < POWER_TIERS.length && power >= POWER_TIERS[i + 1].min) i++;
  return i;
}

/** "12.345" */
export const fmtPower = (n: number) => n.toLocaleString("pt-BR");
