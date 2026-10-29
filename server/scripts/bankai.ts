// Teste: personagem nível 12 entra, ativa Bankai, verifica velocidade e dreno de reiatsu.
import { expForLevel } from "../../shared/src";
import { TEMPLE } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

const room = await play("Teste Bankai", "ichigo", (id) =>
  patchSave(id, { level: 12, exp: expForLevel(12), hp: 9999, rei: 9999, map: "karakura", x: TEMPLE.x, y: TEMPLE.y }));
await sleep(500);
const me = () => room.state.players.get("teste bankai");
const rei0 = me().rei;
ok("começa em Shikai (passo 260 ms)", me().form === 0 && me().stepMs === 260);
room.send("transform");
await sleep(2000);
ok(`Bankai: mais rápido (${me().stepMs} ms) e drena reiatsu (${Math.round(rei0)} → ${Math.round(me().rei)})`, me().form === 1 && me().stepMs < 260 && me().rei < rei0);
room.send("transform");
// espera o estado chegar (no CI o tick pode atrasar mais que 300 ms)
for (let t = 0; t < 3000 && !(me().form === 0 && me().stepMs === 260); t += 100) await sleep(100);
ok("T de novo volta ao Shikai", me().form === 0 && me().stepMs === 260);
await room.leave();
done();
