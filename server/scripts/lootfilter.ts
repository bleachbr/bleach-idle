// Filtro de loot do Auto Helper (M3-03): ignorar e vender por item, o item de missão de coleta sempre pego,
// regra inválida recusada e o filtro salvo no personagem.
import { expForLevel, countItem, ITEMS, nearestWalkable } from "../../shared/src";
import { HOME, TEMPLE } from "../src/maps";
import { play, patchSave, playWithReport, sleep, ok, done } from "./lib";

// o loot é sorteado: espera até 150 s pela queda, como o cenário hunt
const until = async (f: () => unknown, ms = 150000) => { for (let t = 0; t < ms && !f(); t += 250) await sleep(250); return !!f(); };

async function bot(name: string, fields: Record<string, unknown> = {}) {
  const logs: string[] = [];
  let inv: any, rules: any;
  // kan para as viagens (a Floresta Leste custa 30) e nível 40 com poções: o bot não pode morrer no meio (a morte leva
  // 10% do kan e o devolve ao templo, e a conta do kan quebra; o hp do save é cortado no máximo do nível)
  const room = await play(name, "ichigo", (id) => patchSave(id, { map: "karakura", x: TEMPLE.x, y: TEMPLE.y, level: 40, exp: expForLevel(40), hp: 9999, inv: [{ id: "pocao_vida", qty: 50 }], gold: 1000, ...fields }),
    (r) => { r.onMessage("log", (m) => logs.push(m.text)); r.onMessage("inv", (m) => (inv = m)); r.onMessage("lootRules", (m) => (rules = m)); });
  await sleep(300);
  return { room, logs, inv: () => inv, rules: () => rules };
}

/** Caça na Floresta Leste até `f` valer (ou o tempo acabar). `beforeHunt` roda depois da viagem, antes de caçar. */
async function hunt(b: Awaited<ReturnType<typeof bot>>, f: () => unknown, beforeHunt?: () => void) {
  const n = b.logs.length;
  b.room.send("travel", { dest: "leste" });
  // a viagem cobra kan e responde no log: espera a resposta para a conta de kan começar depois dela
  await until(() => b.logs.slice(n).some((l) => /Viajou|viagem|Viajar|Faltam|já está/i.test(l)), 5000);
  await sleep(300);
  beforeHunt?.();
  b.room.send("auto", { autoHunt: true, autoHeal: 40 });
  const r = await until(f);
  b.room.send("auto", { autoHunt: false });
  await sleep(300);
  return r;
}

const loots = (b: Awaited<ReturnType<typeof bot>>) => b.logs.filter((l) => l.startsWith("Loot:"));

const a = await bot("Filtro Ana");
ok("ao entrar, recebe o filtro (vazio) e os itens já vistos", !!a.rules() && Object.keys(a.rules().rules).length === 0 && Array.isArray(a.rules().seen));

// ignorar: o Fragmento de Máscara não entra no inventário
a.room.send("lootRules", { rules: { fragmento: "ignore" } });
ok("o servidor guarda e devolve a regra", await until(() => a.rules()?.rules.fragmento === "ignore", 5000));
ok("caçando com o fragmento ignorado", await hunt(a, () => loots(a).length >= 12));
ok(`fragmento ignorado não entra no inventário (${countItem(a.inv().inv, "fragmento")})`, countItem(a.inv().inv, "fragmento") === 0);

// vender: vira kan na hora, e o kan entra de verdade (loot em kan + preço da loja de cada fragmento vendido)
a.room.send("lootRules", { rules: { fragmento: "sell" } });
await until(() => a.rules()?.rules.fragmento === "sell", 5000);
let logs0 = a.logs.length;
let gold0 = 0;
// a conta do kan começa depois da viagem (que cobra 30), quando o bot já está na floresta e ainda não caçou
const sold = await hunt(a, () => a.logs.some((l) => l.includes("(vendido)")), () => { gold0 = a.inv().gold; logs0 = a.logs.length; });
await sleep(500);
const fresh = a.logs.slice(logs0).filter((l) => l.startsWith("Loot:"));
const lootKan = fresh.reduce((s, l) => s + Number(/^Loot: (\d+) kan/.exec(l)?.[1] ?? 0), 0);
const soldQty = fresh.reduce((s, l) => s + [...l.matchAll(/(\d+)x Fragmento de M.scara \(vendido\)/g)].reduce((t, m) => t + Number(m[1]), 0), 0);
ok(`com o fragmento à venda, ele aparece como vendido no loot (${fresh.slice(-2).join(" | ")})`, sold && soldQty > 0);
ok(`o kan da venda entra no personagem (${a.inv().gold - gold0} = ${lootKan} do loot + ${soldQty} x ${ITEMS.fragmento.sell})`, a.inv().gold - gold0 === lootKan + soldQty * ITEMS.fragmento.sell);
ok(`e continua fora do inventário (${countItem(a.inv().inv, "fragmento")})`, countItem(a.inv().inv, "fragmento") === 0);
ok("o Hollow Menor já abatido põe o fragmento entre os itens vistos", a.rules().seen.includes("fragmento"));

// regra inválida: recusada, e lixo dentro do mapa sai
const before = { ...a.rules().rules };
a.room.send("lootRules", { rules: "vender tudo" });
ok("regra que não é objeto é recusada", await until(() => a.logs.some((l) => l.includes("Filtro de loot inválido")), 5000) && a.rules().rules.fragmento === before.fragmento);
a.room.send("lootRules", { rules: { fragmento: "sell", nao_existe: "sell", garra: "queimar", constructor: "ignore" } });
ok("item fora do catálogo e valor estranho saem", await until(() => JSON.stringify(a.rules().rules) === JSON.stringify({ fragmento: "sell" }), 5000));
await a.room.leave();
await sleep(500);

// o filtro fica salvo no personagem
const a2 = await bot("Filtro Ana");
ok("o filtro continua depois de sair e voltar", a2.rules()?.rules.fragmento === "sell");
await a2.room.leave();

// missão de coleta ativa: o item que ela pede é sempre pego, mesmo à venda
const m = await bot("Filtro Missao", { quests: { active: { fragmentos: 0 }, done: [] }, lootRules: { fragmento: "sell" } });
ok("com a missão dos fragmentos ativa, o servidor avisa que o fragmento é sempre pego", m.rules()?.keep.includes("fragmento"));
const got = await hunt(m, () => countItem(m.inv()?.inv ?? [], "fragmento") > 0);
ok(`e o fragmento entra no inventário (${countItem(m.inv()?.inv ?? [], "fragmento")})`, got);
await m.room.leave();

// caçada offline: o relatório da volta não lista o item ignorado (giveLoot é o mesmo caminho online e offline)
const offName = "Filtro Offline";
const off = await bot(offName, { ...nearestWalkable(HOME, 38, 7), level: 12, exp: expForLevel(12), lootRules: { fragmento: "ignore" } });
off.room.send("auto", { autoHunt: true, autoHeal: 50 });
await sleep(1500);
await off.room.leave();
await sleep(30000);
const back = await playWithReport(offName);
const rep: any = await back.report;
ok(`relatório offline sem o fragmento ignorado (${rep.kills} abates; ${rep.items?.join(", ") || "sem itens"})`,
  rep.kills >= 3 && !(rep.items ?? []).some((i: string) => i.includes("Fragmento")));
back.room.send("auto", { autoHunt: false });
await back.room.leave();
done();
