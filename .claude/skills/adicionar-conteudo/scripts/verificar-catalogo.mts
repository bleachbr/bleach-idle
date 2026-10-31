// Confere se os catálogos de conteúdo se referenciam sem furos (ids, sprites, loot, loja, missões, conjuntos, spawns).
// Uso, na raiz do repositório:  npx tsx .claude/skills/adicionar-conteudo/scripts/verificar-catalogo.mts
// Sai com código 1 se houver ERRO (referência quebrada). AVISO é para conferir se é intencional.
process.env.DB_FILE = ":memory:";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const S: any = await import("../../../../shared/src/index");
const { SPAWNS } = await import("../../../../server/src/maps");
const arte = (p: string) => fileURLToPath(new URL(`../../../../client/public/assets/${p}`, import.meta.url));

const erros: string[] = [];
const avisos: string[] = [];
const spawns = SPAWNS as any[];
const monstros = Object.values<any>(S.MONSTERS);

for (const m of monstros) {
  if (!S.SPRITES[m.sprite]) erros.push(`monstro ${m.id}: sprite "${m.sprite}" não está em SPRITES`);
  if (!m.dummy && !S.LOOT[m.id]) avisos.push(`monstro ${m.id}: sem tabela em LOOT (chefe de evento paga por outro caminho?)`);
}
for (const k of Object.keys(S.SPRITES)) {
  if (!existsSync(arte(`sprites/${k}.png`))) erros.push(`SPRITES.${k}: falta client/public/assets/sprites/${k}.png`);
  if (!existsSync(arte(`sprites_hd/${k}.webp`))) avisos.push(`SPRITES.${k}: falta a versão HD (sprites_hd/${k}.webp)`);
}
for (const [id, tabela] of Object.entries<any>(S.LOOT)) {
  if (!S.MONSTERS[id]) erros.push(`LOOT.${id}: monstro inexistente`);
  for (const e of tabela.items) if (!S.ITEMS[e.item]) erros.push(`LOOT.${id}: item inexistente "${e.item}"`);
}
for (const id of S.SHOP) {
  if (!S.ITEMS[id]) erros.push(`SHOP: "${id}" não existe em ITEMS`);
  else if (!S.ITEMS[id].buy) erros.push(`SHOP: "${id}" não tem preço de compra (buy)`);
}
for (const q of S.QUESTS) {
  if (q.goal.type === "kill") for (const k of q.goal.monsters) if (!S.MONSTERS[k]) erros.push(`missão ${q.id}: monstro "${k}" inexistente`);
  if (q.goal.type === "collect" && !S.ITEMS[q.goal.item]) erros.push(`missão ${q.id}: item "${q.goal.item}" inexistente`);
  for (const r of q.reward.items ?? []) if (!S.ITEMS[r.id]) erros.push(`missão ${q.id}: recompensa "${r.id}" inexistente`);
}
for (const set of S.SETS) for (const p of set.pieces) if (!S.ITEMS[p]) erros.push(`SETS.${set.id}: peça "${p}" inexistente`);
for (const s of spawns) if (!S.MONSTERS[s.kind]) erros.push(`spawn em ${s.map}: monstro "${s.kind}" inexistente`);
for (const c of Object.values<any>(S.CHARS)) {
  for (const f of c.forms) if (!S.SPRITES[f.sprite]) erros.push(`CHARS.${c.id}: forma "${f.id}" usa sprite "${f.sprite}" fora de SPRITES`);
}
const comSpawn = new Set(spawns.map((s) => s.kind));
for (const m of monstros) if (!m.dummy && !comSpawn.has(m.id)) avisos.push(`monstro ${m.id}: não nasce em nenhum mapa (evento, Dangai ou invasão?)`);

for (const e of erros) console.log(`ERRO   ${e}`);
for (const a of avisos) console.log(`AVISO  ${a}`);
console.log(`${erros.length} erro(s), ${avisos.length} aviso(s)`);
process.exit(erros.length ? 1 : 0);
