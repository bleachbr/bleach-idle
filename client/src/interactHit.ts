// Clique e tecla de interação com loja, depot, portal, placas e baús (#26). Puro, para testar sem Phaser.
// O servidor continua decidindo compras e viagens; placas e baús guiam a exploração e Jornada do Herói.
import {
  TILE,
  INTERACT_RANGE,
  chebyshev,
  signpostAt,
  signpostNear,
  chestAt,
  chestNear,
  type GameMap,
  type SignpostDef,
  type ChestDef,
} from "../../shared/src";
import { worldScenePortalAt } from "./worldScenes";

export type InteractKind = "shop" | "depot" | "travel" | "signpost" | "chest";
type Places = Pick<GameMap, "shop" | "depot" | "gate"> &
  Partial<Pick<GameMap, "id">> & {
    signposts?: SignpostDef[];
    chests?: ChestDef[];
  };

/** desenho do Kisuke (npc_shop.png, 48 x 48) com a base no pé do tile, mais o nome e aviso flutuante por cima */
const SHOP_W = 56, SHOP_H = 48 + 36;

const tileOf = (w: number) => Math.floor(w / TILE);

function getSignposts(m: Places): SignpostDef[] | undefined {
  return m.signposts;
}

function getChests(m: Places): ChestDef[] | undefined {
  return m.chests;
}

/** Retorna a placa no pixel especificado */
export function signpostAtPixel(m: Places, wx: number, wy: number): SignpostDef | null {
  const tx = tileOf(wx), ty = tileOf(wy);
  const list = getSignposts(m);
  if (list) {
    return list.find((s) => s.x === tx && s.y === ty) ?? null;
  }
  if (m.id) {
    return signpostAt(m.id, tx, ty) ?? null;
  }
  return null;
}

/** Retorna o baú no pixel especificado */
export function chestAtPixel(m: Places, wx: number, wy: number): ChestDef | null {
  const tx = tileOf(wx), ty = tileOf(wy);
  const list = getChests(m);
  if (list) {
    return list.find((c) => c.x === tx && c.y === ty) ?? null;
  }
  if (m.id) {
    return chestAt(m.id, tx, ty) ?? null;
  }
  return null;
}

/** Retorna a placa ao alcance do jogador */
export function signpostNearPlayer(m: Places, x: number, y: number): SignpostDef | null {
  const list = getSignposts(m);
  if (list) {
    return list.find((s) => chebyshev(x, y, s.x, s.y) <= INTERACT_RANGE) ?? null;
  }
  if (m.id) {
    return signpostNear(m.id, x, y) ?? null;
  }
  return null;
}

/** Retorna o baú ao alcance do jogador */
export function chestNearPlayer(m: Places, x: number, y: number): ChestDef | null {
  const list = getChests(m);
  if (list) {
    return list.find((c) => chebyshev(x, y, c.x, c.y) <= INTERACT_RANGE) ?? null;
  }
  if (m.id) {
    return chestNear(m.id, x, y) ?? null;
  }
  return null;
}

/** O que o clique em (wx, wy), em pixels do mundo, abre. A loja vem primeiro: o desenho dela é maior
 * que o tile e, onde encosta em outro objeto, o jogador mirou no Kisuke. */
export function interactAt(m: Places, wx: number, wy: number): InteractKind | null {
  const tx = tileOf(wx), ty = tileOf(wy);
  if (m.shop) {
    const cx = m.shop.x * TILE + TILE / 2, foot = (m.shop.y + 1) * TILE;
    if ((Math.abs(wx - cx) <= SHOP_W / 2 && wy <= foot && wy >= foot - SHOP_H) || (tx === m.shop.x && ty === m.shop.y)) return "shop";
  }
  if (m.depot && tx === m.depot.x && ty === m.depot.y) return "depot";
  if (m.gate && (worldScenePortalAt(m.id, wx, wy) || (tx === m.gate.x && ty === m.gate.y))) return "travel";
  if (signpostAtPixel(m, wx, wy)) return "signpost";
  if (chestAtPixel(m, wx, wy)) return "chest";
  return null;
}

export type ClickPick =
  | { player: string }
  | { interact: InteractKind; id?: string; sign?: SignpostDef; chest?: ChestDef }
  | null;

/** Ordem do clique: outro jogador (`playerAt`, pelos limites do sprite) vem antes da loja, porque o desenho
 * largo do Kisuke cobre os tiles do lado e quem clica num jogador ali quer o menu dele; depois loja, depot,
 * portal, placa e baú (`interactAt`). `null`: o chamador segue para monstro ou andar. */
export function pickClick(m: Places, wx: number, wy: number, playerAt: (wx: number, wy: number) => string | undefined): ClickPick {
  const player = playerAt(wx, wy);
  if (player) return { player };
  const sign = signpostAtPixel(m, wx, wy);
  if (sign) return { interact: "signpost", id: sign.id, sign };
  const chest = chestAtPixel(m, wx, wy);
  if (chest) return { interact: "chest", id: chest.id, chest };
  const kind = interactAt(m, wx, wy);
  return kind ? { interact: kind } : null;
}

/** O que está ao alcance do servidor (INTERACT_RANGE) de quem está em (x, y), na mesma prioridade do clique. */
export function interactNear(m: Places, x: number, y: number): InteractKind | null {
  const near = (at?: { x: number; y: number }) => !!at && chebyshev(x, y, at.x, at.y) <= INTERACT_RANGE;
  if (near(m.shop)) return "shop";
  if (near(m.depot)) return "depot";
  if (near(m.gate)) return "travel";
  if (signpostNearPlayer(m, x, y)) return "signpost";
  if (chestNearPlayer(m, x, y)) return "chest";
  return null;
}

const HOW = "E / Espaço / clique";

/** Rótulo flutuante de interação: o que abre, onde desenhar (tile) e como abrir. */
export function interactHint(m: Places, x: number, y: number): { kind: InteractKind; x: number; y: number; text: string; id?: string } | null {
  const kind = interactNear(m, x, y);
  if (kind === "shop" && m.shop) return { kind, x: m.shop.x, y: m.shop.y, text: `${m.shop.name}: ${HOW}` };
  if (kind === "depot" && m.depot) return { kind, x: m.depot.x, y: m.depot.y, text: `Depot: ${HOW}` };
  if (kind === "travel" && m.gate) return { kind, x: m.gate.x, y: m.gate.y, text: `${m.gate.name}: ${HOW}` };
  if (kind === "signpost") {
    const s = signpostNearPlayer(m, x, y);
    if (s) return { kind, x: s.x, y: s.y, text: `Placa: ${s.title} (${HOW})`, id: s.id };
  }
  if (kind === "chest") {
    const c = chestNearPlayer(m, x, y);
    if (c) return { kind, x: c.x, y: c.y, text: `Baú: ${c.name} (${HOW})`, id: c.id };
  }
  return null;
}
