// Auto Helper ampliado: lugar de caça, repor poções, voltar a caçar depois de morrer, Bankai automático,
// viagem de qualquer lugar.
import { expForLevel, nearestWalkable, countItem, chebyshev } from "../../shared/src";
import { HOME, TEMPLE } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

async function bot(name: string, fields: Record<string, unknown>) {
  const logs: string[] = [];
  let inv: any;
  const room = await play(name, "ichigo", (id) => patchSave(id, { map: "karakura", x: TEMPLE.x, y: TEMPLE.y, ...fields }),
    (r) => { r.onMessage("log", (m) => logs.push(m.text)); r.onMessage("inv", (m) => (inv = m)); });
  await sleep(300);
  return { room, logs, inv: () => inv, me: () => room.state.players.get(name.toLowerCase()) };
}

// lugar de caça: da praça, o Auto Helper viaja sozinho até a Floresta Leste
const a = await bot("Ajudante Ana", { level: 14, exp: expForLevel(14), gold: 500, hp: 9999 });
a.room.send("auto", { autoHunt: true, huntSpot: "leste", autoHeal: 40 });
for (let i = 0; i < 30 && !a.logs.some((l) => l.includes("indo caçar em Floresta Leste")); i++) await sleep(250);
const leste = HOME.arrivals.leste;
ok("com lugar de caça, viaja sozinho até lá", a.logs.some((l) => l.includes("indo caçar em Floresta Leste")) && chebyshev(a.me().x, a.me().y, leste.x, leste.y) <= 30);
ok("e o lugar fica salvo no estado", a.me().huntSpot === "leste");
a.room.send("auto", { huntSpot: "nao-existe" });
await sleep(200);
ok("destino inválido é ignorado", a.me().huntSpot === "leste");
a.room.send("auto", { autoHunt: false });
await a.room.leave();

// repor poções: sem nenhuma, compra 20 de cura e 10 de reiatsu (de qualquer lugar)
const b = await bot("Ajudante Beto", { level: 14, exp: expForLevel(14), gold: 5000, inv: [] }); // na praça: fora de combate
b.room.send("auto", { autoRestock: true });
for (let i = 0; i < 20 && !b.logs.some((l) => l.includes("Auto Helper: comprou")); i++) await sleep(250);
ok(`repõe poções sozinho (${countItem(b.inv().inv, "pocao_vida")} de cura, ${countItem(b.inv().inv, "pocao_rei")} de reiatsu)`,
  countItem(b.inv().inv, "pocao_vida") === 20 && countItem(b.inv().inv, "pocao_rei") === 10 && b.inv().gold === 5000 - 20 * 50 - 10 * 60);
// viagem de qualquer lugar
b.room.send("travel", { dest: "rio" });
await sleep(400);
ok(`viaja sem estar no portal (${b.logs.at(-1)})`, b.logs.some((l) => l.startsWith("Viajou para Além do Rio")));
await b.room.leave();

// voltar a caçar depois de morrer (com 5 de vida ao lado dos Fishbones)
const spot = [[45, 39], [44, 40], [46, 40], [43, 41]].map(([x, y]) => nearestWalkable(HOME, x, y))[0];
// já entra com a automação ligada: com 5 de vida ele morre antes de um pedido "auto" chegar
const c = await bot("Ajudante Caio", { level: 16, exp: expForLevel(16), hp: 5, gold: 0, inv: [], equip: {}, ...spot, autoHunt: true, autoReturn: true });
for (let i = 0; i < 60 && !c.logs.some((l) => l.includes("foi morto")); i++) await sleep(250);
ok(`depois de morrer, o Auto Hunt continua ligado (${c.logs.slice(-2).join(" | ")})`, c.logs.some((l) => l.includes("volta à caça")) && c.me().autoHunt === true);
c.room.send("auto", { autoHunt: false, autoReturn: false });
await c.room.leave();

// Bankai automático em combate (nível 20, com reiatsu cheio)
const d = await bot("Ajudante Davi", { level: 20, exp: expForLevel(20), hp: 9999, rei: 9999, ...nearestWalkable(HOME, 38, 8) });
d.room.send("auto", { autoHunt: true, autoBankai: true, autoHeal: 40 });
let released = false;
for (let i = 0; i < 80 && !released; i++) { await sleep(250); released = d.me().form === 1; }
ok("Bankai automático em combate", released);
d.room.send("auto", { autoHunt: false, autoBankai: false });
await d.room.leave();
done();
