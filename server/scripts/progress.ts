// Bestiário (estágios e bônus), conquistas automáticas e recompensa diária com sequência.
import { expForLevel, nearestWalkable, countItem, bestiaryStage, bestiaryDmgMult, bestiaryLootMult, dayKey, prevDay, rollLoot } from "../../shared/src";
import { HOME } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

// regras puras
ok("estágios: 25/150/500 abates (chefe: 1/5/15)", bestiaryStage("hollow_menor", 24) === 0 && bestiaryStage("hollow_menor", 150) === 2 && bestiaryStage("gillian", 1) === 1);
ok("bônus de dano +4% por estágio e loot só no 3º", bestiaryDmgMult("hollow_menor", 500) === 1.12 && bestiaryLootMult("hollow_menor", 499) === 1 && bestiaryLootMult("hollow_menor", 500) === 1.2);
ok("dia vira à meia-noite de Brasília", dayKey(Date.parse("2026-10-28T02:59:00Z")) === "2026-10-27" && dayKey(Date.parse("2026-10-28T03:00:00Z")) === "2026-10-28");
ok("dia anterior atravessa o mês", prevDay("2026-11-01") === "2026-10-31");
let drops = 0;
for (let i = 0; i < 4000; i++) drops += rollLoot("hollow_menor", 2).items.length;
ok(`multiplicador de loot aumenta a chance (${(drops / 40).toFixed(0)}% com 35% × 2)`, drops > 4000 * 0.62);

const pos = nearestWalkable(HOME, 24, 4);
async function bot(name: string, extra: Record<string, unknown> = {}) {
  const room = await play(name, "ichigo", (id) => patchSave(id, {
    level: 14, exp: expForLevel(14), hp: 9999, rei: 9999, gold: 0, map: "karakura", ...pos, inv: [], ...extra,
  }));
  let book: any, inv: any;
  const logs: string[] = [];
  room.onMessage("book", (m) => (book = m));
  room.onMessage("inv", (m) => (inv = m));
  room.onMessage("log", (m) => logs.push(m.text));
  await sleep(300);
  return { room, logs, book: () => book, inv: () => inv };
}

// recompensa diária
const today = dayKey(Date.now());
const a = await bot("Livro Ana");
a.room.send("daily");
await sleep(300);
ok("primeiro resgate: dia 1 (100 kan + 3 poções)", a.inv().gold === 100 && countItem(a.inv().inv, "pocao_vida") === 3 && a.book().daily.streak === 1);
a.room.send("daily");
await sleep(300);
ok("segundo resgate no mesmo dia é recusado", a.inv().gold === 100 && a.logs.some((l) => l.includes("já pegou")));

const b = await bot("Livro Beto", { prog: { bestiary: { hollow_menor: 24 }, ach: [], daily: { last: prevDay(today), streak: 6 }, kills: 99, bossKills: 0, dm: { day: today, list: [], bonus: true } }, quests: { active: { patrulha: 0 }, done: [] } });
b.room.send("daily");
await sleep(300);
ok("sequência continua: 7º dia dá o Amuleto da Alma", b.book().daily.streak === 7 && countItem(b.inv().inv, "amuleto_alma") === 1);
ok("conquista de 7 dias seguidos sai na hora", b.logs.some((l) => l.includes("Conquista: Disciplina")));
const c = await bot("Livro Caio", { prog: { bestiary: {}, ach: [], daily: { last: "2020-01-01", streak: 40 }, kills: 0, bossKills: 0 } });
c.room.send("daily");
await sleep(300);
ok("perder um dia zera a sequência", c.book().daily.streak === 1);

