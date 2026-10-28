// Confere que o total de monstros por mapa nunca passa do definido nos spawns do Tiled,
// com dois bots caçando (Auto Hunt usa habilidade + corpo a corpo no mesmo alvo).
import { expForLevel, nearestWalkable } from "../../shared/src";
import { HOME, SPAWNS } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

const expected: Record<string, number> = {};
for (const s of SPAWNS) expected[s.map] = (expected[s.map] ?? 0) + s.count;
const at = nearestWalkable(HOME, 38, 7);
const bots = [];
for (const name of ["Contagem Um", "Contagem Dois"]) {
  const r = await play(name, "ichigo", (id) => patchSave(id, { level: 20, exp: expForLevel(20), hp: 9999, rei: 9999, ...at }));
  r.send("auto", { autoHunt: true, autoHeal: 50 });
  bots.push(r);
}
const max: Record<string, number> = {};
for (let i = 0; i < 40; i++) {
  await sleep(1000);
  const c: Record<string, number> = {};
  for (const m of bots[0].state.monsters.values()) c[m.map] = (c[m.map] ?? 0) + 1;
  for (const k in c) max[k] = Math.max(max[k] ?? 0, c[k]);
}
console.log("esperado:", expected, "| máximo visto em 40 s:", max);
ok("total de monstros nunca passa o dos spawns", Object.keys(expected).every((k) => (max[k] ?? 0) <= expected[k]));
for (const r of bots) { r.send("auto", { autoHunt: false }); await r.leave(); }
done();
