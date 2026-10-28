// Las Noches: viagem exige nível 45 e 400 kan; o palácio tem os monstros novos e o chefe.
import { expForLevel, nearestWalkable } from "../../shared/src";
import { HOME, MAPS } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

const gate = HOME.gate!;
const nearGate = nearestWalkable(HOME, gate.x, gate.y + 1);
async function bot(name: string, level: number) {
  const logs: string[] = [];
  const room = await play(name, "ichigo", (id) => patchSave(id, {
    level, exp: expForLevel(level), hp: 9999, rei: 9999, gold: 1000, map: "karakura", ...nearGate,
  }), (r) => r.onMessage("log", (m) => logs.push(m.text)));
  await sleep(300);
  return { room, logs, me: () => room.state.players.get(name.toLowerCase()) };
}

const kinds = new Set(MAPS.lasnoches.spawns.map((s) => s.kind));
ok("Las Noches tem Arrancar Números, Exequias, Fracción e o Privaron Espada", ["arrancar_numeros", "exequias", "fraccion", "privaron"].every((k) => kinds.has(k)));

const fraco = await bot("Noches Fraco", 40);
fraco.room.send("travel", { dest: "lasnoches" });
await sleep(400);
ok("nível 40 não entra", fraco.me().map === "karakura");

const forte = await bot("Noches Forte", 50);
forte.room.send("travel", { dest: "lasnoches" });
await sleep(600);
const a = MAPS.lasnoches.arrivals.lasnoches;
ok(`nível 50 chega no saguão (${forte.me().map} ${forte.me().x},${forte.me().y})`, forte.me().map === "lasnoches" && forte.me().x === a.x && forte.me().y === a.y);
const seen = [...forte.room.state.monsters.values()].filter((m: any) => m.map === "lasnoches").map((m: any) => m.kind);
ok(`monstros do palácio no estado (${new Set(seen).size} tipos)`, new Set(seen).size === 4);

for (const x of [fraco, forte]) await x.room.leave();
done();
