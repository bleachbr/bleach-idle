// Corpos e sacolas no chão: o que se perde na morte e o loot que não coube no inventário.
import { expForLevel, nearestWalkable, INV_SIZE } from "../../shared/src";
import { HOME } from "../src/maps";
import { play, patchSave, sleep, once, ok, done } from "./lib";

const street = nearestWalkable(HOME, 24, 4);
const fullOf = (id: string, qty = 1) => Array.from({ length: INV_SIZE }, () => ({ id, qty }));

async function bot(name: string, fields: Record<string, unknown>) {
  const room = await play(name, "ichigo", (id) => patchSave(id, { map: "karakura", hp: 9999, rei: 9999, ...fields }));
  const logs: string[] = [];
  room.onMessage("log", (m) => logs.push(m.text));
  let inv: any;
  room.onMessage("inv", (m) => (inv = m));
  await sleep(300);
  return { room, logs, inv: () => inv, me: () => room.state.players.get(name.toLowerCase()) };
}

// PvP: a vítima perde 10% do dinheiro (e talvez itens) no corpo; quem matou tem prioridade
const victimPos = nearestWalkable(HOME, street.x + 1, street.y);
const v = await bot("Saco Vitima", { level: 15, exp: expForLevel(15), hp: 30, gold: 1000, inv: fullOf("garra", 5), equip: {}, ...victimPos });
const k = await bot("Saco Algoz", { level: 40, exp: expForLevel(40), gold: 0, ...street });
const o = await bot("Saco Outro", { level: 15, exp: expForLevel(15), gold: 0, ...nearestWalkable(HOME, victimPos.x + 1, victimPos.y) });
k.room.send("target", { id: "saco vitima" });
for (let i = 0; i < 60 && v.me().x === victimPos.x && v.me().y === victimPos.y; i++) await sleep(250);
await sleep(400);
const corpse = [...k.room.state.bags.values()].find((b: any) => b.label === "Corpo de Saco Vitima");
ok("a morte deixa o corpo no lugar onde caiu", !!corpse && corpse.x === victimPos.x && corpse.y === victimPos.y);
o.room.send("bagTake", { id: corpse?.id });
await sleep(300);
ok("outro jogador não pega durante a prioridade de quem matou", o.logs.some((l) => l.includes("reservado")));
const bagMsg = once<any>(k.room, "bag");
k.room.send("bagOpen", { id: corpse?.id });
const content = await bagMsg;
ok(`o corpo tem os 100 kan perdidos (${content.gold} kan, ${content.items.length} itens)`, content.gold === 100);
k.room.send("bagTake", { id: corpse?.id });
await sleep(400);
ok("quem matou pega tudo e o corpo some", k.inv().gold === 100 && !k.room.state.bags.has(corpse?.id));

// sacola: loot que não cabe no inventário cheio
const huntAt = nearestWalkable(HOME, 38, 7);
const h = await bot("Saco Cheio", { level: 20, exp: expForLevel(20), gold: 0, inv: fullOf("bandana"), equip: {}, ...huntAt });
h.room.send("auto", { autoHunt: true });
let sack: any;
for (let i = 0; i < 120 && !sack; i++) {
  await sleep(500);
  sack = [...h.room.state.bags.values()].find((b: any) => b.kind === "sacola");
}
h.room.send("auto", { autoHunt: false });
ok("loot que não coube vira sacola no chão", !!sack && h.logs.some((l) => l.includes("sacola no chão")));

for (const x of [v, k, o, h]) await x.room.leave();
done();
