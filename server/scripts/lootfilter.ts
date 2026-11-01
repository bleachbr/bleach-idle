// Filtro de loot do Auto Helper (M3-03): ignorar e vender por item, o item de missão de coleta sempre pego,
// regra inválida recusada e o filtro salvo no personagem.
import { expForLevel, countItem } from "../../shared/src";
import { TEMPLE } from "../src/maps";
import { play, patchSave, sleep, ok, done } from "./lib";

// o loot é sorteado: espera até 150 s pela queda, como o cenário hunt
const until = async (f: () => unknown, ms = 150000) => { for (let t = 0; t < ms && !f(); t += 250) await sleep(250); return !!f(); };

async function bot(name: string, fields: Record<string, unknown> = {}) {
  const logs: string[] = [];
  let inv: any, rules: any;
  const room = await play(name, "ichigo", (id) => patchSave(id, { map: "karakura", x: TEMPLE.x, y: TEMPLE.y, level: 20, exp: expForLevel(20), hp: 9999, inv: [], gold: 0, ...fields }),
    (r) => { r.onMessage("log", (m) => logs.push(m.text)); r.onMessage("inv", (m) => (inv = m)); r.onMessage("lootRules", (m) => (rules = m)); });
  await sleep(300);
  return { room, logs, inv: () => inv, rules: () => rules };
}

/** Caça na Floresta Leste até `f` valer (ou o tempo acabar). */
async function hunt(b: Awaited<ReturnType<typeof bot>>, f: () => unknown) {
  b.room.send("travel", { dest: "leste" });
  await sleep(400);
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

// vender: vira kan na hora
a.room.send("lootRules", { rules: { fragmento: "sell" } });
await until(() => a.rules()?.rules.fragmento === "sell", 5000);
const sold = await hunt(a, () => a.logs.some((l) => l.includes("(vendido)")));
ok(`com o fragmento à venda, ele aparece como vendido no loot (${loots(a).slice(-3).join(" | ")})`, sold && a.logs.some((l) => /Fragmento de M.scara \(vendido\)/.test(l)));
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
done();
