// Micro-benchmark dos pontos quentes do servidor. Sem rede e sem servidor: chama os módulos direto, com SQLite em memória.
// Uso, na raiz do repositório:  npx tsx .claude/skills/performance-servidor/scripts/bench.mts [personagens=1000]
// Rode 3 vezes com a máquina ociosa e compare a mediana (p50) com docs/baseline.md; a cauda (p95 e máx) varia muito entre rodadas.
// Banco em memória não mede o fsync do disco.
process.env.DB_FILE = ":memory:";
import { performance } from "node:perf_hooks";

const db = await import("../../../../server/src/db");
const { newCharacter } = await import("../../../../server/src/LobbyRoom");
const S: any = await import("../../../../shared/src/index");
const { MAPS } = await import("../../../../server/src/maps");
const { findPath } = await import("../../../../server/src/path");
const { buildRanking } = await import("../../../../server/src/ranking");

const N = Number(process.argv[2] ?? 1000);
const AMOSTRAS = 300; // p95 só faz sentido com amostra grande; com 100 ou menos o "p99" seria o próprio máximo
const quantil = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return `p50=${q(0.5).toFixed(2)} p95=${q(0.95).toFixed(2)} max=${s[s.length - 1].toFixed(2)} ms (n=${s.length})`;
};
const medir = (fn: () => void) => {
  for (let i = 0; i < 30; i++) fn(); // aquecimento
  const t: number[] = [];
  for (let i = 0; i < AMOSTRAS; i++) { const a = performance.now(); fn(); t.push(performance.now() - a); }
  return quantil(t);
};

const conta = db.createAccount("bench", "x");
if (!conta) throw new Error("benchmark inválido: conta não criada");

// save de fim de jogo: inventário e depot cheios, bestiário completo, conquistas e missões feitas
const save = (i: number) => {
  const d: any = newCharacter(`Bench ${i}`, "ichigo");
  const itens = Object.keys(S.ITEMS);
  d.level = 120; d.exp = S.expForLevel(120);
  d.inv = Array.from({ length: S.INV_SIZE }, (_, k) => ({ id: itens[(k + i) % itens.length], qty: 50 }));
  d.depot = Array.from({ length: S.DEPOT_SIZE }, (_, k) => ({ id: itens[(k * 3 + i) % itens.length], qty: 99 }));
  d.prog = { bestiary: Object.fromEntries(Object.keys(S.MONSTERS).map((k) => [k, 5000 + i])), ach: S.ACHIEVEMENTS.map((a: any) => a.id), daily: { last: "2026-10-31", streak: 7 }, kills: 99999, bossKills: 400, tut: [], dgBest: 80 };
  d.quests = { active: {}, done: S.QUESTS.map((q: any) => q.id) };
  return d;
};

let criados = 0;
for (let i = 0; i < N; i++) if (db.createChar(conta, `bench${i}`, save(i))) criados++;
const lidos = db.allChars().length;
console.log(`inseridos=${criados}/${N}  allChars()=${lidos}`);
if (criados !== N || lidos !== N) throw new Error("benchmark inválido: as inserções falharam, os números abaixo não valem");
console.log(`tamanho de um save de fim de jogo: ${JSON.stringify(save(0)).length} bytes`);

const lote = Array.from({ length: 200 }, (_, i) => ({ id: `bench${i}`, data: save(i), inWorld: true }));
console.log(`JSON.stringify x200 (parte do saveAll):      ${medir(() => { for (const l of lote) JSON.stringify(l.data); })}`);
console.log(`db.saveMany(200 personagens):                ${medir(() => db.saveMany(lote))}`);
console.log(`db.allChars() com ${N} personagens (SQLite):  ${medir(() => { db.allChars(); })}`);
console.log(`buildRanking() incremental (${N} personagens): ${medir(() => { buildRanking([]); })}`);

for (const id of ["karakura", "falsa"] as const) {
  const m: any = MAPS[id];
  let o = { x: 5, y: 5 };
  achar: for (let y = 5; y < m.h; y++) for (let x = 5; x < m.w; x++) if (S.walkable(m, x, y)) { o = { x, y }; break achar; }
  const bloqueado = (x: number, y: number) => !S.walkable(m, x, y);
  console.log(`BFS ${id.padEnd(8)} meta inalcançável (4000 nós): ${medir(() => findPath(o.x, o.y, () => false, bloqueado))}`);
}
