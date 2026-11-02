// Ficha do personagem (issue #36): monta as linhas a partir do estado sincronizado (Player do
// Colyseus) e da mensagem "inv". Só exibe: cada número sai das mesmas funções de shared/ que o
// servidor usa (recompute, hit, monsterExp e giveLoot no WorldRoom.ts). O total de ataque e defesa
// é o que o servidor mandou; a ficha só explica de onde ele vem.
import {
  CHARS, BESTIARY_DMG, BESTIARY_LOOT, BOOST_EXP, BOOST_LOOT, POWER_TIERS, WEEKEND_EXP, attackDmgMult, expForLevel,
  fmtPower, gearBonus, maxHp, maxRei, playerAtk, playerDef, powerTier, rebirthBonus, rebirthLevel, reiMult, setBonuses,
  xpWeekend, zanMult, type EquipSlot,
} from "../../shared/src";

/** Campos do Player sincronizado que a ficha lê. */
export interface SheetPlayer {
  charId: string; level: number; exp: number; form: number; rebirths: number; power: number; stepMs: number;
  hp: number; maxHp: number; rei: number; maxRei: number;
  zanjutsu: number; zanPct: number; reiryoku: number; reiPct: number;
}

/** Parte da mensagem "inv" (WorldRoom.sendInv) que a ficha lê. */
export interface SheetGear {
  atk: number; def: number;
  equip: Partial<Record<EquipSlot, string>>;
  forge?: Partial<Record<EquipSlot, number>>;
  expBoostUntil: number; lootBoostUntil: number;
}

export interface SheetRow { label: string; value: string; hint?: string }
export interface SheetSection { title: string; rows: SheetRow[] }

const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const mult = (n: number) => `×${num(n)}`;
const pct = (m: number) => `+${Math.round((m - 1) * 100)}%`;

export function characterSheet(p: SheetPlayer, gear: SheetGear | null, now: number): SheetSection[] {
  const ch = CHARS[p.charId];
  const form = ch.forms[p.form] ?? ch.forms[0];
  const rb = rebirthBonus(p.rebirths);
  const a = expForLevel(p.level), b = expForLevel(p.level + 1);
  const sections: SheetSection[] = [{
    title: "Personagem",
    rows: [
      { label: "Personagem", value: ch.name },
      { label: "Nível", value: String(p.level), hint: `XP ${Math.max(0, Math.round(((p.exp - a) / (b - a)) * 100))}% para o ${p.level + 1}` },
      { label: "Estágio", value: `${form.label} (${p.form + 1}/${ch.forms.length})` },
      { label: "Poder", value: `${fmtPower(p.power)} · ${POWER_TIERS[powerTier(p.power)].title}` },
    ],
  }];

  const attrs: SheetRow[] = [];
  const combat: SheetRow[] = [];
  const progress: SheetRow[] = [];
  if (!gear) {
    attrs.push({ label: "Equipamento", value: "carregando…" });
  } else {
    const g = gearBonus(gear.equip, gear.forge);
    const set = setBonuses(gear.equip).total;
    attrs.push(
      { label: "Vida", value: `${p.hp}/${p.maxHp}`, hint: `base ${maxHp(p.level)} + equipamento ${g.hp}${rb.hp !== 1 ? `, ${mult(rb.hp)} do renascimento` : ""}` },
      { label: "Reiatsu", value: `${Math.floor(p.rei)}/${p.maxRei}`, hint: `base ${maxRei(p.level)} + equipamento ${g.rei}` },
      { label: "Ataque", value: String(gear.atk), hint: `personagem e nível ${Math.round(playerAtk(ch.atk, p.level))} + equipamento, forja e conjuntos ${g.atk}` },
      { label: "Defesa", value: String(gear.def), hint: `personagem e nível ${Math.round(playerDef(ch.def, p.level))} + equipamento, forja e conjuntos ${g.def}` },
    );
    // mesma cadeia do WorldRoom.hit (shared/src/damage.ts): estágio × perícia × renascimento × conjuntos,
    // no golpe e nas técnicas (o bestiário vale por monstro)
    const src = { zanjutsu: p.zanjutsu, reiryoku: p.reiryoku, rebirths: p.rebirths, equip: gear.equip };
    const melee = attackDmgMult(form.dmgMult, src, false);
    const tech = attackDmgMult(form.dmgMult, src, true);
    combat.push(
      { label: "Dano corpo a corpo", value: mult(melee), hint: `estágio ${mult(form.dmgMult)} · Zanjutsu ${mult(zanMult(p.zanjutsu))} · renascimento ${mult(rb.dmg)} · conjuntos ${mult(set.dmg)}` },
      { label: "Dano das técnicas", value: mult(tech), hint: `estágio ${mult(form.dmgMult)} · Reiryoku ${mult(reiMult(p.reiryoku))} · renascimento ${mult(rb.dmg)} · conjuntos ${mult(set.dmg)}; cada técnica ainda multiplica pela própria força` },
    );
    // mesma conta do WorldRoom.monsterExp e do giveLoot (fora a invasão e a taxa do servidor)
    const exp = rb.exp * set.exp * (gear.expBoostUntil > now ? BOOST_EXP : 1) * (xpWeekend(now) ? WEEKEND_EXP : 1);
    const loot = set.loot * (gear.lootBoostUntil > now ? BOOST_LOOT : 1);
    progress.push(
      { label: "XP dos monstros", value: pct(exp), hint: [
        `renascimento ${mult(rb.exp)}`, `conjuntos ${mult(set.exp)}`,
        gear.expBoostUntil > now ? `pergaminho ${mult(BOOST_EXP)}` : "", xpWeekend(now) ? `fim de semana ${mult(WEEKEND_EXP)}` : "",
      ].filter(Boolean).join(" · ") },
      { label: "Chance de loot", value: pct(loot), hint: [`conjuntos ${mult(set.loot)}`, gear.lootBoostUntil > now ? `incenso ${mult(BOOST_LOOT)}` : "", `bestiário completo: ${mult(BESTIARY_LOOT)} contra aquele monstro`].filter(Boolean).join(" · ") },
    );
  }
  combat.push(
    { label: "Zanjutsu", value: `${p.zanjutsu} (${p.zanPct}% para o ${p.zanjutsu + 1})`, hint: `${pct(zanMult(1))} de dano corpo a corpo por nível; sobe acertando golpes` },
    { label: "Reiryoku", value: `${p.reiryoku} (${p.reiPct}% para o ${p.reiryoku + 1})`, hint: `${pct(reiMult(1))} de dano das técnicas por nível; sobe gastando reiatsu` },
    { label: "Golpe", value: `a cada ${num(form.attackMs / 1000)} s`, hint: "intervalo do ataque corpo a corpo no estágio atual" },
    { label: "Passo", value: `${p.stepMs} ms por passo`, hint: "quanto menor, mais rápido; lentidão aumenta" },
    { label: "Bestiário", value: `${pct(1 + BESTIARY_DMG)} de dano por estágio`, hint: "contra cada tipo de monstro; veja no Livro" },
  );
  progress.push({
    label: "Renascimentos",
    value: `${p.rebirths}: ${pct(rb.exp)} de XP, ${pct(rb.dmg)} de dano, ${pct(rb.hp)} de vida`,
    hint: `próximo no nível ${rebirthLevel(p.rebirths)}`,
  });
  sections.push({ title: "Atributos", rows: attrs }, { title: "Combate", rows: combat }, { title: "Progresso", rows: progress });
  return sections;
}
