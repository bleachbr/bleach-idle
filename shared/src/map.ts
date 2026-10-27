// Mapa de Karakura gerado de forma determinística: cliente e servidor chamam
// generateMap() e obtêm exatamente o mesmo grid, então o mapa não trafega na rede.

export enum T {
  Grass = 0,
  Road = 1,
  House = 2,
  Tree = 3,
  Water = 4,
  Plaza = 5,
  Bridge = 6,
  Depot = 7,
  Gate = 8,
}

export const MAP_W = 64;
export const MAP_H = 48;

export const WALKABLE = new Set<number>([T.Grass, T.Road, T.Plaza, T.Bridge]);

// Zona de proteção (sem combate) e ponto de renascer: a praça central da cidade.
export const TEMPLE = { x: 16, y: 14 };
export const PZ = { x0: 13, y0: 11, x1: 19, y1: 17 };

// Na praça: baú do depot e o NPC da loja. Os dois bloqueiam o tile.
export const DEPOT = { x: 14, y: 12 };
export const SHOP_NPC = { x: 18, y: 12, name: "Kisuke (loja)", sprite: "npc_shop" };
// Senkaimon: portal de viagem na borda norte da praça
export const SENKAIMON = { x: 16, y: 11 };

export function inPZ(x: number, y: number): boolean {
  return x >= PZ.x0 && x <= PZ.x1 && y >= PZ.y0 && y <= PZ.y1;
}

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

export function generateMap(): number[][] {
  const r = rng(42);
  const m: number[][] = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(T.Grass));
  const set = (x: number, y: number, t: number) => {
    if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) m[y][x] = t;
  };

  // cidade (oeste): quarteirões de casas cortados por ruas
  const town = { x0: 2, y0: 2, x1: 31, y1: 27 };
  for (let y = town.y0; y <= town.y1; y++)
    for (let x = town.x0; x <= town.x1; x++) {
      const road = (x - town.x0) % 8 < 2 || (y - town.y0) % 7 < 2;
      if (road) set(x, y, T.Road);
      else if (r() < 0.82) set(x, y, T.House);
    }
  // quintal entre casas: abre algumas passagens de grama
  for (let i = 0; i < 70; i++) {
    const x = town.x0 + Math.floor(r() * (town.x1 - town.x0));
    const y = town.y0 + Math.floor(r() * (town.y1 - town.y0));
    if (m[y][x] === T.House) set(x, y, T.Grass);
  }
  // praça central
  for (let y = PZ.y0; y <= PZ.y1; y++) for (let x = PZ.x0; x <= PZ.x1; x++) set(x, y, T.Plaza);
  set(DEPOT.x, DEPOT.y, T.Depot);
  set(SENKAIMON.x, SENKAIMON.y, T.Gate);

  // estradas saindo da cidade para as hunts
  for (let x = town.x1; x < MAP_W - 2; x++) { set(x, 9, T.Road); set(x, 10, T.Road); }
  for (let y = town.y1; y < MAP_H - 2; y++) { set(16, y, T.Road); set(17, y, T.Road); }

  // rio ao sul, com ponte na estrada
  for (let x = 0; x < MAP_W; x++) {
    const y = 33 + Math.round(Math.sin(x / 5) * 1.5);
    for (let k = 0; k < 3; k++) set(x, y + k, x === 16 || x === 17 ? T.Bridge : T.Water);
  }

  // floresta a leste e ao sul: árvores esparsas, mais densas nas bordas
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      if (m[y][x] !== T.Grass) continue;
      const inTown = x <= town.x1 + 1 && y <= town.y1 + 1;
      if (inTown) continue;
      const edge = x < 2 || y < 2 || x >= MAP_W - 2 || y >= MAP_H - 2;
      if (edge || r() < 0.09) set(x, y, T.Tree);
    }
  // borda da cidade também fechada
  for (let x = 0; x < MAP_W; x++) { set(x, 0, T.Tree); set(x, MAP_H - 1, T.Tree); }
  for (let y = 0; y < MAP_H; y++) { set(0, y, T.Tree); set(MAP_W - 1, y, T.Tree); }
  for (let y = 1; y <= town.y1; y++) set(1, y, T.Tree);
  for (let x = 1; x <= town.x1; x++) set(x, 1, T.Tree);
  return m;
}

/** Tile andável mais próximo (busca em anéis), para destinos de viagem gerados pelo mapa. */
export function nearestWalkable(m: number[][], x: number, y: number): { x: number; y: number } {
  for (let r = 0; r < 12; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++)
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r && walkable(m, x + dx, y + dy)) return { x: x + dx, y: y + dy };
  return TEMPLE;
}

export function walkable(m: number[][], x: number, y: number): boolean {
  return y >= 0 && x >= 0 && y < MAP_H && x < MAP_W && WALKABLE.has(m[y][x]) && !(x === SHOP_NPC.x && y === SHOP_NPC.y);
}
