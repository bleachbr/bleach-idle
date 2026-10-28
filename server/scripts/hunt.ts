// Auto Venda do loot, analisador de caçada e aviso de recompensa diária pendente.
import { expForLevel, nearestWalkable } from "../../shared/src";
import { HOME } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

const pos = nearestWalkable(HOME, 24, 4);
// inventário cheio de equipamento: todo loot que cair sobra
const full = Array.from({ length: 20 }, () => ({ id: "bandana", qty: 1 }));
let ready: boolean | undefined;
const room = await play("Caca Ana", "ichigo", (id) => patchSave(id, {
  level: 14, exp: expForLevel(14), hp: 9999, rei: 9999, gold: 0, map: "karakura", ...pos, inv: full, autoSell: false,
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
for (let i = 0; i < 160 && !logs.some((l) => l.includes("(vendido)")); i++) await sleep(500);
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
done();
