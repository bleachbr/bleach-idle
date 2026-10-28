// Teste de itens: kit inicial, loja, depot, loot da hunt e venda do loot.
import { play, patchSave } from "./lib";
import { TEMPLE } from "../src/maps";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const name = process.argv[2] ?? "Teste Loja";
const room = await play(name, "ichigo", (id) => patchSave(id, { map: "karakura", x: TEMPLE.x, y: TEMPLE.y + 1, hp: 9999 }));
let inv: any = null;
const opened: string[] = [];
room.onMessage("*", () => {});
room.onMessage("inv", (m) => (inv = m));
room.onMessage("open", (m) => opened.push(m.kind));
room.onMessage("log", (m) => { if (!m.text.startsWith("Loot") && !m.text.includes("derrotado")) console.log("  log:", m.text); });
const summary = () => ({ gold: inv.gold, atk: inv.atk, def: inv.def, equip: inv.equip, inv: inv.inv.filter(Boolean).map((s: any) => `${s.id}x${s.qty}`).join(" ") });

await sleep(600);
console.log("kit:", summary());
room.send("interact", { kind: "shop" });
await sleep(2500);
console.log("abriu:", opened);
room.send("buy", { id: "zanpakuto", qty: 1 }); // 400 > 150: deve recusar
room.send("buy", { id: "pocao_vida", qty: 2 });
await sleep(400);
console.log("após compras:", summary());

room.send("interact", { kind: "depot" });
await sleep(2500);
const i = inv.inv.findIndex((s: any) => s?.id === "pocao_rei");
room.send("depot", { op: "put", index: i });
await sleep(300);
console.log("depot após guardar:", inv.depot.filter(Boolean), "| inv tem pocao_rei?", inv.inv.some((s: any) => s?.id === "pocao_rei"));
room.send("depot", { op: "take", index: 0 });
await sleep(300);
console.log("pegou de volta?", inv.inv.some((s: any) => s?.id === "pocao_rei"));

const g0 = inv.gold;
room.send("auto", { autoHunt: true, autoHeal: 50 });
await sleep(25000);
room.send("auto", { autoHunt: false });
console.log(`hunt 25s: +${inv.gold - g0} kan, inv:`, summary().inv);
// volta à praça por "voltar à cidade", tentando até sair de combate
const me = () => room.state.players.get(name.toLowerCase());
for (let i = 0; i < 12 && !(me().x === TEMPLE.x && me().y === TEMPLE.y); i++) {
  room.send("recall");
  await sleep(2500);
}
room.send("interact", { kind: "shop" });
await sleep(3000);
console.log("abriu loja de novo:", opened.at(-1));
room.send("sellLoot");
await sleep(400);
console.log("após vender loot:", summary());
await room.leave();
process.exit(0);