// bestiário: o 25º Hollow Menor sobe o estágio; o 100º abate dá conquista
b.room.send("travel", { dest: "leste" });
await sleep(400);
b.room.send("auto", { autoHunt: true, autoHeal: 40 });
// a missão da patrulha faz o Auto Hunt ir atrás dos Hollows Menores primeiro
const both = () => b.logs.some((l) => l.includes("Conquista: Purificador")) && b.logs.some((l) => l.includes("Bestiário: Hollow Menor no estágio 1"));
for (let i = 0; i < 180 && !both(); i++) await sleep(500);
b.room.send("auto", { autoHunt: false });
b.room.send("book");
await sleep(300);
const menor = b.book().bestiary.find((x: any) => x.kind === "hollow_menor");
ok(`Hollow Menor no estágio 1 do bestiário (${menor?.kills} abates)`, menor?.stage >= 1 && b.logs.some((l) => l.includes("Bestiário: Hollow Menor no estágio 1")));
ok("estágio 1 revela vida e XP; loot só no 2", menor?.hp === 45 && menor?.loot === null);
ok("100 abates no total dão a conquista Purificador", b.logs.some((l) => l.includes("Conquista: Purificador")));
const unknown = b.book().bestiary.find((x: any) => x.kind === "gillian");
ok("monstro nunca derrotado não mostra números", unknown.kills === 0 && unknown.hp === 0);

// primeiros passos: personagem novo vê o guia; cada passo paga uma vez
const tut: any[] = [];
const novo = await play("Livro Novato", "ichigo", (id) => patchSave(id, {
  level: 8, exp: expForLevel(8), gold: 0, inv: [], map: "karakura", ...pos, prog: { bestiary: {}, ach: [], daily: { last: "", streak: 0 }, kills: 0, bossKills: 0 },
}), (r) => r.onMessage("tutorial", (m) => tut.push(m)));
await sleep(400);
ok("personagem novo recebe o guia com 6 passos", tut[0]?.length === 6 && tut[0].every((s: any) => !s.done));
novo.send("auto", { autoHunt: true });
await sleep(300);
novo.send("auto", { autoHunt: false });
novo.send("auto", { autoHunt: true });
await sleep(300);
novo.send("auto", { autoHunt: false });
const last = tut[tut.length - 1];
ok("ligar o Auto Hunt marca o passo (e só uma vez)", last?.filter((s: any) => s.done).length >= 1 && tut.filter((t) => t?.[1]?.done).length >= 1 && tut.length <= 4);
await novo.leave();
const veterano: any[] = [];
const vet = await play("Livro Veterano", "ichigo", (id) => patchSave(id, {
  level: 30, exp: expForLevel(30), map: "karakura", ...pos, prog: { bestiary: {}, ach: [], daily: { last: "", streak: 0 }, kills: 0, bossKills: 0 },
}), (r) => r.onMessage("tutorial", (m) => veterano.push(m)));
await sleep(400);
ok("veterano (nível 30) não vê o guia", veterano.length === 1 && veterano[0] === null);
await vet.leave();

// marco de nível: passar do 14 para o 15 pela 1ª vez paga 900 kan; depois de renascer, não paga de novo
const marco: string[] = [];
let minv: any;
const m15 = await play("Livro Marco", "ichigo", (id) => patchSave(id, { level: 14, exp: expForLevel(15) - 30, gold: 0, map: "karakura", ...nearestWalkable(HOME, 36, 10) }),
  (r) => { r.onMessage("log", (m) => marco.push(m.text)); r.onMessage("inv", (m) => (minv = m)); });
await sleep(300);
m15.send("auto", { autoHunt: true, autoHeal: 40 });
for (let i = 0; i < 120 && !marco.some((l) => l.startsWith("Marco do nível 15")); i++) await sleep(500);
m15.send("auto", { autoHunt: false });
ok(`chegar ao 15 paga o marco (${marco.find((l) => l.startsWith("Marco")) ?? "nada"})`, marco.some((l) => l.startsWith("Marco do nível 15: 900 kan")) && minv.gold >= 900);
await m15.leave();

for (const x of [a, b, c]) await x.room.leave();
done();
