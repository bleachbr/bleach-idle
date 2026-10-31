// Passe de temporada (pontos, prêmios, cosmético exclusivo) e chefe mundial (prêmio para quem acertou).
// Eventos narrados (R-12): o chefe mundial manda uma linha de lore no chat e um banner (`event`) a todos.
import { expForLevel, nearestWalkable, SEASON, SEASON_PTS, seasonId, WORLD_BOSS, EVENT_LORE, type EventBanner } from "../../shared/src";
import { HOME } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

const until = async (f: () => unknown, ms = 8000) => { for (let t = 0; t < ms && !f(); t += 100) await sleep(100); return !!f(); };

const logs: string[] = [];
const chat: string[] = [];
const lore: string[] = [];
const events: EventBanner[] = [];
let season: any = null, shop: any = null, inv: any = null;
const room = await play("Temp Tina", "ichigo", (id) => patchSave(id, { map: "karakura", ...nearestWalkable(HOME, 38, 8), level: 60, exp: expForLevel(60), hp: 9999, rei: 9999, gold: 0 }),
  (r) => {
    r.onMessage("log", (m) => logs.push(m.text));
    r.onMessage("chat", (m) => { chat.push(m.text); if (m.ch === "lore") lore.push(m.text); });
    r.onMessage("event", (m) => events.push(m));
    r.onMessage("season", (m) => (season = m));
    r.onMessage("shopData", (m) => (shop = m));
    r.onMessage("inv", (m) => (inv = m));
  });
const me = () => room.state.players.get("temp tina");

ok("ao entrar recebe o passe da temporada do mês", await until(() => season?.id === seasonId(Date.now()) && season.pts === 0));
room.send("debugSeasonPts", { n: SEASON.perTier * 3 + 10 });
ok("ao passar de nível no passe, avisa", await until(() => logs.some((l) => l.includes("Passe de temporada: nível 3"))));
room.send("seasonClaim");
ok("pega os prêmios dos níveis 1 a 3 de uma vez", await until(() => logs.some((l) => l.includes("níveis 1 a 3"))) && season.claimed === 3);
ok("o prêmio do nível 1 é kan", await until(() => inv?.gold >= 300));
room.send("seasonClaim");
ok("não pega de novo", await until(() => logs.some((l) => l.includes("Nenhum prêmio novo"))));

room.send("debugSeasonPts", { n: SEASON.perTier * 7 });
room.send("seasonClaim");
ok("nível 10 dá a aura exclusiva, já equipada", await until(() => me().cosAura === "aura_eclipse"));
room.send("shopBuy", { id: "pet_eclipse" });
ok("prêmio do passe não se compra na loja", await until(() => logs.some((l) => l.includes("só sai no passe"))));

const before = season.pts;
room.send("daily");
ok(`recompensa diária soma ${SEASON_PTS.daily} pontos`, await until(() => season.pts === before + SEASON_PTS.daily));

// chefe mundial (no teste ele tem pouca vida)
const t0 = Date.now();
room.send("debugWorldBoss");
ok("o chefe mundial aparece e avisa todo mundo", await until(() => chat.some((t) => t.includes("Menos Ancião apareceu"))));
ok("o chat narra a chegada com uma linha de lore", await until(() => lore.some((t) => EVENT_LORE.bossSpawn.includes(t))));
ok("o banner do chefe vale até ele ir embora", await until(() => events.some((e) =>
  e.kind === "worldBoss" && e.phase === "bossSpawn" && e.until >= t0 + WORLD_BOSS.durationMs - 1000)));
const boss = () => [...room.state.monsters.values()].find((m: any) => m.kind === "menos_anciao");
ok("ele está no mapa", !!boss());
const pts = season.pts;
room.send("auto", { autoTarget: true, autoHunt: true });
room.send("target", { id: boss()?.id });
ok("derrotar o chefe dá prêmio a quem acertou", await until(() => logs.some((l) => l.includes("Chefe mundial derrotado")), 60000));
ok(`e ${SEASON_PTS.worldBoss} pontos de passe`, await until(() => season.pts >= pts + SEASON_PTS.worldBoss));
ok("anuncia quem deu o golpe final", await until(() => chat.some((t) => t.includes("deu o golpe final"))));
ok("o chat narra a queda do chefe", await until(() => lore.some((t) => EVENT_LORE.bossKilled.includes(t))));
ok("o banner troca para a vitória", await until(() => events.some((e) => e.kind === "worldBoss" && e.phase === "bossKilled")));
room.send("auto", { autoTarget: false, autoHunt: false });
await room.leave();
done();
