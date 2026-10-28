// Desafio do Dangai: andares com monstros só do dono, recorde, próximo andar automático e escala sem fim.
import { expForLevel, nearestWalkable, dangaiFloor, dangaiStart, dangaiReward } from "../../shared/src";
import { HOME } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

const f10 = dangaiFloor(10), f22 = dangaiFloor(22), f40 = dangaiFloor(40);
ok("andar 10 é de chefe; depois do topo a força cresce 12% por andar", f10.count === 1 && f22.power === 1 && Math.abs(f40.power - 1.12 ** 12) < 1e-9);
ok("recomeça 4 andares abaixo do recorde", dangaiStart(0) === 1 && dangaiStart(30) === 26);
ok("recorde paga em dobro e dá caixa a cada 5 andares", dangaiReward(5, true).gold === 400 && dangaiReward(5, true).items!.some((i) => i.id === "caixa_kisuke") && dangaiReward(5, false).gold === 200);

const gate = HOME.gate!;
const nearGate = nearestWalkable(HOME, gate.x, gate.y + 1);
async function bot(name: string, level: number) {
  const logs: string[] = [];
  let dg: any = null;
  const room = await play(name, "ichigo", (id) => patchSave(id, { level, exp: expForLevel(level), hp: 9999, rei: 9999, gold: 0, map: "karakura", ...nearGate, inv: [] }),
    (r) => { r.onMessage("log", (m) => logs.push(m.text)); r.onMessage("dangai", (m) => (dg = m)); });
  await sleep(300);
  room.send("travel", { dest: "dangai" });
  await sleep(500);
  return { room, logs, dg: () => dg, me: () => room.state.players.get(name.toLowerCase()) };
}

const a = await bot("Dangai Ana", 60);
const b = await bot("Dangai Beto", 60);
ok("chega ao Dangai", a.me().map === "dangai" && b.me().map === "dangai");
a.room.send("dangaiStart");
await sleep(400);
const mine = [...a.room.state.monsters.values()].filter((m: any) => m.map === "dangai");
ok(`andar 1 com ${mine.length} monstros`, a.dg()?.floor === 1 && mine.length === a.dg().left && mine.length >= 3);
b.room.send("target", { id: mine[0].id });
await sleep(200);
ok("outro jogador não consegue atacar os monstros do desafio", b.me().targetId === "" && b.logs.some((l) => l.includes("desafio de outra pessoa")));

a.room.send("auto", { autoHunt: true, autoHeal: 40 });
for (let i = 0; i < 120 && !(a.dg()?.floor >= 2); i++) await sleep(500);
ok(`andar 1 limpo vira recorde e paga (${a.logs.find((l) => l.startsWith("Andar 1 limpo")) ?? "nada"})`, a.logs.some((l) => l.startsWith("Andar 1 limpo (recorde!)")) && a.dg().best >= 1);
ok("com Auto Hunt o próximo andar começa sozinho", a.dg()?.floor === 2);
a.room.send("dangaiStop");
await sleep(400);
ok("desistir tira os monstros e desliga o Auto Hunt", ![...a.room.state.monsters.values()].some((m: any) => m.map === "dangai") && !a.me().autoHunt && a.dg().floor === 0);

for (const x of [a, b]) await x.room.leave();
done();
