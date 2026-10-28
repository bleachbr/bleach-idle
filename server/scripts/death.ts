// Teste de morte (save com 5 de HP ao lado dos Fishbones):
//  1. com Amuleto da Alma: não perde XP, itens nem dinheiro; o amuleto some
//  2. sem amuleto, inventário cheio: perde 8% XP, 10% do dinheiro e ~10% dos itens; depot intacto
//  3. morrendo durante a hunt offline: o relatório da volta traz a morte
import { expForLevel, walkable, INV_SIZE } from "../../shared/src";
import { HOME } from "../src/maps";
import { play, patchSave, sleep, ok, done, playWithReport } from "./lib";

const map = HOME;
const spot = [[45, 39], [44, 40], [46, 40], [43, 41], [47, 41], [45, 43]].find(([x, y]) => walkable(map, x, y))!;
const EQUIP = { head: "bandana", armor: "haori", legs: "hakama", boots: "waraji", weapon: "zanpakuto", ring: "anel_rei" };
const fullInv = () => Array.from({ length: INV_SIZE }, (_, i) => ({ id: i % 2 ? "garra" : "fragmento", qty: 10 }));
const exp0 = expForLevel(16) + 500;
const base = { level: 16, exp: exp0, hp: 5, rei: 0, x: spot[0], y: spot[1], gold: 1000, depot: [{ id: "nucleo", qty: 7 }] };

async function dieOnline(name: string, amulet: boolean) {
  const room = await play(name, "rukia", (id) => patchSave(id, {
    ...base, inv: fullInv(), equip: amulet ? { ...EQUIP, amulet: "amuleto_alma" } : EQUIP,
  }));
  let inv: any;
  let death: any;
  room.onMessage("inv", (m) => (inv = m));
  room.onMessage("death", (m) => (death = m));
  const me = () => room.state.players.get(name.toLowerCase());
  for (let i = 0; i < 60 && !death; i++) await sleep(250);
  await sleep(300);
  const items = inv.inv.filter(Boolean).length + Object.keys(inv.equip).length;
  await room.leave();
  return { death, me: { exp: exp0 - (me()?.exp ?? 0) }, inv, items };
}

const a = await dieOnline("Morte Com Amu", true);
ok("com amuleto: tela de morte recebida", !!a.death);
ok("com amuleto: 0 XP, 0 kan, nenhum item perdido", a.death?.protected && a.death.exp === 0 && a.death.gold === 0 && a.death.items.length === 0);
ok("com amuleto: amuleto some, resto fica (6 equipados + 20 no inventário)", !a.inv.equip.amulet && a.items === 26);
ok("com amuleto: visual do haori mantido", a.inv.equip.armor === "haori");

const b = await dieOnline("Morte Sem Amu", false);
console.log("  sem amuleto perdeu:", b.death?.items);
ok("sem amuleto: perde 8% do XP", b.death?.exp === Math.floor(exp0 * 0.08));
ok("sem amuleto: perde 10% do dinheiro (100 de 1000)", b.death?.gold === 100 && b.inv.gold === 900);
ok("sem amuleto: itens que sobraram + perdidos = 26", b.items + b.death.items.length === 26);
ok("sem amuleto: depot intacto", b.inv.depot[0]?.id === "nucleo" && b.inv.depot[0]?.qty === 7);

// 3: liga Auto Hunt, sai (offline), morre sozinho, volta
const name = "Morte Offline";
// vida para aguentar uns segundos: com 40 ele às vezes morria antes de sair (morte online, sem relatório)
let room = await play(name, "renji", (id) => patchSave(id, { ...base, hp: 150, inv: [], equip: {} }));
room.send("auto", { autoHunt: true });
await sleep(300);
await room.leave();
await sleep(15000); // morre sozinho caçando (o CI é mais lento)
const back = await playWithReport(name, "renji");
room = back.room;
const rep: any = await Promise.race([back.report, sleep(15000).then(() => ({}))]);
ok("morte offline aparece no relatório da volta", rep.deaths?.length === 1 && rep.deaths[0].by === "Fishbone D");
ok("depois da morte offline ele saiu do mundo (Auto Hunt desligado)", room.state.players.get("morte offline")?.autoHunt === false);
await room.leave();
done();
