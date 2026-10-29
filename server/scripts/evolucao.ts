// Evolução: técnicas por nível (teclas 1, 4, 5 e 6), forma final no nível 60, técnica 1 que evolui com a forma,
// Poder no estado e no ranking, e aviso de técnica nova ao subir de nível.
import { expForLevel, nearestWalkable, POWER_TIERS, powerTier } from "../../shared/src";
import { HOME } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

async function bot(name: string, fields: Record<string, unknown>) {
  const logs: string[] = [];
  const fx: any[] = [];
  let ranking: any;
  const room = await play(name, "ichigo", (id) => patchSave(id, { map: "karakura", ...nearestWalkable(HOME, 38, 8), ...fields }),
    (r) => { r.onMessage("log", (m) => logs.push(m.text)); r.onMessage("fx", (m) => fx.push(m)); r.onMessage("ranking", (m) => (ranking = m)); });
  await sleep(300);
  return { room, logs, fx, ranking: () => ranking, me: () => room.state.players.get(name.toLowerCase()) };
}
const until = async (f: () => unknown, ms = 8000) => { for (let t = 0; t < ms && !f(); t += 100) await sleep(100); return !!f(); };

const a = await bot("Evo Ana", { level: 60, exp: expForLevel(60), hp: 9999, rei: 9999 });
const p0 = a.me().power;
ok(`tem Poder no estado (${p0}, ${POWER_TIERS[powerTier(p0)].title})`, p0 > 0 && powerTier(p0) > 0);
a.room.send("skill", { slot: 6 });
ok("técnica de nível 100 ainda trancada", await until(() => a.logs.some((l) => l.includes("Mugetsu se aprende no nível 100"))));
a.room.send("transform");
await until(() => a.me().form === 1);
a.room.send("transform");
ok(`T duas vezes chega à forma final (passo ${a.me().stepMs} ms)`, await until(() => a.me().form === 2) && a.me().stepMs === 140);
ok("e a forma final solta o efeito próprio", a.fx.some((f) => f.t === "form" && f.v === 2));
a.room.send("auto", { autoTarget: true });
ok("acha um alvo", await until(() => !!a.me().targetId));
a.room.send("skill", { slot: 1 });
ok("na forma final a técnica 1 vira Getsuga Tenshō Mascarado", await until(() => a.fx.some((f) => f.t === "skill" && f.name === "Getsuga Tenshō Mascarado")));
await sleep(700); // recarga global entre técnicas
for (let i = 0; i < 30 && !a.fx.some((f) => f.t === "skill" && f.i === 1); i++) { a.room.send("skill", { slot: 4 }); await sleep(300); }
ok("tecla 4: Getsuga Jūjishō em área", a.fx.some((f) => f.t === "skill" && f.i === 1 && f.name === "Getsuga Jūjishō" && f.area === 1));
a.room.send("transform");
ok("T na forma final volta ao normal", await until(() => a.me().form === 0));
a.room.send("ranking");
ok("ranking de Poder", await until(() => a.ranking()?.poder?.some((r: any) => r.name === "Evo Ana" && r.power > 0)));
a.room.send("auto", { autoTarget: false });
await a.room.leave();

// subir para o nível 25 ensina a técnica nova
const b = await bot("Evo Beto", { level: 24, exp: expForLevel(25) - 1, hp: 9999, rei: 9999, autoHunt: true });
ok("ao chegar no nível 25, aprende Getsuga Jūjishō", await until(() => b.logs.some((l) => l.includes("Nova técnica: Getsuga Jūjishō")), 20000));
b.room.send("auto", { autoHunt: false });
await b.room.leave();
done();
