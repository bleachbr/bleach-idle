// Teste de retomada. Uso:
//   npx tsx scripts/restart.ts antes   -> A caça offline; B fica online caçando (mate o servidor com B conectado)
//   npx tsx scripts/restart.ts depois  -> confere que A e B voltaram a caçar após reiniciar e recebe o relatório
import { nearestWalkable } from "../../shared/src";
import { HOME } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

const mode = process.argv[2];
if (mode === "antes") {
  const a = await play("Reinicio A");
  const b = await play("Reinicio B", "renji");
  a.send("partyInvite", { id: "reinicio b" });
  await sleep(300);
  b.send("partyAnswer", { accept: true });
  await sleep(300);
  // C morre perto dos Hollows: o corpo (com o kan perdido) tem que sobreviver à queda
  const c = await play("Reinicio C", "ichigo", (id) => patchSave(id, { hp: 3, gold: 1000, equip: {}, map: "karakura", ...nearestWalkable(HOME, 38, 6) }));
  const died = new Promise((r) => c.onMessage("death", r));
  c.send("auto", { autoHunt: true, autoHeal: 0 });
  await Promise.race([died, sleep(20000)]);
  await c.leave();
  console.log("C morreu e deixou o corpo");
  a.send("auto", { autoHunt: true, autoHeal: 50 });
  await sleep(1500);
  await a.leave();
  console.log("A caçando offline, em party com B");
  b.send("auto", { autoHunt: true, autoHeal: 50 });
  await sleep(11000); // passa de um save periódico (10 s)
  console.log("B online caçando; pode derrubar o servidor agora");
  b.onLeave(() => { console.log("B: conexão caiu (servidor parou)"); process.exit(0); });
  await sleep(120000);
} else {
  const obs = await play("Olheiro");
  await sleep(500);
  const snap = () => ["reinicio a", "reinicio b"].map((id) => {
    const p = obs.state.players.get(id);
    return p ? `${id}: online=${p.online} hunt=${p.autoHunt} exp=${p.exp} pos=${p.x},${p.y}` : `${id}: ausente`;
  });
  const before = ["reinicio a", "reinicio b"].map((id) => obs.state.players.get(id)?.exp ?? 0);
  ok(`A e B voltaram ao mundo caçando offline: ${snap().join(" | ")}`, ["reinicio a", "reinicio b"].every((id) => obs.state.players.get(id)?.online === false && obs.state.players.get(id)?.autoHunt));
  ok(`o corpo de C continua no chão depois da queda (${obs.state.bags.size} no mapa)`, [...obs.state.bags.values()].some((b: any) => b.kind === "corpo" && b.label.includes("Reinicio C")));
  await sleep(10000);
  const pa = obs.state.players.get("reinicio a"), pb = obs.state.players.get("reinicio b");
  ok("a party de A e B sobreviveu ao reinício", !!pa?.partyId && pa.partyId === pb?.partyId);
  ok("seguem ganhando XP depois do reinício", ["reinicio a", "reinicio b"].every((id, i) => (obs.state.players.get(id)?.exp ?? 0) > before[i]));
  await obs.leave();
  const a = await play("Reinicio A");
  const rep = await new Promise((r) => a.onMessage("offline", r));
  ok(`relatório de A na volta (+${(rep as any).exp} XP)`, (rep as any).exp > 0);
  a.send("auto", { autoHunt: false });
  await a.leave();
  const b = await play("Reinicio B", "renji");
  b.onMessage("offline", (m) => console.log("relatório de B:", m));
  await sleep(800);
  b.send("auto", { autoHunt: false });
  await b.leave();
  done();
}
