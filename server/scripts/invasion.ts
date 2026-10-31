// Invasão de Hollows em Karakura: aparecem em volta da praça, fora da zona segura,
// dão XP extra e não renascem; derrotar todos encerra o evento.
import { expForLevel, inPZ, chebyshev, INVASION } from "../../shared/src";
import { HOME, TEMPLE } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

const until = async (f: () => unknown, ms = 8000) => { for (let t = 0; t < ms && !f(); t += 100) await sleep(100); return !!f(); };

const chat: string[] = [];
const room = await play("Invasao Ana", "ichigo", (id) => patchSave(id, {
  level: 60, exp: expForLevel(60), hp: 9999, rei: 9999, gold: 0, map: "karakura", x: TEMPLE.x, y: TEMPLE.y, inv: [],
}), (r) => r.onMessage("chat", (m) => chat.push(m.text)));
const me = () => room.state.players.get("invasao ana");
ok("entrou no mundo", await until(() => me()));
const invaders = () => [...room.state.monsters.values()].filter((m: any) => m.id.startsWith("inv"));
room.send("debugInvasion");
ok("a invasão começa", await until(() => invaders().length === INVASION.count + 1));
const list = invaders();
ok(`invasão começa com ${list.length} Hollows e um líder`, list.length === INVASION.count + 1 && list.some((m: any) => m.kind === INVASION.leader));
ok("todos fora da zona segura e perto da praça", list.every((m: any) => !inPZ(HOME, m.x, m.y) && chebyshev(m.x, m.y, TEMPLE.x, TEMPLE.y) <= 14));
ok("o chat anuncia", await until(() => chat.some((t) => t.includes("Invasão!"))));
const before = invaders().length;
room.send("debugInvasion");
// as mensagens saem em ordem: se o segundo debugInvasion tivesse começado outra invasão, o aviso "Invasão!"
// chegaria antes da resposta do "time". O estado dos monstros vem por patch e não tem essa garantia.
let pong = 0;
room.onMessage("time", () => pong++);
room.send("time");
ok("o servidor tratou o segundo pedido", await until(() => pong > 0));
ok("não anuncia outra por cima", chat.filter((t) => t.includes("Invasão!")).length === 1);
ok("nem cria mais invasores", invaders().length === before);

// nível 60 com Auto Hunt limpa a praça
const exp0 = me().exp;
room.send("auto", { autoHunt: true, autoHeal: 40 });
await until(() => !invaders().length, 150_000);
room.send("auto", { autoHunt: false });
ok(`invasores derrotados não renascem (${invaders().length} sobrando)`, invaders().length === 0);
ok("o chat anuncia o fim com o maior caçador", await until(() => chat.some((t) => t.includes("Invasão repelida") && t.includes("Invasao Ana"))));
ok("deu XP", me().exp > exp0);

room.send("debugInvasionEnd"); // não deixa invasores atrapalhando os próximos cenários
await room.leave();
done();
