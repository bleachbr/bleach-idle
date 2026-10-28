// Visual por equipamento: o campo "look" acompanha haori e máscara (todos veem).
// Com um número de ms como argumento, os bots ficam na praça esse tempo para ver no navegador.
import { play, patchSave, sleep, ok, done } from "./lib";

const looks: [string, string, Record<string, string>, string][] = [
  ["Visual Haori", "ichigo", { armor: "haori" }, "haori"],
  ["Visual Mascara", "rukia", { head: "mascara" }, "mask"],
  ["Visual Ambos", "renji", { armor: "haori", head: "mascara" }, "haori_mask"],
];
const rooms = [];
for (const [i, [name, charId, equip]] of looks.entries())
  rooms.push(await play(name, charId, (id) => patchSave(id, { map: "karakura", x: 15 + i, y: 16, inv: [], equip: { ...equip, legs: "hakama" } })));
await sleep(500);
for (const [name, , , want] of looks) ok(`${name}: look = "${want}"`, rooms[0].state.players.get(name.toLowerCase())?.look === want);
rooms[2].send("unequip", { slot: "head" });
await sleep(400);
ok('tirar a máscara volta o look para "haori"', rooms[0].state.players.get("visual ambos")?.look === "haori");
await sleep(Number(process.argv[2] ?? 0));
for (const r of rooms) await r.leave();
done();
