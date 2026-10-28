// Forja do Kisuke (nível por espaço), Pergaminho de Treino, Caixa do Kisuke e escolha da poção.
import { nearestWalkable, countItem, forgeBonus, forgeCost, equipBonus, gearBonus, setBonuses, BOOST_MS } from "../../shared/src";
import { HOME } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

ok("forja: arma +2 atq, anel +10 vida, resto +1 def por nível", forgeBonus("weapon", 3).atk === 6 && forgeBonus("ring", 2).hp === 20 && forgeBonus("boots", 4).def === 4);
ok("custo cresce: +0→+1 1 pedra/200 kan, +4→+5 5 pedras/5000 kan", forgeCost(0).stones === 1 && forgeCost(0).gold === 200 && forgeCost(4).gold === 5000);
ok("forja só vale com item no espaço", equipBonus({}, { weapon: 5 }).atk === 0 && equipBonus({ weapon: "zanpakuto" }, { weapon: 5 }).atk === 14);
const kit = { head: "bandana", armor: "shihakusho", legs: "hakama", boots: "waraji" } as const;
const sh = setBonuses(kit);
ok("Uniforme Shinigami completo: +4 de defesa e +5% de XP", sh.total.def === 4 && Math.abs(sh.total.exp - 1.05) < 1e-9 && sh.active[0].have === 4);
ok("a defesa do conjunto entra no total do equipamento", gearBonus(kit).def === 2 + 5 + 3 + 1 + 4 && equipBonus(kit).def === 2 + 5 + 3 + 1);
ok("2 de 3 peças do Traje de Capitão: só o 1º estágio (+40 de vida)", setBonuses({ armor: "haori", legs: "hakama_capitao" }).total.hp === 40 && setBonuses({ armor: "haori", legs: "hakama_capitao" }).total.dmg === 1);

const shop = HOME.shop!;
const nearShop = nearestWalkable(HOME, shop.x - 1, shop.y + 1);
const slots = (list: { id: string; qty: number }[]) => Array.from({ length: 20 }, (_, i) => list[i] ?? null);

async function bot(name: string, extra: Record<string, unknown>) {
  const room = await play(name, "ichigo", (id) => patchSave(id, { level: 20, map: "karakura", ...nearShop, gold: 100000, ...extra }));
  let inv: any;
  const logs: string[] = [];
  room.onMessage("inv", (m) => (inv = m));
  room.onMessage("log", (m) => logs.push(m.text));
  await sleep(300);
  return { room, logs, inv: () => inv, me: () => room.state.players.get(name.toLowerCase()) };
}

const a = await bot("Forja Ana", {
  equip: { weapon: "zanpakuto" }, forge: {},
  inv: slots([{ id: "pedra_reishi", qty: 50 }, { id: "pergaminho_xp", qty: 7 }, { id: "caixa_kisuke", qty: 1 }]),
});
const atk0 = a.inv().atk;
a.room.send("forge", { slot: "weapon" });
await sleep(300);
ok(`+0→+1 sempre dá certo: ataque ${atk0} → ${a.inv().atk}`, a.inv().forge.weapon === 1 && a.inv().atk === atk0 + 2);
ok("gastou 1 pedra e 200 kan", countItem(a.inv().inv, "pedra_reishi") === 49 && a.inv().gold === 100000 - 200);
for (let i = 0; i < 12; i++) { a.room.send("forge", { slot: "head" }); await sleep(120); }
ok(`forja de outro espaço é independente (cabeça +${a.inv().forge.head}, arma +${a.inv().forge.weapon})`, a.inv().forge.head >= 1 && a.inv().forge.weapon === 1);
a.room.send("forge", { slot: "nada" });
await sleep(150);

// longe do Kisuke não forja
const far = nearestWalkable(HOME, nearShop.x + 6, nearShop.y + 2);
a.room.send("move", far);
for (let i = 0; i < 30 && (a.me().x !== far.x || a.me().y !== far.y); i++) await sleep(200);
const lv = a.inv().forge.weapon;
a.room.send("forge", { slot: "weapon" });
await sleep(300);
ok("longe do Kisuke a forja recusa", a.inv().forge.weapon === lv && a.logs.some((l) => l.includes("A forja fica no Kisuke")));

// pergaminho: 1 h por uso, até 6 h
const idx = (id: string) => a.inv().inv.findIndex((s: any) => s?.id === id);
a.room.send("useItem", { index: idx("pergaminho_xp") });
await sleep(300);
const left = a.inv().expBoostUntil - Date.now();
ok(`pergaminho dá 1 h de bônus de XP (${Math.round(left / 60000)} min)`, left > BOOST_MS - 60_000 && left <= BOOST_MS);
for (let i = 0; i < 6; i++) { a.room.send("useItem", { index: idx("pergaminho_xp") }); await sleep(150); }
ok("bônus soma até 6 h e o 7º pergaminho é recusado", countItem(a.inv().inv, "pergaminho_xp") === 1 && a.logs.some((l) => l.includes("máximo de 6 h")));

// caixa: some e vira um prêmio
const before = a.inv().inv.filter(Boolean).length;
a.room.send("useItem", { index: idx("caixa_kisuke") });
await sleep(300);
ok("caixa abre e dá um prêmio", countItem(a.inv().inv, "caixa_kisuke") === 0 && a.logs.some((l) => l.startsWith("Caixa do Kisuke:")) && a.inv().inv.filter(Boolean).length >= before - 1);

// sem pedras
const b = await bot("Forja Beto", { equip: { weapon: "zanpakuto" }, forge: {}, inv: slots([]) });
b.room.send("forge", { slot: "weapon" });
await sleep(300);
ok("sem pedras a forja recusa", !b.inv().forge.weapon && b.logs.some((l) => l.includes("Pedras de Reishi")));

// atalho de cura: com pouca vida usa a poção grande; com pouca falta, o onigiri
const c = await bot("Forja Caio", { hp: 20, inv: slots([{ id: "onigiri", qty: 5 }, { id: "pocao_grande", qty: 5 }]) });
c.room.send("skill", { slot: 2 });
await sleep(300);
ok("muita vida faltando: usa a Poção Grande", countItem(c.inv().inv, "pocao_grande") === 4 && countItem(c.inv().inv, "onigiri") === 5);
for (let i = 0; i < 40 && c.me().hp < c.me().maxHp * 0.9; i++) await sleep(250);
await sleep(1200);
c.room.send("skill", { slot: 2 });
await sleep(300);
ok("pouca vida faltando: usa o Onigiri", countItem(c.inv().inv, "onigiri") === 4);

for (const x of [a, b, c]) await x.room.leave();
done();
