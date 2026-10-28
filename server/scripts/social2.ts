// Chat por canal, guildas e ranking.
import { expForLevel, nearestWalkable } from "../../shared/src";
import { HOME } from "../src/maps";
import { play, patchSave, sleep, once, ok, done } from "./lib";

const street = nearestWalkable(HOME, 24, 4);
async function bot(name: string, level: number, gold: number, pos = street, hp = 9999) {
  const room = await play(name, "ichigo", (id) => patchSave(id, { level, exp: expForLevel(level), hp, rei: 9999, gold, map: "karakura", ...pos }));
  const chat: { from: string; text: string; ch?: string }[] = [];
  const logs: string[] = [];
  let guild: any = undefined;
  room.onMessage("chat", (m) => chat.push(m));
  room.onMessage("log", (m) => logs.push(m.text));
  room.onMessage("guild", (g) => (guild = g));
  await sleep(300);
  const say = (text: string) => room.send("chat", { text });
  return { room, chat, logs, say, guild: () => guild, me: () => room.state.players.get(name.toLowerCase()) };
}

const a = await bot("Social Ana", 15, 2000);
const b = await bot("Social Beto", 15, 300, nearestWalkable(HOME, street.x + 1, street.y));
const caioPos = nearestWalkable(HOME, street.x, street.y + 1);
const c = await bot("Social Caio", 15, 300, caioPos, 60);

// mensagens
a.say("/pm Social Beto, oi Beto");
await sleep(300);
ok("/pm chega só ao destinatário", b.chat.some((m) => m.ch === "pm" && m.text === "oi Beto") && !c.chat.some((m) => m.text === "oi Beto"));
a.say("/ajuda");
await sleep(200);
ok("/ajuda lista os comandos", a.chat.some((m) => m.text.includes("/guilda criar")));
a.room.send("partyInvite", { id: "social beto" });
await sleep(200);
b.room.send("partyAnswer", { accept: true });
await sleep(200);
a.say("/p reunião da party");
await sleep(300);
ok("/p chega à party e não aos outros", b.chat.some((m) => m.ch === "party" && m.text === "reunião da party") && !c.chat.some((m) => m.text === "reunião da party"));

// guilda
b.say("/guilda criar Treze Esquadras");
await sleep(200);
ok("criar guilda sem 500 kan é recusado", b.logs.some((l) => l.includes("custa 500")));
a.say("/guilda criar Treze Esquadras");
await sleep(400);
ok(`criar guilda cobra 500 kan e põe a tag no nome ([${a.me().guildTag}])`, a.me().guildTag === "TE" && a.guild()?.name === "Treze Esquadras");
a.say("/guilda convidar Social Beto");
await sleep(200);
b.say("/guilda aceitar");
await sleep(300);
ok("convite aceito: Beto entra com a tag", b.me().guildTag === "TE" && a.guild()?.members.length === 2);
b.say("/g olá guilda");
await sleep(300);
ok("/g chega à guilda e não aos outros", a.chat.some((m) => m.ch === "guild" && m.text === "olá guilda") && !c.chat.some((m) => m.text === "olá guilda"));
b.say("/guilda depositar 200");
await sleep(300);
ok("depósito no banco da guilda", a.guild()?.bank === 200);
b.say("/guilda sacar 50");
await sleep(200);
ok("só o líder saca", b.logs.some((l) => l.includes("Só o líder saca")) && a.guild()?.bank === 200);
a.say("/guilda sacar 50");
await sleep(300);
ok("líder saca do banco", a.guild()?.bank === 150);
a.say("/guilda lider Social Beto");
await sleep(300);
ok("liderança passa ao Beto", b.guild()?.leader === true && a.guild()?.leader === false);
b.say("/guilda expulsar Social Ana");
await sleep(300);
ok("expulsa: Ana fica sem guilda e sem tag", a.me().guildTag === "" && a.guild() === null);
b.say("/guilda sair");
await sleep(300);
ok("último membro sai: guilda acaba e o banco volta para ele", b.me().guildTag === "" && b.logs.some((l) => l.includes("150 kan")));

// abate em PvP conta no ranking
const h0 = c.me().hp;
a.room.send("partyLeave");
await sleep(200);
const killer = await bot("Social Algoz", 40, 0, nearestWalkable(HOME, street.x - 1, street.y));
killer.room.send("target", { id: "social caio" });
for (let i = 0; i < 80 && c.me().x === caioPos.x && c.me().y === caioPos.y; i++) await sleep(250);
await sleep(500);
ok(`Algoz derrota Caio em PvP (HP ${h0}, renasceu no templo)`, c.me().x !== caioPos.x || c.me().y !== caioPos.y);
const rank: any = await new Promise((r) => { killer.room.onMessage("ranking", r); killer.room.send("ranking"); });
ok("ranking de abates mostra o Algoz", rank.abates.some((r: any) => r.name === "Social Algoz" && r.frags >= 1));
ok("ranking de nível vem ordenado por XP", rank.nivel.every((r: any, i: number) => i === 0 || rank.nivel[i - 1].exp >= r.exp));

for (const x of [a, b, c, killer]) await x.room.leave();
done();
