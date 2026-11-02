// Quanto se perde ao morrer fora do Dangai: fração da XP, do kan e chance de perder cada item.
// Decisão pura, usada por `killPlayer` (WorldRoom.ts).
import { DEATH_EXP_LOSS } from "./formulas";
import { DEATH_ITEM_LOSS, DEATH_GOLD_LOSS } from "./items";
import { SKULL_ITEM_LOSS, SKULL_GOLD_LOSS, RECALL_COMBAT_MS } from "./social";

/**
 * Atenuante da Invasão de Hollows (#39). PROPOSTA de balanceamento, aguarda Waldir e Rafael.
 * Vale só para quem é morto direto por um Hollow da invasão ativa (o evento cooperativo da praça):
 * sem perda de itens e metade da XP e do kan da morte comum. Não vale para PvP, chefe mundial,
 * sangramento nem para assassino (☠): morrer de propósito para a invasão não limpa a caveira.
 * Também não vale para quem está no PvP (`inPvpCombat`): quem agrediu ou apanha de jogador não troca a
 * morte comum por uma barata deixando o Hollow dar o último golpe.
 */
export const INVASION_DEATH = { expMult: 0.5, goldMult: 0.5, itemLoss: 0 };

export interface DeathCause {
  /** caveira de assassino ativa */
  skulled: boolean;
  /** Amuleto da Alma equipado */
  amulet: boolean;
  /** morto por um Hollow da invasão ativa */
  invasionMob: boolean;
  /** no PvP agora (`inPvpCombat`): perde o atenuante da invasão */
  pvpRecent: boolean;
}

/** Marcado por agressão (`pvpUntil`) ou atingido por jogador há menos de RECALL_COMBAT_MS, a mesma janela
 * de "Em combate" que bloqueia voltar à cidade e viajar. */
export function inPvpCombat(now: number, pvpUntil: number, lastAttackedAt: number): boolean {
  return pvpUntil > now || now - lastAttackedAt < RECALL_COMBAT_MS;
}

export interface DeathPenalty {
  exp: number;
  gold: number;
  /** chance de perder cada peça equipada e cada espaço do inventário */
  item: number;
  /** o Amuleto da Alma protegeu (e se desfaz) */
  protected: boolean;
  /** o atenuante da invasão foi aplicado */
  invasion: boolean;
}

export function deathPenalty(c: DeathCause): DeathPenalty {
  // assassino: o amuleto não protege e o atenuante da invasão também não
  if (c.skulled) return { exp: DEATH_EXP_LOSS, gold: SKULL_GOLD_LOSS, item: SKULL_ITEM_LOSS, protected: false, invasion: false };
  if (c.amulet) return { exp: 0, gold: 0, item: 0, protected: true, invasion: false };
  if (c.invasionMob && !c.pvpRecent)
    return { exp: DEATH_EXP_LOSS * INVASION_DEATH.expMult, gold: DEATH_GOLD_LOSS * INVASION_DEATH.goldMult, item: INVASION_DEATH.itemLoss, protected: false, invasion: true };
  return { exp: DEATH_EXP_LOSS, gold: DEATH_GOLD_LOSS, item: DEATH_ITEM_LOSS, protected: false, invasion: false };
}
