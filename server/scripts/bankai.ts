// Teste: personagem nível 12 entra, ativa Bankai, verifica velocidade e dreno de reiatsu.
import { expForLevel } from "../../shared/src";
import { play, patchSave, sleep } from "./lib";

const room = await play("Teste Bankai", "ichigo", (id) =>
  patchSave(id, { level: 12, exp: expForLevel(12), hp: 9999, rei: 9999, x: 16, y: 14 }));
room.onMessage("log", (m) => console.log("  log:", m.text));
await sleep(500);
const me = () => room.state.players.get("teste bankai");
console.log("antes:", { lvl: me().level, form: me().form, stepMs: me().stepMs, rei: me().rei });
room.send("transform");
await sleep(2000);
console.log("Bankai 2s:", { form: me().form, stepMs: me().stepMs, rei: Math.round(me().rei) });
room.send("transform");
await sleep(300);
console.log("desfez:", { form: me().form, stepMs: me().stepMs });
await room.leave();
process.exit(0);
