// Níveis 60–150: Karakura Falsa (60+) e Wandenreich (95+), com monstros, chefes, equipamento e missões novos.
import { expForLevel, nearestWalkable, MONSTERS, ITEMS, LOOT, QUEST_BY_ID, SETS, BOSSES, TRAVEL } from "../../shared/src";
import { HOME, MAPS } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

const ZONES = {
  falsa: ["fraccion_espada", "arrancar_resurreccion", "vasto_lorde", "ayon"],
  wandenreich: ["soldado_wandenreich", "sternritter", "sternritter_vollstandig", "yhwach"],
};
for (const [map, kinds] of Object.entries(ZONES)) {
  const spawned = new Set(MAPS[map].spawns.map((s) => s.kind));
  ok(`${MAPS[map].name}: ${kinds.length} monstros com spawn, loot e sprite`, kinds.every((k) => spawned.has(k) && LOOT[k] && MONSTERS[k]?.sprite === k));
  ok(`${MAPS[map].name}: chegada na zona segura`, !!MAPS[map].arrivals[map] && MAPS[map].pz.length > 0 && !MAPS[map].temple && !MAPS[map].shop);
}
ok("Ayon e Yhwach são chefes", BOSSES.has("ayon") && BOSSES.has("yhwach"));
// cada zona paga mais XP por vida do monstro que a anterior não pagava: a progressão continua
const order = [...ZONES.falsa.slice(0, 3), ...ZONES.wandenreich.slice(0, 3)].map((k) => MONSTERS[k]);
ok("cada monstro novo é mais forte e dá mais XP que o anterior", order.every((m, i) => i === 0 || (m.hp > order[i - 1].hp && m.exp > order[i - 1].exp)));
const loot = new Set(Object.values(LOOT).flatMap((t) => t.items.map((i) => i.item)));
const gear = Object.values(ITEMS).filter((i) => i.slot && (i.minLevel ?? 0) >= 60);
ok(`${gear.length} peças de equipamento novas, todas caem de algum monstro`, gear.length >= 9 && gear.every((i) => loot.has(i.id)));
ok("conjuntos Exército de Aizen e Sternritter", SETS.some((s) => s.id === "espada") && SETS.some((s) => s.id === "sternritter"));
ok("8 missões novas do 60 ao 140", ["falsa", "resurreccion", "vasto", "ayon", "wandenreich", "sternritter", "vollstandig", "yhwach"].every((id) => QUEST_BY_ID[id]));
ok("viagens com nível mínimo", TRAVEL.find((t) => t.id === "falsa")?.minLevel === 60 && TRAVEL.find((t) => t.id === "wandenreich")?.minLevel === 95);

const near = nearestWalkable(HOME, HOME.gate!.x, HOME.gate!.y + 1);
async function bot(name: string, level: number) {
  const logs: string[] = [];
  const fx: any[] = [];
  const room = await play(name, "ichigo", (id) => patchSave(id, {
    level, exp: expForLevel(level), hp: 99999, rei: 99999, gold: 5000, map: "karakura", ...near,
  }), (r) => { r.onMessage("log", (m) => logs.push(m.text)); r.onMessage("fx", (m) => fx.push(m)); });
  await sleep(300);
  return { room, logs, fx, me: () => room.state.players.get(name.toLowerCase()) };
}
const until = async (f: () => unknown, ms = 8000) => { for (let t = 0; t < ms && !f(); t += 100) await sleep(100); return !!f(); };

const a = await bot("Falsa Ana", 59);
a.room.send("travel", { dest: "falsa" });
ok("nível 59 não entra na Karakura Falsa", await until(() => a.logs.some((l) => l.includes("exige nível 60"))) && a.me().map === "karakura");
await a.room.leave();

const b = await bot("Falsa Beto", 70);
b.room.send("travel", { dest: "falsa" });
ok("nível 70 chega na Karakura Falsa", await until(() => b.me().map === "falsa"));
const seen = new Set([...b.room.state.monsters.values()].filter((m: any) => m.map === "falsa").map((m: any) => m.kind));
ok(`os 4 monstros da cidade no estado (${[...seen].join(", ")})`, ZONES.falsa.every((k) => seen.has(k)));
b.room.send("travel", { dest: "wandenreich" });
ok("nível 70 não entra no Wandenreich", await until(() => b.logs.some((l) => l.includes("exige nível 95"))));
// sem equipamento e em Shikai, vários monstros juntos matam: caça como um jogador desse nível (equipado e com Bankai)
b.room.send("dev", { a: "gear" });
b.room.send("auto", { autoTarget: true, autoHunt: true, autoBankai: true });
const hunted = await until(() => b.logs.some((l) => /(Fracción de Espada|Arrancar em Resurrección|Vasto Lorde) derrotado/.test(l)), 60000);
ok(`caça na Karakura Falsa e ganha XP${hunted ? "" : ` [${b.me().x},${b.me().y} alvo ${b.me().targetId}] ${b.logs.slice(-6).join(" | ")}`}`, hunted);
b.room.send("auto", { autoTarget: false, autoHunt: false });
await b.room.leave();

const c = await bot("Wanden Caio", 100);
c.room.send("travel", { dest: "wandenreich" });
ok("nível 100 chega no Wandenreich", await until(() => c.me().map === "wandenreich"));
const seen2 = new Set([...c.room.state.monsters.values()].filter((m: any) => m.map === "wandenreich").map((m: any) => m.kind));
ok(`os 4 do Wandenreich no estado (${[...seen2].join(", ")})`, ZONES.wandenreich.every((k) => seen2.has(k)));
await c.room.leave();
done();
