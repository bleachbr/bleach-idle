// Clique e tecla de interação com loja, depot e portal (#26). Puro, para testar sem Phaser.
// O servidor continua decidindo tudo (`interact` em WorldRoom.ts confere a distância e anda até lá).
import { TILE, INTERACT_RANGE, chebyshev, type GameMap } from "../../shared/src";
import { worldScenePortalAt } from "./worldScenes";

export type InteractKind = "shop" | "depot" | "travel";
type Places = Pick<GameMap, "shop" | "depot" | "gate"> & Partial<Pick<GameMap, "id">>;

/** desenho do Kisuke (npc_shop.png, 48 x 48) com a base no pé do tile, mais o nome e aviso flutuante por cima */
const SHOP_W = 56, SHOP_H = 48 + 36;

const tileOf = (w: number) => Math.floor(w / TILE);

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
  return null;
}

export type ClickPick = { player: string } | { interact: InteractKind } | null;

/** Ordem do clique: outro jogador (`playerAt`, pelos limites do sprite) vem antes da loja, porque o desenho
 * largo do Kisuke cobre os tiles do lado e quem clica num jogador ali quer o menu dele; depois loja, depot e
 * portal (`interactAt`). `null`: o chamador segue para monstro ou andar. */
export function pickClick(m: Places, wx: number, wy: number, playerAt: (wx: number, wy: number) => string | undefined): ClickPick {
  const player = playerAt(wx, wy);
  if (player) return { player };
  const kind = interactAt(m, wx, wy);
  return kind ? { interact: kind } : null;
}

/** O que está ao alcance do servidor (INTERACT_RANGE) de quem está em (x, y), na mesma prioridade do clique. */
export function interactNear(m: Places, x: number, y: number): InteractKind | null {
  const near = (at?: { x: number; y: number }) => !!at && chebyshev(x, y, at.x, at.y) <= INTERACT_RANGE;
  return near(m.shop) ? "shop" : near(m.depot) ? "depot" : near(m.gate) ? "travel" : null;
}

const HOW = "E / Espaço / clique";

/** Rótulo flutuante de interação: o que abre, onde desenhar (tile) e como abrir. */
export function interactHint(m: Places, x: number, y: number): { kind: InteractKind; x: number; y: number; text: string } | null {
  const kind = interactNear(m, x, y);
  if (kind === "shop" && m.shop) return { kind, x: m.shop.x, y: m.shop.y, text: `${m.shop.name}: ${HOW}` };
  if (kind === "depot" && m.depot) return { kind, x: m.depot.x, y: m.depot.y, text: `Depot: ${HOW}` };
  if (kind === "travel" && m.gate) return { kind, x: m.gate.x, y: m.gate.y, text: `${m.gate.name}: ${HOW}` };
  return null;
}
