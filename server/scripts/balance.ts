// Simulação de balanceamento (não precisa de servidor): para cada nível, o melhor monstro para caçar
// com Auto Hunt, o XP por hora, o tempo até o próximo nível e quanto de vida se perde por abate.
// Uso: cd server && npx tsx scripts/balance.ts [personagem] [nível máximo]   (EXP_RATE=0.3 simula outra taxa)
// Considera Shikai, corpo a corpo + habilidade quando há reiatsu, equipamento inicial, sem forja,
// sem bônus de bestiário/treino, 3 s de deslocamento entre um abate e outro e caçando sozinho
// (o renascimento limita: um spawn de 4 monstros com 20 s de renascimento rende no máximo ~720 abates/h).
import { CHARS, MONSTERS, expForLevel, maxHp, maxRei, playerAtk, playerDef, equipBonus, START_KIT } from "../../shared/src";
import { SPAWNS } from "../src/maps";

const charId = process.argv[2] ?? "ichigo";
const top = Number(process.argv[3] ?? 60);
const ch = CHARS[charId];
const kinds = Object.values(MONSTERS).filter((m) => !m.dummy);
const WALK_S = 3;
const avgDmg = (atk: number, mult: number, def: number) => Math.max(1, (atk * mult * 50) / (50 + def));

function hunt(level: number, kind: string) {
  const m = MONSTERS[kind];
  const eq = equipBonus(START_KIT.equip);
  const atk = playerAtk(ch.atk, level) + eq.atk;
  const def = playerDef(ch.def, level) + eq.def;
  const form = ch.forms[0];
  // dano por segundo: golpe a cada attackMs + habilidade quando o reiatsu regenera (6%/s parado, 2%/s em luta)
  const melee = avgDmg(atk, form.dmgMult, m.def) / (form.attackMs / 1000);
  const reiPerS = (maxRei(level) + eq.rei) * 0.02;
  const skillsPerS = Math.min(1 / (ch.skill.cdMs / 1000), reiPerS / ch.skill.cost);
  const dps = melee + skillsPerS * avgDmg(atk, ch.skill.mult, m.def);
  const ttk = m.hp / dps;
  const taken = (avgDmg(m.atk, 1, def) / (m.attackMs / 1000)) * ttk;
  const hp = maxHp(level) + eq.hp;
  // vida volta a 1%/s em luta e 4%/s fora: o tempo de recuperação entra no ciclo
  const rest = Math.max(0, taken - hp * 0.01 * ttk) / (hp * 0.04);
  const cycle = ttk + WALK_S + rest;
  const alive = SPAWNS.filter((sp) => sp.kind === kind).reduce((n, sp) => n + sp.count, 0);
  const killsH = Math.min(3600 / cycle, (alive * 3600) / (m.respawnMs / 1000 + ttk));
  return { kind, ttk, taken, risk: taken / hp, expH: m.exp * (Number(process.env.EXP_RATE) || 1) * killsH };
}

console.log(`Personagem: ${ch.name} (Shikai, equipamento inicial)\n`);
console.log("nível | melhor caça (seguro)        | XP/h      | horas p/ subir | vida por abate | horas acumuladas");
let total = 0, prev = 8;
for (let level = 8; level <= top; level += level < 20 ? 2 : 5) {
  // "seguro": um abate custa no máximo 60% da vida
  const options = kinds.map((k) => hunt(level, k.id)).filter((h) => h.risk <= 0.6).sort((a, b) => b.expH - a.expH);
  const best = options[0];
  if (!best) { console.log(`${String(level).padStart(5)} | nada seguro`); continue; }
  const need = expForLevel(level + 1) - expForLevel(level);
  // horas acumuladas: do nível anterior da tabela até este, usando a taxa deste nível
  total += (expForLevel(level) - expForLevel(prev)) / best.expH;
  prev = level;
  console.log(`${String(level).padStart(5)} | ${MONSTERS[best.kind].name.padEnd(27)} | ${Math.round(best.expH).toLocaleString("pt-BR").padStart(9)} | ${(need / best.expH).toFixed(2).padStart(14)} | ${`${Math.round(best.risk * 100)}%`.padStart(14)} | ${total.toFixed(1)}`);
}
