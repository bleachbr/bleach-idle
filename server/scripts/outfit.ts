// Bots parados na praça com cada visual (para conferir no navegador) e checagem do campo look.
import { play, patchSave, sleep } from "./lib";

const looks: [string, string, Record<string, string>][] = [
  ["Visual Haori", "ichigo", { armor: "haori" }],
  ["Visual Mascara", "rukia", { head: "mascara" }],
  ["Visual Ambos", "renji", { armor: "haori", head: "mascara" }],
];
const rooms = [];
for (const [i, [name, charId, equip]] of looks.entries()) {
  const room = await play(name, charId, (id) => patchSave(id, { x: 15 + i, y: 16, equip: { ...equip, legs: "hakama" } }));
  rooms.push(room);
}
await sleep(500);
for (const [name] of looks) console.log(name, "look =", JSON.stringify(rooms[0].state.players.get(name.toLowerCase())?.look));
// desequipa a máscara do terceiro e confere que o look volta para "haori"
rooms[2].send("unequip", { slot: "head" });
await sleep(400);
console.log("Visual Ambos sem máscara: look =", JSON.stringify(rooms[0].state.players.get("visual ambos")?.look));
await sleep(Number(process.argv[2] ?? 1000));
for (const r of rooms) await r.leave();
process.exit(0);
