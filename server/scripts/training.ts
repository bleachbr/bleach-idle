// Treino: Zanjutsu nos bonecos (que não morrem), Reiryoku com Auto Treino e treino offline.
import { expForLevel } from "../../shared/src";
import { MAPS } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

const dummies = MAPS.soul.spawns.filter((s) => s.kind === "boneco");
ok(`a Soul Society tem bonecos de treino (${dummies.length})`, dummies.length >= 1);
const d0 = dummies[0];
const spot = { map: "soul", x: d0.x - 1, y: d0.y };

const room = await play("Treino Tania", "rukia", (id) => patchSave(id, {
  level: 20, exp: expForLevel(20), hp: 9999, rei: 9999, gold: 0, ...spot,
  zanjutsu: 0, zanTries: 35, reiryoku: 0, reiTries: 140, autoTrain: false, autoHunt: false,
}));
const logs: string[] = [];
room.onMessage("log", (m) => logs.push(m.text));
await sleep(400);
const me = () => room.state.players.get("treino tania");
const dummy = [...room.state.monsters.values()].find((m: any) => m.kind === "boneco" && m.map === "soul" && m.x === d0.x && m.y === d0.y);
ok("boneco está no lugar do spawn", !!dummy);

// Zanjutsu: golpes no boneco
const exp0 = me().exp;
room.send("target", { id: dummy.id });
await sleep(9000);
ok(`golpes no boneco sobem o Zanjutsu (agora ${me().zanjutsu})`, me().zanjutsu >= 1 && logs.some((l) => l.includes("Zanjutsu subiu")));
ok("boneco não morre e não dá XP", room.state.monsters.has(dummy.id) && me().exp === exp0);
const bonecos = [...room.state.monsters.values()].filter((m: any) => m.kind === "boneco").length;
ok(`nenhum boneco a mais nem a menos (${bonecos})`, bonecos === dummies.length);

// Reiryoku: Auto Treino fora de combate
room.send("target", { id: "" });
room.send("auto", { autoTrain: true });
await sleep(9000); // sai de combate (6 s) e queima reiatsu
ok(`Auto Treino queima reiatsu e sobe o Reiryoku (agora ${me().reiryoku})`, me().reiryoku >= 1 && logs.some((l) => l.includes("Reiryoku subiu")));

// treino offline: sai com Auto Treino ligado e mirando o boneco
room.send("target", { id: dummy.id });
await sleep(1500);
const pct0 = me().zanPct;
const zan0 = me().zanjutsu;
await room.leave();
const obs = await play("Olheiro");
await sleep(8000);
const off = obs.state.players.get("treino tania");
ok("com Auto Treino, segue no mundo depois de sair", off?.online === false);
ok(`segue treinando Zanjutsu offline (${zan0} ${pct0}% → ${off?.zanjutsu} ${off?.zanPct}%)`, !!off && (off.zanjutsu > zan0 || off.zanPct > pct0));
await obs.leave();
const back = await play("Treino Tania", "rukia");
const rep: any = await new Promise((r) => back.onMessage("offline", r));
ok("relatório da volta traz as habilidades", typeof rep.zanjutsu === "number" && typeof rep.reiryoku === "number");
back.send("auto", { autoTrain: false });
back.send("target", { id: "" });
await sleep(200);
await back.leave();
done();
