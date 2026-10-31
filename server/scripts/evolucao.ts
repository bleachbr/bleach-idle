// Evolução: técnicas por nível (teclas 1, 4, 5 e 6), 5 estágios pela lore (1, 10, 30, 60, 100), técnica 1 que evolui com a forma,
// Poder no estado e no ranking, e aviso de técnica nova ao subir de nível.
import { expForLevel, nearestWalkable, POWER_TIERS, powerTier, CHARS, FORM_LEVELS, spriteKey, lookOf } from "../../shared/src";
import { HOME } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

// todos os personagens com os 5 estágios nos mesmos níveis, cada um mais forte que o anterior
const chars = Object.values(CHARS);
ok(`${chars.length} personagens, todos com ${FORM_LEVELS.length} estágios nos níveis ${FORM_LEVELS.join(", ")}`,
  chars.length >= 6 && chars.every((c) => c.forms.length === FORM_LEVELS.length && c.forms.every((f, i) => f.minLevel === FORM_LEVELS[i])));
ok("cada estágio bate mais forte e anda mais rápido que o anterior",
  chars.every((c) => c.forms.every((f, i) => i === 0 || (f.dmgMult > c.forms[i - 1].dmgMult && f.stepMs < c.forms[i - 1].stepMs))));
ok("cada estágio tem sprite próprio (nenhum repete folha)", chars.every((c) => new Set(c.forms.map((f) => f.sprite)).size === c.forms.length));
ok("a Rukia não tem mais asas de gelo (são do Hitsugaya)", !CHARS.rukia.forms.some((f) => /asas/i.test(f.label)) && CHARS.hitsugaya.forms.some((f) => f.sprite === "hitsugaya_bankai"));
ok("máscara Hollow só muda o visual do Ichigo", spriteKey("ichigo_shikai", lookOf({ head: "mascara" })) === "ichigo_shikai__mask"
  && spriteKey("rukia", lookOf({ head: "mascara" })) === "rukia" && spriteKey("sado", lookOf({ armor: "haori" })) === "sado"
  && spriteKey("renji", "haori") === "renji__haori");

async function bot(name: string, fields: Record<string, unknown>, charId = "ichigo") {
  const logs: string[] = [];
  const fx: any[] = [];
  let ranking: any;
  const room = await play(name, charId, (id) => patchSave(id, { map: "karakura", ...nearestWalkable(HOME, 38, 8), ...fields }),
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
const hollow = await until(() => a.me().form === 3);
ok(`no nível 60, T vai direto à Hollowficação (passo ${a.me().stepMs} ms)`, hollow && a.me().stepMs === 140);
ok("e o estágio solta o efeito próprio", a.fx.some((f) => f.t === "form" && f.v === 3));
a.room.send("auto", { autoTarget: true });
ok("acha um alvo", await until(() => !!a.me().targetId));
a.room.send("skill", { slot: 1 });
ok("hollowficado, a técnica 1 vira Cero Oscuras", await until(() => a.fx.some((f) => f.t === "skill" && f.name === "Cero Oscuras")));
await sleep(700); // recarga global entre técnicas
for (let i = 0; i < 30 && !a.fx.some((f) => f.t === "skill" && f.i === 1); i++) { a.room.send("skill", { slot: 4 }); await sleep(300); }
ok("tecla 4: Getsuga Jūjishō em área", a.fx.some((f) => f.t === "skill" && f.i === 1 && f.name === "Getsuga Jūjishō" && f.area === 1));
a.room.send("transform");
ok("T de novo volta ao normal", await until(() => a.me().form === 0));
a.room.send("ranking");
ok("ranking de Poder", await until(() => a.ranking()?.poder?.some((r: any) => r.name === "Evo Ana" && r.power > 0)));
a.room.send("auto", { autoTarget: false });
await a.room.leave();

// Hitsugaya no nível 100: Forma Adulta com Shiten Kōsō
const h = await bot("Evo Toshiro", { level: 100, exp: expForLevel(100), hp: 99999, rei: 99999 }, "hitsugaya");
h.room.send("transform");
ok("Hitsugaya jogável: no nível 100, T chega ao 5º estágio", await until(() => h.me()?.form === 4));
h.room.send("auto", { autoTarget: true });
await until(() => !!h.me().targetId);
// o alvo pode estar fora de alcance: tenta até ele chegar perto
for (let i = 0; i < 40 && !h.fx.some((f) => f.t === "skill" && f.i === 0); i++) { h.room.send("skill", { slot: 1 }); await sleep(300); }
const hs = h.fx.find((f) => f.t === "skill" && f.i === 0);
ok(`e a técnica 1 vira Shiten Kōsō (${hs?.name ?? h.logs.slice(-2).join(" | ")})`, hs?.name === "Shiten Kōsō");
h.room.send("auto", { autoTarget: false });
await h.room.leave();

// Byakuya e Kenpachi jogáveis: no nível 100, T leva ao último estágio da obra
for (const [cid, last] of [["byakuya", "Shūkei: Hakuteiken"], ["kenpachi", "Bankai"]] as const) {
  const k = await bot(`Evo ${cid}`, { level: 100, exp: expForLevel(100), hp: 99999, rei: 99999 }, cid);
  k.room.send("transform");
  ok(`${CHARS[cid].name} jogável: no nível 100, T vai a ${last}`, await until(() => k.me()?.form === 4) && CHARS[cid].forms[4].label === last);
  await k.room.leave();
}

// subir para o nível 25 ensina a técnica nova
const b = await bot("Evo Beto", { level: 24, exp: expForLevel(25) - 1, hp: 9999, rei: 9999, autoHunt: true });
ok("ao chegar no nível 25, aprende Getsuga Jūjishō", await until(() => b.logs.some((l) => l.includes("Nova técnica: Getsuga Jūjishō")), 20000));
b.room.send("auto", { autoHunt: false });
await b.room.leave();
done();
