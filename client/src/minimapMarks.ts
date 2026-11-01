// Marcadores do minimapa (R-10): o que é fixo no mapa (zona protegida, portal, loja, depot, templo, NPCs)
// e a área do alvo das missões do Kisuke, tirada dos spawns do Tiled. Sem Phaser nem DOM: o GameScene desenha.
import { MONSTERS, huntKinds, npcById, own, type GameMap, type QuestState, type Rect } from "../../shared/src";

export type FixedMark =
  | { kind: "pz"; rect: Rect }
  | { kind: "gate" | "shop" | "depot" | "temple" | "npc"; x: number; y: number; label: string };

/** Área de spawn de um monstro que alguma missão ativa pede (x, y e raio em tiles). */
export interface TargetArea { x: number; y: number; radius: number; kind: string }

/** Marcadores fixos de um mapa: não mudam enquanto o jogador está nele. */
export function fixedMarks(m: GameMap): FixedMark[] {
  const out: FixedMark[] = m.pz.map((rect) => ({ kind: "pz" as const, rect }));
  if (m.temple) out.push({ kind: "temple", ...m.temple, label: "Templo" });
  if (m.depot) out.push({ kind: "depot", ...m.depot, label: "Depot" });
  if (m.shop) out.push({ kind: "shop", x: m.shop.x, y: m.shop.y, label: m.shop.name });
  if (m.gate) out.push({ kind: "gate", x: m.gate.x, y: m.gate.y, label: m.gate.name });
  for (const n of m.npcs) out.push({ kind: "npc", x: n.x, y: n.y, label: npcById(n.id)?.name ?? n.id });
  return out;
}

/** Espécies que as missões de caça ativas ainda pedem (as já completas saem), só as que existem no catálogo. */
export function questTargetKinds(quests: QuestState): Set<string> {
  return new Set([...huntKinds(quests.active)].filter((k) => own(MONSTERS, k)));
}

/**
 * Onde caçar o alvo: as áreas de spawn deste mapa que têm uma espécie pedida. `elsewhere` diz se alguma
 * espécie pedida só nasce em outro mapa (aí o portal ganha destaque: é por ele que se viaja).
 */
export function targetAreas(m: GameMap, all: GameMap[], kinds: Set<string>): { areas: TargetArea[]; elsewhere: boolean } {
  const areas = m.spawns.filter((s) => kinds.has(s.kind)).map((s) => ({ x: s.x, y: s.y, radius: s.radius, kind: s.kind }));
  const here = new Set(areas.map((a) => a.kind));
  const elsewhere = [...kinds].some((k) => !here.has(k) && all.some((o) => o.id !== m.id && o.spawns.some((s) => s.kind === k)));
  return { areas, elsewhere };
}
