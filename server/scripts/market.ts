// Mercado entre jogadores (no Kisuke): anunciar, comprar, cancelar e receber offline.
import { nearestWalkable, countItem } from "../../shared/src";
import { HOME } from "../src/maps";
import { DatabaseSync } from "node:sqlite";
import { play, patchSave, sleep, once, ok, done, DB_FILE } from "./lib";

const shop = HOME.shop!;
const nearShop = nearestWalkable(HOME, shop.x - 1, shop.y + 1);
const garras = Array.from({ length: 20 }, (_, i) => (i === 0 ? { id: "garra", qty: 10 } : null));

async function bot(name: string, fields: Record<string, unknown>) {
  const room = await play(name, "ichigo", (id) => patchSave(id, { map: "karakura", ...nearShop, ...fields }));
  let inv: any, mk: any;
  const logs: string[] = [];
  room.onMessage("inv", (m) => (inv = m));
  room.onMessage("market", (m) => (mk = m));
  room.onMessage("log", (m) => logs.push(m.text));
  await sleep(300);
  room.send("marketList");
  await sleep(200);
  return { room, logs, inv: () => inv, mk: () => mk };
}

const a = await bot("Mercador Ana", { gold: 0, inv: garras });
const b = await bot("Mercador Beto", { gold: 1000, inv: [] });
const pobre = await bot("Mercador Pobre", { gold: 10, inv: [] });

a.room.send("marketSell", { index: 0, qty: 4, price: 50 });
await sleep(300);
const mine = a.mk().listings.find((l: any) => l.seller === "mercador ana");
ok("anunciar tira o item do inventário (10 → 6 garras)", !!mine && countItem(a.inv().inv, "garra") === 6);
a.room.send("marketSell", { index: 0, qty: 1, price: 0 });
a.room.send("marketSell", { index: 0, qty: 99, price: 10 });
a.room.send("marketSell", { index: 0, qty: 1.5, price: 10 });
await sleep(300);
ok("preço zero, quantidade maior que a pilha e fração são recusados", a.logs.filter((l) => l.includes("inválida") || l.includes("Preço")).length === 3);

pobre.room.send("marketBuy", { id: mine.id });
await sleep(200);
ok("comprador sem dinheiro é recusado", pobre.logs.some((l) => l.startsWith("Faltam")));
a.room.send("marketBuy", { id: mine.id });
await sleep(200);
ok("não dá para comprar o próprio anúncio", a.logs.some((l) => l.includes("é seu")));

b.room.send("marketBuy", { id: mine.id });
await sleep(400);
ok("compra: Beto paga 200 e recebe as 4 garras", b.inv().gold === 800 && countItem(b.inv().inv, "garra") === 4);
ok("vendedor online recebe 190 (200 menos 5%)", a.inv().gold === 190 && a.logs.some((l) => l.includes("190 kan")));
b.room.send("marketBuy", { id: mine.id });
await sleep(200);
ok("o mesmo anúncio não é vendido duas vezes", b.inv().gold === 800);

// cancelar devolve
a.room.send("marketSell", { index: 0, qty: 2, price: 30 });
await sleep(300);
const second = a.mk().listings.find((l: any) => l.seller === "mercador ana");
a.room.send("marketCancel", { id: second.id });
await sleep(300);
ok("cancelar devolve o item ao inventário", countItem(a.inv().inv, "garra") === 6 && !a.mk().listings.some((l: any) => l.id === second.id));

// vendedor fora do jogo recebe no save
a.room.send("marketSell", { index: 0, qty: 1, price: 100 });
await sleep(300);
const third = a.mk().listings.find((l: any) => l.seller === "mercador ana");
a.room.send("marketSell", { index: 0, qty: 1, price: 999 }); // fica parado (vence mais abaixo)
await sleep(300);
await a.room.leave();
await sleep(500);
b.room.send("marketBuy", { id: third.id });
await sleep(400);
const db = new DatabaseSync(DB_FILE);
const saved = JSON.parse((db.prepare("SELECT data FROM players WHERE id = 'mercador ana'").get() as { data: string }).data);
db.close();
ok(`vendedor fora do jogo recebe no save (${saved.gold} kan = 190 + 95)`, saved.gold === 285);

// anúncio com mais de 7 dias volta para o depot (online na hora; offline no save)
b.room.send("marketSell", { index: b.inv().inv.findIndex((sl: any) => sl?.id === "garra"), qty: 1, price: 70 });
await sleep(300);
const old = b.mk().listings.find((l: any) => l.seller === "mercador beto");
const wdb = new DatabaseSync(DB_FILE);
wdb.prepare("UPDATE market SET created_at = 0 WHERE id = ? OR seller = 'mercador ana'").run(old.id);
wdb.close();
b.room.send("marketList");
await sleep(400);
ok("anúncio vencido volta para o depot do vendedor online", countItem(b.inv().depot, "garra") === 1 && !b.mk().listings.some((l: any) => l.id === old.id));
const db2 = new DatabaseSync(DB_FILE);
const ana = JSON.parse((db2.prepare("SELECT data FROM players WHERE id = 'mercador ana'").get() as { data: string }).data);
db2.close();
ok(`anúncio vencido do vendedor offline vai para o depot no save (${countItem(ana.depot, "garra")} garras)`, countItem(ana.depot, "garra") >= 1);

for (const x of [b, pobre]) await x.room.leave();
done();
