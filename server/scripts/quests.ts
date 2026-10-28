// Missões do Kisuke: aceitar (máx. 3), entregar itens, caçar (conta para a party) e entregar.
import { expForLevel, nearestWalkable } from "../../shared/src";
import { HOME, TEMPLE } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

const shop = HOME.shop!;
const nearShop = nearestWalkable(HOME, shop.x - 1, shop.y + 1);
// com poções: sem elas o Auto Heal não tinha o que usar e a Ana às vezes morria na floresta
const frags = Array.from({ length: 20 }, (_, i) => (i === 0 ? { id: "fragmento", qty: 15 } : i === 1 ? { id: "pocao_vida", qty: 30 } : null));

/** `extra` completa o save de teste; `null` mantém o save e só põe o personagem ao lado da loja */
async function bot(name: string, extra: Record<string, unknown> | null = {}) {
  const room = await play(name, "ichigo", (id) => patchSave(id, extra === null ? { map: "karakura", ...nearShop } : {
    level: 25, exp: expForLevel(25), hp: 9999, rei: 9999, gold: 500, map: "karakura", ...nearShop, quests: { active: {}, done: [] }, ...extra,
  }));
  let q: any = { active: {}, done: [] };
  let inv: any;
  const logs: string[] = [];
  room.onMessage("quests", (m) => (q = m));
  room.onMessage("inv", (m) => (inv = m));
  room.onMessage("log", (m) => logs.push(m.text));
  await sleep(300);
  return { room, logs, q: () => q, inv: () => inv, me: () => room.state.players.get(name.toLowerCase()) };
}

let a = await bot("Missao Ana", { inv: frags });
for (const id of ["fragmentos", "patrulha", "garras", "uivos"]) {
  a.room.send("questAccept", { id });
  await sleep(150);
}
ok("aceita até 3 missões e recusa a 4ª", Object.keys(a.q().active).length === 3 && a.logs.some((l) => l.includes("No máximo 3")));

const gold0 = a.inv().gold;
a.room.send("questTurnIn", { id: "fragmentos" });
await sleep(300);
ok("entrega dos 15 fragmentos: tira os itens e paga 300 kan + 2 Poções de Reiatsu",
  !a.inv().inv.some((s: any) => s?.id === "fragmento") && a.inv().gold === gold0 + 300 && a.inv().inv.some((s: any) => s?.id === "pocao_rei" && s.qty >= 2));
a.room.send("questTurnIn", { id: "garras" });
await sleep(200);
ok("entrega incompleta é recusada", a.logs.some((l) => l.startsWith("Faltam")));

// caça com parceiro de party: os dois contam abates
const b = await bot("Missao Beto");
b.room.send("questAccept", { id: "patrulha" });
a.room.send("partyInvite", { id: "missao beto" });
await sleep(200);
b.room.send("partyAnswer", { accept: true });
await sleep(200);
for (const x of [a, b]) x.room.send("travel", { dest: "leste" });
await sleep(400);
for (const x of [a, b]) x.room.send("auto", { autoHunt: true, autoHeal: 40 });
for (let i = 0; i < 300 && (a.q().active.patrulha ?? 0) < 10; i++) await sleep(500);
// diagnóstico na própria linha da verificação (o runner só mostra as linhas OK/FALHOU)
const diag = () => {
  const me = a.me(), t = a.room.state.monsters.get(me.targetId);
  const menores = [...a.room.state.monsters.values()].filter((m: any) => m.kind === "hollow_menor").map((m: any) => `${m.x},${m.y}`);
  return `Ana em ${me.x},${me.y} alvo=${t ? `${t.kind} ${t.x},${t.y}` : "nenhum"} hunt=${me.autoHunt}; Hollows Menores: ${menores.join(" ")}`;
};
ok(`Ana completa os 10 Hollows Menores (${a.q().active.patrulha}/10)${a.q().active.patrulha >= 10 ? "" : ` · ${diag()}`}`, a.q().active.patrulha >= 10);
ok(`o parceiro de party também conta (${b.q().active.patrulha}/10)`, b.q().active.patrulha >= 5);

// volta ao Kisuke e entrega
// volta ao Kisuke: sai do jogo e entra de novo ao lado da loja. Voltar andando ou pelo
// "Voltar à cidade" dependia dos Hollows em volta (cercada ou em combate, a Ana não saía)
b.room.send("auto", { autoHunt: false });
a.room.send("auto", { autoHunt: false });
await sleep(300);
await a.room.leave();
await sleep(500);
a = await bot("Missao Ana", null);
const exp0 = a.me().exp;
a.room.send("questTurnIn", { id: "patrulha" });
await sleep(300);
const turned = a.me().exp >= exp0 + 900 && a.q().done.includes("patrulha") && !("patrulha" in a.q().active);
ok(`entrega da patrulha dá XP e marca como feita${turned ? "" : ` · Ana em ${a.me().x},${a.me().y} (loja ${nearShop.x},${nearShop.y}); últimas: ${a.logs.slice(-3).join(" | ")}`}`, turned);
a.room.send("questAccept", { id: "patrulha" });
await sleep(200);
ok("missão única não pode ser repetida", a.logs.some((l) => l.includes("já completou")));

for (const x of [a, b]) { x.room.send("auto", { autoHunt: false }); await x.room.leave(); }
done();
