// Caveira (☠): abate injusto pune o assassino; defesa e caça ao assassino são livres.
import { expForLevel, nearestWalkable } from "../../shared/src";
import { HOME } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

const base = nearestWalkable(HOME, 24, 4);
const at = (dx: number, dy = 0) => nearestWalkable(HOME, base.x + dx, base.y + dy);
async function bot(name: string, level: number, pos: { x: number; y: number }, extra: Record<string, unknown> = {}) {
  const room = await play(name, "ichigo", (id) => patchSave(id, {
    level, exp: expForLevel(level), hp: 9999, rei: 9999, gold: 0, inv: [], equip: {}, skullUntil: 0, map: "karakura", ...pos, ...extra,
  }));
  const logs: string[] = [];
  let death: any = null;
  room.onMessage("log", (m) => logs.push(m.text));
  room.onMessage("death", (d) => (death = d));
  await sleep(300);
  return { room, logs, death: () => death, me: () => room.state.players.get(name.toLowerCase()) };
}
const waitDead = async (b: { me: () => any }, pos: { x: number; y: number }) => {
  for (let i = 0; i < 160 && b.me().x === pos.x && b.me().y === pos.y; i++) await sleep(250);
  await sleep(300);
};

// 1. abate injusto
const aPos = at(0), bPos = at(1);
const a = await bot("Caveira Ana", 20, aPos, { gold: 1000, equip: { amulet: "amuleto_alma" } });
const b = await bot("Caveira Beto", 15, bPos, { hp: 40 });
a.room.send("target", { id: "caveira beto" });
await waitDead(b, bPos);
ok(`abate injusto dá caveira (${Math.round((a.me().skullUntil - Date.now()) / 60000)} min)`, a.me().skullUntil > Date.now() + 14 * 60_000);
a.room.send("target", { id: "" });
a.room.send("recall");
await sleep(300);
ok("assassino não pode voltar à cidade", a.logs.some((l) => l.includes("Assassinos")));

// 2. caçar o assassino não marca, e o assassino morrendo perde mais (amuleto não salva)
const cPos = nearestWalkable(HOME, a.me().x, a.me().y + 1);
const c = await bot("Caveira Caio", 80, cPos);
c.room.send("target", { id: "caveira ana" });
await sleep(1500);
ok("atacar o assassino não marca quem ataca", c.me().pvpUntil === 0);
const anaPos = { x: a.me().x, y: a.me().y };
await waitDead(a, anaPos);
const d = a.death();
ok(`assassino morto perde 30% do dinheiro (${d?.gold} de 1000)`, d?.gold === 300);
ok("o Amuleto da Alma não protege o assassino", d && !d.protected);
ok("quem matou o assassino não ganha caveira", c.me().skullUntil === 0);

// 3. defesa: matar quem atacou primeiro não é injusto
const dPos = at(-3), ePos = at(-2);
const def = await bot("Caveira Davi", 60, dPos);
const agr = await bot("Caveira Edu", 15, ePos, { hp: 80 });
agr.room.send("target", { id: "caveira davi" });
await sleep(1200);
ok("agressor fica marcado", agr.me().pvpUntil > Date.now());
def.room.send("target", { id: "caveira edu" });
await waitDead(agr, ePos);
ok("quem se defende não é marcado nem vira assassino", def.me().pvpUntil === 0 && def.me().skullUntil === 0);

for (const x of [a, b, c, def, agr]) await x.room.leave();
done();
