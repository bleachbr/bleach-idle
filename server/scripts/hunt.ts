// Auto Venda do loot, analisador de caçada e aviso de recompensa diária pendente.
import { expForLevel, nearestWalkable, countItem, dailyMissions, dayKey, BOOST_MAX_MS } from "../../shared/src";
import { HOME } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

const pos = nearestWalkable(HOME, 24, 4);
// inventário cheio de equipamento: todo loot que cair sobra
const full = Array.from({ length: 20 }, () => ({ id: "bandana", qty: 1 }));
let ready: boolean | undefined;
const room = await play("Caca Ana", "ichigo", (id) => patchSave(id, {
  level: 14, exp: expForLevel(14), hp: 9999, rei: 9999, gold: 0, map: "karakura", ...pos, inv: full, autoSell: false,
  // bônus de loot ligado: com a bateria toda rodando junto os abates são lentos, e sem loot o teste falhava por azar
  lootBoostUntil: Date.now() + BOOST_MAX_MS,
  prog: { bestiary: {}, ach: ["k100", "lv15", "st5"], daily: { last: "", streak: 0 }, kills: 0, bossKills: 0 },
}), (r) => r.onMessage("dailyReady", (m) => (ready = m.ready)));
let book: any, inv: any;
const logs: string[] = [];
room.onMessage("book", (m) => (book = m));
room.onMessage("inv", (m) => (inv = m));
room.onMessage("log", (m) => logs.push(m.text));
await sleep(400);
ok("ao entrar, avisa que a recompensa diária está esperando", ready === true);

room.send("auto", { autoSell: true });
await sleep(150);
ok("Auto Venda liga e aparece no estado", room.state.players.get("caca ana").autoSell === true);
room.send("travel", { dest: "leste" });
await sleep(400);
room.send("auto", { autoHunt: true, autoHeal: 40 });
for (let i = 0; i < 300 && !logs.some((l) => l.includes("(vendido)")); i++) await sleep(500);
room.send("auto", { autoHunt: false });
await sleep(300);
ok("com o inventário cheio, o loot puro vira kan na hora", logs.some((l) => l.includes("(vendido)")));
ok("e não cria sacola no chão", !logs.some((l) => l.includes("sacola no chão")));

room.send("book");
await sleep(300);
const h = book.hunt;
ok(`analisador conta abates, XP e kan (${h.kills} abates, ${h.exp} XP, ${h.gold} kan)`, h.kills > 0 && h.exp > 0 && h.gold > 0 && h.items.length > 0);
room.send("huntReset");
await sleep(300);
ok("zerar a contagem", book.hunt.kills === 0 && book.hunt.exp === 0 && book.hunt.items.length === 0);

room.send("daily");
await sleep(300);
ok("depois de pegar a diária o aviso some", ready === false);

await room.leave();

// missões diárias: sorteio estável no dia, de acordo com o nível
const d1 = dailyMissions("x", "2026-10-28", 10), d2 = dailyMissions("x", "2026-10-28", 10), d3 = dailyMissions("x", "2026-10-29", 10);
ok("missões do dia são as mesmas o dia todo e mudam no dia seguinte", JSON.stringify(d1) === JSON.stringify(d2) && JSON.stringify(d1) !== JSON.stringify(d3));
ok("nível 10 caça monstros fracos e não ganha missão de chefe", ["hollow_menor", "hollow_rastejante"].includes(d1[0].target!) && !d1.some((m) => m.kind === "boss"));
ok("nível 40 caça monstros fortes", ["arrancar", "adjuchas"].includes(dailyMissions("y", "2026-10-28", 40)[0].target!));

// três missões fáceis: um Hollow Menor completa todas e paga a caixa
const today = dayKey(Date.now());
let binv: any;
const blogs: string[] = [];
const b = await play("Caca Beto", "ichigo", (id) => patchSave(id, {
  level: 14, exp: expForLevel(14), hp: 9999, rei: 9999, gold: 0, map: "karakura", ...pos, inv: [],
  prog: { bestiary: {}, ach: [], daily: { last: today, streak: 1 }, kills: 0, bossKills: 0, dm: { day: today, bonus: false, list: [
    { kind: "kill", target: "hollow_menor", need: 1, have: 0, done: false },
    { kind: "any", need: 1, have: 0, done: false },
    { kind: "gold", need: 1, have: 0, done: false },
  ] } },
}), (r) => { r.onMessage("inv", (m) => (binv = m)); r.onMessage("log", (m) => blogs.push(m.text)); });
await sleep(300);
b.send("travel", { dest: "leste" });
await sleep(400);
b.send("auto", { autoHunt: true, autoHeal: 40 });
for (let i = 0; i < 120 && !blogs.some((l) => l.startsWith("Todas as missões diárias")); i++) await sleep(500);
b.send("auto", { autoHunt: false });
await sleep(300);
ok(`as três missões pagam (${blogs.filter((l) => l.startsWith("Missão diária completa")).length} de 3)`, blogs.filter((l) => l.startsWith("Missão diária completa")).length === 3);
ok("completar as três dá a Caixa do Kisuke", countItem(binv.inv, "caixa_kisuke") === 1);
await b.leave();
done();
