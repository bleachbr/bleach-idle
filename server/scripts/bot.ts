// Teste sem interface: entra, liga Auto Hunt, desconecta (hunt offline) e volta.
import { play, sleep } from "./lib";

const name = process.argv[2] ?? "Bot Teste";
let room = await play(name);
room.onMessage("log", (m) => console.log("  log:", m.text));
await sleep(500);
const me = () => room.state.players.get(name.toLowerCase());
console.log("entrou:", me()?.level, me()?.exp, "monstros:", room.state.monsters.size);
room.send("auto", { autoHunt: true, autoHeal: 50 });
await sleep(15000);
console.log("após 15s online:", { lvl: me()?.level, exp: me()?.exp, hp: me()?.hp, pos: [me()?.x, me()?.y] });
await room.leave();
console.log("desconectou; hunt offline por 15s...");
await sleep(15000);
room = await play(name);
room.onMessage("offline", (m) => console.log("relatório offline:", m));
await sleep(1000);
console.log("voltou:", { lvl: me()?.level, exp: me()?.exp, online: me()?.online });
room.send("auto", { autoHunt: false });
await room.leave();
process.exit(0);
