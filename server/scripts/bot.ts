// Teste: entra, liga Auto Hunt, desconecta (hunt offline) e volta com relatório.
import { expForLevel, nearestWalkable } from "../../shared/src";
import { HOME } from "../src/maps";
import { play, patchSave, sleep, ok, done, playWithReport } from "./lib";

const name = process.argv[2] ?? "Bot Teste";
const id = name.toLowerCase();
const spot = nearestWalkable(HOME, 38, 7);
let room = await play(name, "ichigo", (i) => patchSave(i, { level: 12, exp: expForLevel(12), hp: 9999, map: "karakura", ...spot }));
await sleep(500);
const me = () => room.state.players.get(id);
const exp0 = me().exp;
room.send("auto", { autoHunt: true, autoHeal: 50 });
await sleep(12000);
ok(`caça online (+${me().exp - exp0} XP em 12 s)`, me().exp > exp0);
await room.leave();
await sleep(1000);
// outro jogador vê o personagem ainda no mundo (espera o estado sincronizar antes de olhar)
const obs = await play("Olheiro");
await sleep(800);
const off = obs.state.players.get(id);
ok("depois de sair, segue no mundo (offline)", off?.online === false);
await obs.leave();
await sleep(10000);
const back = await playWithReport(name);
room = back.room;
const rep: any = await back.report;
ok(`relatório da hunt offline (+${rep.exp} XP, +${rep.gold} kan)`, rep.exp > 0);
ok(`relatório conta abates e loot offline (${rep.kills} abates; ${rep.items?.join(", ") || "sem itens"})`, rep.kills > 0 && Array.isArray(rep.items));
room.send("auto", { autoHunt: false });
await room.leave();
done();
