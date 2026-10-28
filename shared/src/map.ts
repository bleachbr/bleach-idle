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

export const MAP_IDS = ["karakura", "hueco", "soul", "lasnoches"] as const;
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
}

const FLIP_MASK = 0x1fffffff; // bits altos do gid guardam espelhamento no Tiled

type Prop = { name: string; value: unknown };
const prop = (o: { properties?: Prop[] }, name: string) => o.properties?.find((p) => p.name === name)?.value;

export function parseMap(id: string, json: any): GameMap {
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
  const map: GameMap = { id, name: String(prop(json, "nome") ?? id), w, h, solid, pz: [], arrivals: {}, spawns: [] };
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
      else if (kind === "spawn")
        map.spawns.push({
          map: id, kind: String(prop(o, "monstro") ?? o.name), x: pt.x, y: pt.y,
          radius: Number(prop(o, "raio") ?? 3), count: Number(prop(o, "quantidade") ?? 3),
        });
    }
  }
  // o NPC da loja ocupa o tile dele
  if (map.shop) solid[map.shop.y * w + map.shop.x] = 1;
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
