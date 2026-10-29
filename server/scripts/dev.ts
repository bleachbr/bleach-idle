// Modo Dev: fora de produção o servidor aceita os atalhos de teste (nível, kan, cristais, equipamento, itens, imortal).
import { expForLevel, nearestWalkable, maxForm, EQUIP_SLOTS } from "../../shared/src";
import { HOME } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

const logs: string[] = [];
let dev: { god: boolean } | undefined;
let inv: any;
let crystals = 0;
const room = await play("Dev Ana", "ichigo", (id) => patchSave(id, { map: "karakura", ...nearestWalkable(HOME, 38, 8), level: 8, exp: expForLevel(8) }),
  (r) => {
    r.onMessage("log", (m) => logs.push(m.text));
    r.onMessage("devMode", (m) => (dev = m));
    r.onMessage("inv", (m) => (inv = m));
    r.onMessage("crystals", (m) => (crystals = m.crystals));
  });
const me = () => room.state.players.get("dev ana");
const until = async (f: () => unknown, ms = 5000) => { for (let t = 0; t < ms && !f(); t += 100) await sleep(100); return !!f(); };
await sleep(300);

room.send("devHello");
ok("fora de produção o servidor libera o modo Dev", await until(() => dev));

room.send("dev", { a: "level", n: 100 });
ok("nível 100 na hora, com o 5º estágio liberado", await until(() => me().level === 100) && maxForm("ichigo", me().level) === 4 && me().exp === expForLevel(100));
room.send("transform");
ok("T vai direto ao Mugetsu", await until(() => me().form === 4));
room.send("dev", { a: "level", n: 1 });
ok("voltar ao nível 1 tira a forma que não vale mais", await until(() => me().level === 1 && me().form === 0));

room.send("dev", { a: "gold" });
ok("+1.000.000 kan", await until(() => inv?.gold >= 1_000_000));
room.send("dev", { a: "crystals" });
ok("+1.000 cristais na conta", await until(() => crystals >= 1000));
room.send("dev", { a: "gear" });
ok("melhor equipamento em todos os espaços", await until(() => inv && EQUIP_SLOTS.every((s) => inv.equip[s])));
room.send("dev", { a: "items" });
ok("poções, caixas e pedras no inventário", await until(() => logs.some((l) => l.startsWith("Dev:") && l.includes("Caixa do Kisuke"))));

room.send("dev", { a: "god" });
ok("imortal ligado", await until(() => dev?.god === true));
room.send("dev", { a: "god" });
ok("e desliga de novo", await until(() => dev?.god === false));

await room.leave();
done();
