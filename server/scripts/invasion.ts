// Invasão de Hollows em Karakura: aparecem em volta da praça, fora da zona segura,
// dão XP extra e não renascem; derrotar todos encerra o evento.
// Eventos narrados (R-12): cada fase manda uma linha de lore no chat e um banner (`event`) a todos.
import { expForLevel, inPZ, chebyshev, INVASION, EVENT_LORE, EVENT_END_MS, type EventBanner } from "../../shared/src";
import { HOME, TEMPLE } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

const until = async (f: () => unknown, ms = 8000) => { for (let t = 0; t < ms && !f(); t += 100) await sleep(100); return !!f(); };

const chat: string[] = [];
const lore: string[] = [];
const events: EventBanner[] = [];
const room = await play("Invasao Ana", "ichigo", (id) => patchSave(id, {
  level: 60, exp: expForLevel(60), hp: 9999, rei: 9999, gold: 0, map: "karakura", x: TEMPLE.x, y: TEMPLE.y, inv: [],
}), (r) => {
  r.onMessage("chat", (m) => { chat.push(m.text); if (m.ch === "lore") lore.push(m.text); });
  r.onMessage("event", (m) => events.push(m));
});
const me = () => room.state.players.get("invasao ana");
ok("entrou no mundo", await until(() => me()));
const invaders = () => [...room.state.monsters.values()].filter((m: any) => m.id.startsWith("inv"));
const t0 = Date.now();
room.send("debugInvasion");
ok("a invasão começa", await until(() => invaders().length === INVASION.count + 1));
const list = invaders();
ok(`invasão começa com ${list.length} Hollows e um líder`, list.length === INVASION.count + 1 && list.some((m: any) => m.kind === INVASION.leader));
ok("todos fora da zona segura e perto da praça", list.every((m: any) => !inPZ(HOME, m.x, m.y) && chebyshev(m.x, m.y, TEMPLE.x, TEMPLE.y) <= 14));
ok("o chat anuncia", await until(() => chat.some((t) => t.includes("Invasão!"))));
ok("o chat narra o começo com uma linha de lore", await until(() => lore.some((t) => EVENT_LORE.invStart.includes(t))));
ok("o banner da invasão aparece até o fim do evento", await until(() => events.some((e) =>
  e.kind === "invasion" && e.phase === "invStart" && e.until >= t0 + INVASION.durationMs - 1000)));

// quem entra no meio da invasão também vê o banner
const late: EventBanner[] = [];
const room2 = await play("Invasao Beto", "rukia", undefined, (r) => r.onMessage("event", (m) => late.push(m)));
ok("quem entra no meio recebe o banner em andamento", await until(() => late.some((e) =>
  e.kind === "invasion" && e.phase === "invStart" && e.left > 0 && e.left <= INVASION.durationMs)));
await room2.leave();

const before = invaders().length;
room.send("debugInvasion");
// as mensagens saem em ordem: se o segundo debugInvasion tivesse começado outra invasão, o aviso "Invasão!"
// e a lore chegariam antes da resposta do "time". O estado dos monstros vem por patch e não tem essa garantia.
let pong = 0;
room.onMessage("time", () => pong++);
room.send("time");
ok("o servidor tratou o segundo pedido", await until(() => pong > 0));
ok("não anuncia outra por cima", chat.filter((t) => t.includes("Invasão!")).length === 1);
ok("nem cria mais invasores", invaders().length === before);
ok("nem narra de novo", lore.filter((t) => EVENT_LORE.invStart.includes(t)).length === 1);

// nível 60 com Auto Hunt limpa a praça
const exp0 = me().exp;
room.send("auto", { autoHunt: true, autoHeal: 40 });
await until(() => !invaders().length, 150_000);
room.send("auto", { autoHunt: false });
ok(`invasores derrotados não renascem (${invaders().length} sobrando)`, invaders().length === 0);
ok("o chat anuncia o fim com o maior caçador", await until(() => chat.some((t) => t.includes("Invasão repelida") && t.includes("Invasao Ana"))));
ok("o chat narra a vitória", await until(() => lore.some((t) => EVENT_LORE.invWon.includes(t))));
const won = events.find((e) => e.phase === "invWon");
ok(`o banner da vitória dura ${EVENT_END_MS / 1000} s`, !!won && won.kind === "invasion" && won.left > EVENT_END_MS - 500 && won.left <= EVENT_END_MS);
ok("deu XP", me().exp > exp0);

// invasão que acaba sem vitória (o tempo esgota): narra a retirada
room.send("debugInvasion");
ok("outra invasão começa", await until(() => invaders().length > 0));
room.send("debugInvasionEnd"); // também não deixa invasores atrapalhando os próximos cenários
ok("o fim sem vitória tira os invasores", await until(() => invaders().length === 0));
ok("e narra a retirada dos Hollows", await until(() => lore.some((t) => EVENT_LORE.invLost.includes(t))));
ok("o banner troca para o fim da invasão", await until(() => events.some((e) => e.kind === "invasion" && e.phase === "invLost")));
await room.leave();
done();
