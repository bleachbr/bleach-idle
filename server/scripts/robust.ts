// Robustez: payloads malformados em todas as mensagens e rajada de mensagens não podem
// derrubar o servidor nem deixá-lo sem responder.
import { expForLevel } from "../../shared/src";
import { TEMPLE } from "../src/maps";
import { play, openLobby, patchSave, sleep, once, ok, done } from "./lib";

const TYPES = [
  "move", "step", "target", "nextTarget", "skill", "transform", "auto", "chat", "ranking", "time",
  "useItem", "equip", "unequip", "interact", "depot", "buy", "sell", "sellLoot",
  "partyInvite", "partyAnswer", "partyLeave", "partyKick", "recall", "travel",
  "quests", "questAccept", "questAbandon", "questTurnIn", "bagOpen", "bagTake",
  "marketList", "marketSell", "marketBuy", "marketCancel", "book", "daily", "huntReset", "forge",
];
const JUNK: unknown[] = [
  null, undefined, 0, -1, 1e309, "", "x".repeat(1500), [], [1, 2], { id: null }, { id: { a: 1 } },
  { x: "1", y: [] }, { dir: 99 }, { dir: "2" }, { dir: 1.5 }, { x: 1.5, y: 2 }, { slot: "1" }, { index: -5 }, { index: 1e9 }, { qty: -10 }, { qty: "9e9" },
  { kind: "__proto__" }, { op: "x", index: 0 }, { dest: { toString: 1 } }, { text: { length: 1e9 } },
  { autoHeal: "abc", autoHunt: "sim" }, { id: "../../etc" }, { accept: "talvez" },
];

const room = await play("Fuzz Ana", "ichigo", (id) => patchSave(id, { level: 20, exp: expForLevel(20), map: "karakura", x: TEMPLE.x, y: TEMPLE.y + 1 }));
await sleep(300);
let droppedAll = false;
room.onLeave((code) => { if (code !== 1000) droppedAll = true; });
for (const t of TYPES) for (const j of JUNK) room.send(t, j as any);
room.send("chat", { text: "/guilda depositar 1e400" });
await sleep(1500); // janela nova do limite de mensagens
const ask = async () => { const r = once<{ now: number }>(room, "time", 3000).catch(() => null); room.send("time"); return r; };
ok("depois de ~750 mensagens malformadas o mundo segue respondendo", (await ask()) !== null);
ok("o personagem continua no mundo", room.state.players.get("fuzz ana")?.online === true);
ok("ninguém foi derrubado pelo lixo (estado seguiu codificando)", !droppedAll);

// rajada: 500 mensagens de uma vez; o excesso é descartado e nada trava
for (let i = 0; i < 500; i++) room.send("move", { x: TEMPLE.x + (i % 3), y: TEMPLE.y + 1 });
await sleep(1200);
const t0 = Date.now();
const after = await ask();
ok(`rajada de 500 mensagens não trava o servidor (respondeu em ${Date.now() - t0} ms)`, after !== null && Date.now() - t0 < 1000);

// mensagem acima do limite do WebSocket (4 KB): derruba só a conexão de quem mandou
const big = await play("Fuzz Grande", "ichigo");
const closed = new Promise<number>((r) => big.onLeave((code) => r(code)));
big.send("chat", { text: "x".repeat(6000) });
const code = await Promise.race([closed, sleep(3000).then(() => -1)]);
ok(`mensagem gigante derruba só quem mandou (código ${code})`, code === 1009);
ok("os outros seguem conectados e respondendo", (await ask()) !== null);

// lobby também
const { room: lobby } = await openLobby("bot_fuzzlobby");
await once(lobby, "chars");
for (const t of ["create", "delete", "play", "logout"]) for (const j of JUNK) if (t !== "logout") lobby.send(t, j as any);
await sleep(1200); // o lixo passou do limite de mensagens: espera a janela seguinte
const created = once<any[]>(lobby, "chars", 4000).catch(() => null);
lobby.send("create", { name: "Fuzz Depois", charId: "rukia" });
ok("lobby segue funcionando depois de lixo", Array.isArray(await created));
await lobby.leave();
await room.leave();
done();
