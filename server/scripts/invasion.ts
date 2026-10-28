// Invasão de Hollows em Karakura: aparecem em volta da praça, fora da zona segura,
// dão XP extra e não renascem; derrotar todos encerra o evento.
import { expForLevel, inPZ, chebyshev, INVASION } from "../../shared/src";
import { HOME, TEMPLE } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

const chat: string[] = [];
const room = await play("Invasao Ana", "ichigo", (id) => patchSave(id, {
  level: 60, exp: expForLevel(60), hp: 9999, rei: 9999, gold: 0, map: "karakura", x: TEMPLE.x, y: TEMPLE.y, inv: [],
}), (r) => r.onMessage("chat", (m) => chat.push(m.text)));
await sleep(300);
const invaders = () => [...room.state.monsters.values()].filter((m: any) => m.id.startsWith("inv"));
room.send("debugInvasion");
await sleep(500);
const list = invaders();
ok(`invasão começa com ${list.length} Hollows e um líder`, list.length === INVASION.count + 1 && list.some((m: any) => m.kind === INVASION.leader));
ok("todos fora da zona segura e perto da praça", list.every((m: any) => !inPZ(HOME, m.x, m.y) && chebyshev(m.x, m.y, TEMPLE.x, TEMPLE.y) <= 14));
ok("o chat anuncia", chat.some((t) => t.includes("Invasão!")));
room.send("debugInvasion");
await sleep(300);
ok("não começa outra por cima", invaders().length === list.length);

// nível 60 com Auto Hunt limpa a praça
const exp0 = room.state.players.get("invasao ana").exp;
room.send("auto", { autoHunt: true, autoHeal: 40 });
for (let i = 0; i < 300 && invaders().length; i++) await sleep(500);
room.send("auto", { autoHunt: false });
await sleep(500);
ok(`invasores derrotados não renascem (${invaders().length} sobrando)`, invaders().length === 0);
ok("o chat anuncia o fim com o maior caçador", chat.some((t) => t.includes("Invasão repelida") && t.includes("Invasao Ana")));
ok("deu XP", room.state.players.get("invasao ana").exp > exp0);

room.send("debugInvasionEnd"); // não deixa invasores atrapalhando os próximos cenários
await sleep(200);
await room.leave();
done();
