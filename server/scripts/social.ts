// Teste de party, PvP e viagem.
import { expForLevel, generateMap, nearestWalkable, TEMPLE, TRAVEL, SENKAIMON } from "../../shared/src";
import { play, patchSave, sleep, once } from "./lib";

const map = generateMap();
const ok = (label: string, cond: boolean) => console.log(`${cond ? "OK    " : "FALHOU"} ${label}`);
const at = (x: number, y: number) => nearestWalkable(map, x, y);
const lvl = (level: number) => ({ level, exp: expForLevel(level), hp: 9999, rei: 9999, gold: 500, inv: [] });

async function bot(name: string, level: number, pos: { x: number; y: number }, charId = "ichigo") {
  const room = await play(name, charId, (id) => patchSave(id, { ...lvl(level), ...pos }));
  const logs: string[] = [];
  room.onMessage("log", (m) => logs.push(m.text));
  await sleep(300);
  return { room, logs, me: () => room.state.players.get(name.toLowerCase()) };
}

// ---- party com XP dividido (mesma faixa de nível, na hunt dos Hollows Menores)
const hunt = at(38, 7);
const a = await bot("Party Alfa", 12, hunt);
const b = await bot("Party Beta", 13, at(39, 7), "rukia");
const invite = once(b.room, "partyInvite");
a.room.send("partyInvite", { id: "party beta" });
ok("convite chega", (await invite).from === "Party Alfa");
b.room.send("partyAnswer", { accept: true });
await sleep(400);
ok("os dois na mesma party, Alfa líder", !!a.me().partyId && a.me().partyId === b.me().partyId && a.me().partyLead && !b.me().partyLead);
a.room.send("auto", { autoHunt: true });
b.room.send("auto", { autoHunt: true });
await sleep(15000);
const shared = [...a.logs, ...b.logs].filter((l) => l.includes("(party, 2)"));
ok(`XP dividido entre os dois (${shared.length} abates divididos)`, a.logs.some((l) => l.includes("(party, 2)")) && b.logs.some((l) => l.includes("(party, 2)")));
const menor = shared.find((l) => l.startsWith("Hollow Menor"));
ok(`Hollow Menor (60 XP) em 2 dá 33 cada (+10% de bônus): "${menor ?? "nenhum"}"`, !menor || menor.includes("+33 XP"));
a.room.send("partyLeave");
await sleep(300);
ok("líder sai e a party de 2 se desfaz", !a.me().partyId && !b.me().partyId);
for (const x of [a, b]) x.room.send("auto", { autoHunt: false });

// ---- diferença de nível grande: não divide
const c = await bot("Party Alto", 30, at(40, 8));
const d = await bot("Party Baixo", 12, at(41, 8));
c.room.send("partyInvite", { id: "party baixo" });
await sleep(200);
d.room.send("partyAnswer", { accept: true });
c.room.send("auto", { autoHunt: true });
await sleep(6000);
ok("nível 30 + 12: avisa que não divide", c.logs.some((l) => l.includes("não dividida")));
c.room.send("auto", { autoHunt: false });

// ---- PvP, revide e bloqueio de viagem (rua fora da praça, longe dos monstros)
const street = at(24, 4);
const e = await bot("Pvp Atacante", 12, street);
const f = await bot("Pvp Vitima", 12, at(street.x + 1, street.y), "renji");
const g = await bot("Pvp Novato", 8, at(street.x, street.y + 1), "rukia");
f.room.send("auto", { autoTarget: true });
e.room.send("target", { id: "pvp novato" });
await sleep(300);
ok("nível 8 é protegido", e.logs.some((l) => l.includes("protegido")) && e.me().targetId === "");
const hp0 = f.me().hp;
e.room.send("target", { id: "pvp vitima" });
await sleep(2500);
ok(`ataque reduz HP da vítima (${hp0} → ${f.me().hp})`, f.me().hp < hp0);
ok("atacante fica bloqueado (pvpUntil ~3 min)", e.me().pvpUntil - Date.now() > 170_000);
ok("vítima com Auto Target revida", f.me().targetId === "pvp atacante");
e.room.send("recall");
await sleep(300);
ok("voltar à cidade bloqueado", e.logs.some((l) => l.includes("viagem bloqueada")));
e.room.send("target", { id: "" });
f.room.send("auto", { autoTarget: false });
f.room.send("target", { id: "" });
e.room.send("move", { x: TEMPLE.x, y: TEMPLE.y });
await sleep(7000);
ok("não entra na zona de proteção", e.logs.some((l) => l.includes("zona de proteção")) && e.me().y < 11);

// ---- viagem e voltar à cidade (sem bloqueio)
const h = await bot("Viajante", 12, { x: SENKAIMON.x, y: SENKAIMON.y + 2 });
h.room.send("travel", { dest: "leste" });
await sleep(400);
const dest = at(TRAVEL[0].x, TRAVEL[0].y);
ok(`Senkaimon leva à Floresta Leste e cobra 30 kan`, h.me().x === dest.x && h.me().y === dest.y && h.logs.some((l) => l.includes("30 kan")));
h.room.send("travel", { dest: "rio" });
await sleep(300);
ok("longe do portal não viaja", h.logs.some((l) => l.includes("Chegue perto do Senkaimon")));
h.room.send("recall");
await sleep(400);
console.log("  recall na floresta:", h.logs.at(-1));
g.room.send("recall"); // o novato está parado na rua, fora de combate
await sleep(400);
ok("voltar à cidade (fora de combate) leva ao templo", g.me().x === TEMPLE.x && g.me().y === TEMPLE.y);
g.room.send("recall");
await sleep(300);
ok("voltar à cidade tem recarga", g.logs.some((l) => l.includes("recarrega")));

for (const x of [a, b, c, d, e, f, g, h]) await x.room.leave();
process.exit(0);
