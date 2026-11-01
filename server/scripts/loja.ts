// Loja de Cristais: cristais grátis na diária, compra, equipar e tirar, crônica com título,
// técnica com visual comprado, traje que troca o visual (e não muda quem já é capitão),
// e cosmético que continua equipado depois de sair e voltar.
import { expForLevel, nearestWalkable, COSMETIC, FREE_CRYSTALS } from "../../shared/src";
import { HOME } from "../src/maps";
import { play, patchSave, grantCrystals, sleep, ok, done } from "./lib";

const until = async (f: () => unknown, ms = 8000) => { for (let t = 0; t < ms && !f(); t += 100) await sleep(100); return !!f(); };

async function bot(name: string, charId = "ichigo") {
  const logs: string[] = [];
  const fx: any[] = [];
  let shop: any = null;
  let crystals = -1;
  const room = await play(name, charId, (id) => patchSave(id, { map: "karakura", ...nearestWalkable(HOME, 38, 8), level: 60, exp: expForLevel(60), hp: 9999, rei: 9999 }),
    (r) => {
      r.onMessage("log", (m) => logs.push(m.text));
      r.onMessage("fx", (m) => fx.push(m));
      r.onMessage("shopData", (m) => (shop = m));
      r.onMessage("crystals", (m) => (crystals = m.crystals));
    });
  await sleep(300);
  return { room, logs, fx, shop: () => shop, crystals: () => crystals, me: () => room.state.players.get(name.toLowerCase()) };
}

const a = await bot("Loja Lia");
a.room.send("shopOpen");
ok("loja abre com 0 cristais", await until(() => a.shop()?.crystals === 0));
a.room.send("shopBuy", { id: "aura_sakura" });
ok("sem cristais não compra", await until(() => a.logs.some((l) => l.includes("Faltam 220 cristais"))));
a.room.send("daily");
ok(`a recompensa diária dá ${FREE_CRYSTALS.daily} cristais`, await until(() => a.crystals() === FREE_CRYSTALS.daily));

grantCrystals("loja lia", 1000);
const start = 1000 + FREE_CRYSTALS.daily;
a.room.send("shopOpen");
ok("cristais da conta aparecem na loja", await until(() => a.shop()?.crystals === start));
a.room.send("shopBuy", { id: "aura_sakura" });
ok("compra a aura e ela já sai equipada", await until(() => a.me().cosAura === "aura_sakura"));
ok("desconta o preço", await until(() => a.shop()?.crystals === start - 220 && a.shop()?.owned.includes("aura_sakura")));
a.room.send("shopBuy", { id: "aura_sakura" });
ok("não compra duas vezes", await until(() => a.logs.some((l) => l.includes("já é seu"))) && a.shop().crystals === start - 220);

a.room.send("shopBuy", { id: "lore_karakura" });
ok("crônica libera o título", await until(() => a.me().cosTitle === "lore_karakura") && a.logs.some((l) => l.includes(COSMETIC.lore_karakura.title!)));
a.room.send("shopEquip", { kind: "title" });
ok("tira o título", await until(() => a.me().cosTitle === ""));
a.room.send("shopEquip", { id: "lore_karakura" });
ok("volta a usar o título da crônica", await until(() => a.me().cosTitle === "lore_karakura"));
a.room.send("shopEquip", { id: "pet_dourada" });
ok("não equipa o que não comprou", await until(() => a.logs.some((l) => l.includes("não é da sua conta"))) && a.me().cosPet === "");

a.room.send("shopBuy", { id: "fx_raio" });
await until(() => a.me().cosFx === "fx_raio");
a.room.send("auto", { autoTarget: true });
await until(() => !!a.me().targetId);
for (let i = 0; i < 20 && !a.fx.some((f) => f.t === "skill" && f.skin); i++) { a.room.send("skill", { slot: 1 }); await sleep(400); }
ok("técnica sai com o visual comprado", a.fx.some((f) => f.t === "skill" && f.skin && f.color === COSMETIC.fx_raio.color));
a.room.send("auto", { autoTarget: false });

// R-13: traje troca o visual de todos (look), cobre o do equipamento e volta a ele ao tirar
const gearLook = a.me().look;
a.room.send("shopBuy", { id: "traje_capitao" });
ok("compra o haori de capitão e o visual troca", await until(() => a.me().look === "capitao"));
a.room.send("shopEquip", { kind: "outfit" });
ok("tira o traje e volta o visual do equipamento", await until(() => a.me().look === gearLook && a.shop()?.equip.outfit === undefined));
a.room.send("shopEquip", { id: "traje_capitao" });
ok("veste de novo", await until(() => a.me().look === "capitao"));
await a.room.leave();
await sleep(500);

const b = await bot("Loja Lia");
ok("cosméticos continuam equipados depois de voltar", b.me().cosAura === "aura_sakura" && b.me().cosTitle === "lore_karakura" && b.me().cosFx === "fx_raio");
ok("o traje também continua", b.me().look === "capitao");
await b.room.leave();

// capitão já veste o próprio haori: o traje não muda nada nele e o aviso diz isso; o uniforme muda
const t = await bot("Loja Toshiro", "hitsugaya");
const tLook = t.me().look;
grantCrystals("loja toshiro", 400);
t.room.send("shopBuy", { id: "traje_capitao" });
ok("haori de capitão não muda o Hitsugaya", await until(() => t.logs.some((l) => l.includes("não muda o visual de"))) && t.me().look === tLook);
t.room.send("shopBuy", { id: "traje_karakura" });
ok("o uniforme de Karakura muda", await until(() => t.me().look === "karakura"));
await t.room.leave();
done();
