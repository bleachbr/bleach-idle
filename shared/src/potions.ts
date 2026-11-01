// Motivo de uma poção recusada (#41). O servidor decide (useConsumable no WorldRoom); isto só explica
// ao jogador por que não deu, no chat e num texto curto que sobe do personagem.

type PotionDef = { name: string; heal?: number; restoreRei?: number };
type PotionUser = { hp: number; maxHp: number; rei: number; maxRei: number; potionReadyAt: number; reiPotionReadyAt: number };

/** null quando o motivo não é barra cheia nem recarga (o chamador mantém a mensagem genérica).
 * Morto (hp <= 0) também é null: o motivo real é estar morto, não a barra nem a recarga.
 * Barra cheia vem antes da recarga: é o que continua valendo depois que a recarga passa. */
export function potionRefusal(def: PotionDef, p: PotionUser, now: number): { chat: string; float: string } | null {
  if (p.hp <= 0) return null;
  if (def.heal) {
    if (p.hp >= p.maxHp) return { chat: `HP cheio: ${def.name} fica para quando precisar.`, float: "HP cheio!" };
    if (now < p.potionReadyAt) return { chat: `${def.name} em recarga.`, float: "Recarga!" };
  } else if (def.restoreRei) {
    if (p.rei >= p.maxRei) return { chat: `Reiatsu cheio: ${def.name} fica para quando precisar.`, float: "Reiatsu cheio!" };
    if (now < p.reiPotionReadyAt) return { chat: `${def.name} em recarga.`, float: "Recarga!" };
  }
  return null;
}
