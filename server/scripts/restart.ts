// Teste de retomada. Uso:
//   npx tsx scripts/restart.ts antes   -> A caça offline; B fica online caçando (mate o servidor com B conectado)
//   npx tsx scripts/restart.ts depois  -> confere que A e B voltaram a caçar após reiniciar e recebe o relatório
import { play, sleep } from "./lib";

const mode = process.argv[2];
if (mode === "antes") {
  const a = await play("Reinicio A");
  a.send("auto", { autoHunt: true, autoHeal: 50 });
  await sleep(1500);
  await a.leave();
  console.log("A caçando offline");
  const b = await play("Reinicio B", "renji");
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
  console.log("logo após subir:", snap());
  await sleep(10000);
  console.log("10 s depois:", snap());
  await obs.leave();
  const a = await play("Reinicio A");
  const rep = await new Promise((r) => a.onMessage("offline", r));
  console.log("relatório de A:", rep);
  a.send("auto", { autoHunt: false });
  await a.leave();
  const b = await play("Reinicio B", "renji");
  b.onMessage("offline", (m) => console.log("relatório de B:", m));
  await sleep(800);
  b.send("auto", { autoHunt: false });
  await b.leave();
  process.exit(0);
}
