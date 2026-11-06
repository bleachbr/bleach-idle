// Mapas feitos no Tiled (client/public/maps/*.tmj, tileset embutido). Cliente e servidor
// leem o mesmo arquivo: o cliente desenha as camadas, e os dois usam parseMap para
// colisão e lógica (templo, zona de proteção, depot, loja, portal, chegadas, spawns).
//
// Convenções do arquivo:
//   camadas de tiles: "chao", "objetos" e "acima" (esta é desenhada por cima dos personagens e não bloqueia)
//   tile com a propriedade booleana "solido" = true bloqueia a passagem
//   camada de objetos "logica", pelo tipo (classe) do objeto:
//     templo (ponto) · pz (retângulo) · depot (ponto) · loja (ponto; o nome aparece sobre o NPC)
//     portal (ponto) · chegada (ponto; o nome é o id do destino de viagem)
//     spawn (ponto; propriedades monstro, raio, quantidade)
//     npc (ponto; propriedade id = id do catálogo em shared/src/npcs.ts; M1-03)
import { npcById } from "./npcs";

export const MAP_IDS = ["karakura", "hueco", "soul", "lasnoches", "dangai", "falsa", "wandenreich"] as const;
export const HOME_MAP = "karakura";
export const SHOP_SPRITE = "npc_shop";

export interface Pt { x: number; y: number }
export interface Rect { x0: number; y0: number; x1: number; y1: number }
export interface SpawnDef { map: string; kind: string; x: number; y: number; radius: number; count: number }

export interface GameMap {
  id: string;
  name: string;
  w: number;
  h: number;
  solid: Uint8Array;
  pz: Rect[];
  temple?: Pt;
  depot?: Pt;
  shop?: Pt & { name: string };
  gate?: Pt & { name: string };
  arrivals: Record<string, Pt>;
  spawns: SpawnDef[];
  /** área do desafio do Dangai (objeto "arena", com propriedade raio) */
  arena?: Pt & { radius: number };
  /** NPCs do mapa: só a posição; nome, sprite e diálogo vêm do catálogo (npcById) */
  npcs: (Pt & { id: string })[];
}

const FLIP_MASK = 0x1fffffff; // bits altos do gid guardam espelhamento no Tiled

type Prop = { name: string; value: unknown };
const prop = (o: { properties?: Prop[] }, name: string) => o.properties?.find((p) => p.name === name)?.value;

export function parseMap(id: string, json: any, opts: { strictNpcs?: boolean } = {}): GameMap {
  const w: number = json.width;
  const h: number = json.height;
  const tw: number = json.tilewidth;
  const th: number = json.tileheight;

  const solidGids = new Set<number>();
  for (const ts of json.tilesets ?? []) {
    if (!ts.tiles) continue; // tileset externo (.tsj) não é suportado: embuta no mapa
    for (const t of ts.tiles) if (prop(t, "solido") === true) solidGids.add(ts.firstgid + t.id);
  }

  const solid = new Uint8Array(w * h);
  const map: GameMap = { id, name: String(prop(json, "nome") ?? id), w, h, solid, pz: [], arrivals: {}, spawns: [], npcs: [] };
  // NPCs só se validam depois de todas as camadas: a de objetos pode vir antes da de tiles, e o tile sólido ainda não estaria marcado
  const npcObjs: (Pt & { id: string })[] = [];
  for (const layer of json.layers ?? []) {
    if (layer.type === "tilelayer" && layer.name !== "acima") {
      (layer.data as number[]).forEach((g, i) => { if (solidGids.has(g & FLIP_MASK)) solid[i] = 1; });
    }
    if (layer.type !== "objectgroup") continue;
    for (const o of layer.objects) {
      const kind = o.type ?? o.class;
      const pt = { x: Math.floor(o.x / tw), y: Math.floor(o.y / th) };
      if (kind === "pz") map.pz.push({ x0: pt.x, y0: pt.y, x1: Math.floor((o.x + o.width - 1) / tw), y1: Math.floor((o.y + o.height - 1) / th) });
      else if (kind === "templo") map.temple = pt;
      else if (kind === "depot") map.depot = pt;
      else if (kind === "loja") map.shop = { ...pt, name: o.name || "Loja" };
      else if (kind === "portal") map.gate = { ...pt, name: o.name || "Portal" };
      else if (kind === "chegada") map.arrivals[o.name] = pt;
      else if (kind === "arena") map.arena = { ...pt, radius: Number(prop(o, "raio") ?? 6) };
      else if (kind === "spawn")
        map.spawns.push({
          map: id, kind: String(prop(o, "monstro") ?? o.name), x: pt.x, y: pt.y,
          radius: Number(prop(o, "raio") ?? 3), count: Number(prop(o, "quantidade") ?? 3),
        });
      else if (kind === "npc") npcObjs.push({ id: String(prop(o, "id") ?? o.name), ...pt });
    }
  }
  for (const n of npcObjs) {
    // id sem catálogo, repetido, fora do mapa ou em cima de parede: no servidor (strictNpcs) é erro de carga (ADR-001),
    // melhor não subir do que ter um NPC mudo ou preso no mapa. No cliente só é pulado: um .tmj velho no cache do
    // navegador não pode travar o jogo
    const inside = n.x >= 0 && n.y >= 0 && n.x < w && n.y < h;
    const problem = !npcById(n.id) ? "não existe em shared/src/npcs.ts" : map.npcs.some((o) => o.id === n.id) ? "repetido"
      : !inside ? `fora do mapa (${n.x},${n.y})` : solid[n.y * w + n.x] ? `sobre tile sólido (${n.x},${n.y})` : "";
    if (problem && opts.strictNpcs) throw new Error(`mapa ${id}: NPC "${n.id}" ${problem}`);
    if (!problem) map.npcs.push(n);
  }
  // o NPC da loja ocupa o tile dele, e os NPCs sólidos do catálogo também (todos já conferidos dentro do mapa)
  if (map.shop) solid[map.shop.y * w + map.shop.x] = 1;
  for (const n of map.npcs) if (npcById(n.id)?.solid) solid[n.y * w + n.x] = 1;
  if (id === "soul" && map.arrivals.soul && !map.arrivals.reiokyu) {
    map.arrivals.reiokyu = { ...map.arrivals.soul };
  }
  return map;
}

export function walkable(m: GameMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < m.w && y < m.h && !m.solid[y * m.w + x];
}

export function inPZ(m: GameMap, x: number, y: number): boolean {
  return m.pz.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
}

/** Tile andável mais próximo (busca em anéis). */
export function nearestWalkable(m: GameMap, x: number, y: number): Pt {
  for (let r = 0; r < 12; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++)
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r && walkable(m, x + dx, y + dy)) return { x: x + dx, y: y + dy };
  return m.temple ?? { x: 1, y: 1 };
}

/** Onde o personagem volta ao mundo no mesmo mapa: o tile salvo, ou o andável mais perto se ele virou parede
 * (por exemplo, um NPC sólido posto depois em cima dele). Sem lugar (posição inválida), undefined. */
export function resumeAt(m: GameMap, x: number, y: number): Pt | undefined {
  if (walkable(m, x, y)) return { x, y };
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  const p = nearestWalkable(m, x, y);
  return walkable(m, p.x, p.y) ? p : undefined;
}
