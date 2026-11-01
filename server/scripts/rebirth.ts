// Renascimento: nível 60+ volta ao 8 guardando tudo, com bônus permanentes e nível exigido crescente.
import { expForLevel, maxHp, nearestWalkable, rebirthLevel, levelMilestone, START_LEVEL, xpWeekend, WEEKEND_EXP } from "../../shared/src";
import { HOME, TEMPLE } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

ok("nível exigido: 60, depois 65, 70... até 100", rebirthLevel(0) === 60 && rebirthLevel(1) === 65 && rebirthLevel(20) === 100);
ok("marcos: kan a cada 5 níveis, caixa a cada 10", levelMilestone(15)?.gold === 900 && !levelMilestone(15)?.items && levelMilestone(20)?.items?.[0].id === "caixa_kisuke" && !levelMilestone(21));

// Spawna dentro da PZ do templo (18, 14), garantindo imunidade a aggro de monstros antes do renascimento.
const spot = nearestWalkable(HOME, 18, 14);
async function bot(name: string, level: number, extra: Record<string, unknown> = {}) {
  const logs: string[] = [];
  const chat: string[] = [];
  let inv: any;
  const room = await play(name, "ichigo", (id) => patchSave(id, {
    level, exp: expForLevel(level), gold: 12345, map: "karakura", ...spot, inv: [{ id: "nucleo", qty: 3 }],
    equip: { weapon: "lua_negra" }, forge: { weapon: 3 }, ...extra,
  }), (r) => { r.onMessage("log", (m) => logs.push(m.text)); r.onMessage("chat", (m) => chat.push(m.text)); r.onMessage("inv", (m) => (inv = m)); });
  await sleep(400);
  return { room, logs, chat, inv: () => inv, me: () => room.state.players.get(name.toLowerCase()) };
}

const fraco = await bot("Renasce Fraco", 50);
fraco.room.send("rebirth");
await sleep(300);
ok("nível 50 não renasce", fraco.me().level === 50 && fraco.logs.some((l) => l.includes("exige nível 60")));
await fraco.room.leave();

const a = await bot("Renasce Ana", 62);
const hp0 = a.me().maxHp;
// com a bateria toda rodando, um monstro pode puxar combate na praça: tenta por alguns segundos
for (let i = 0; i < 15 && a.me().rebirths === 0; i++) { a.room.send("rebirth"); await sleep(700); }
const me = a.me();
ok(`renasce: volta ao nível ${START_LEVEL} na praça${me.rebirths ? "" : ` (${a.logs.slice(-4).join(" / ")})`}`, me.rebirths === 1 && me.level === START_LEVEL && me.map === "karakura" && me.x === TEMPLE.x && me.y === TEMPLE.y);
ok("guarda kan, itens, equipamento e forja", a.inv().gold === 12345 && a.inv().inv.some((s: any) => s?.id === "nucleo") && a.inv().equip.weapon === "lua_negra" && a.inv().forge.weapon === 3);
ok(`vida máxima com +5% (${me.maxHp}; sem bônus seria ${maxHp(START_LEVEL)})`, me.maxHp === Math.round(maxHp(START_LEVEL) * 1.05) && me.maxHp < hp0);
ok("o chat anuncia o renascimento", a.chat.some((t) => t.includes("renasceu pela 1ª vez")));
a.room.send("rebirth");
await sleep(300);
ok("o próximo exige nível 65", a.me().rebirths === 1 && a.logs.some((l) => l.includes("exige nível 65")));

// XP com bônus: um Hollow Menor (60 XP) vale 66 com 1 renascimento
const semana0 = xpWeekend(Date.now());
a.room.send("travel", { dest: "leste" });
await sleep(400);
a.room.send("auto", { autoHunt: true, autoHeal: 40 });
for (let i = 0; i < 120 && !a.logs.some((l) => /Hollow Menor derrotado: \+\d+ XP/.test(l)); i++) await sleep(500);
a.room.send("auto", { autoHunt: false });
const line = a.logs.find((l) => /Hollow Menor derrotado: \+\d+ XP/.test(l)) ?? "";
// sábado e domingo (Brasília) todo XP de monstro vale em dobro: o esperado segue a mesma regra do servidor.
// Se a virada de dia cair no meio do cenário, os dois valores são aceitos.
const esperados = [semana0, xpWeekend(Date.now())].map((w) => 66 * (w ? WEEKEND_EXP : 1));
ok(`XP com +10% (${line})`, esperados.some((x) => line.includes(`+${x} XP`)));
await a.room.leave();
done();
