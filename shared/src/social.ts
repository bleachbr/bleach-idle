// Party, PvP e viagem.

export const PARTY_MAX = 4;
/** distância (Chebyshev) de quem divide XP com quem matou */
export const PARTY_SHARE_RANGE = 12;
/** bônus por membro extra na divisão (2 = +10%, 3 = +20%, 4 = +30%) */
export const PARTY_SHARE_BONUS = 0.1;
/** regra do Tibia: o menor nível precisa ser pelo menos 2/3 do maior para dividir */
export const PARTY_LEVEL_RATIO = 2 / 3;
export const PARTY_INVITE_MS = 60_000;

/** abaixo deste nível ninguém ataca nem é atacado por jogadores */
export const PVP_MIN_LEVEL = 10;
/** dano entre jogadores é reduzido (como no Tibia) */
export const PVP_DAMAGE = 0.5;
/** depois de atacar um jogador: sem viajar, sem "voltar à cidade" e sem entrar na zona de proteção */
export const PVP_LOCK_MS = 3 * 60_000;

/** "Voltar à cidade": bloqueado em combate recente e por PvP */
export const RECALL_COMBAT_MS = 10_000;
export const RECALL_COOLDOWN_MS = 60_000;

/** Destinos dos portais (Senkaimon em Karakura, Garganta em Hueco Mundo). O ponto de
 * chegada é o objeto "chegada" com o mesmo nome (id) no mapa indicado. */
export interface TravelDest { id: string; name: string; map: string; minLevel: number; cost: number }
export const TRAVEL: TravelDest[] = [
  { id: "karakura", name: "Karakura (praça)", map: "karakura", minLevel: 1, cost: 0 },
  { id: "leste", name: "Floresta Leste", map: "karakura", minLevel: 8, cost: 30 },
  { id: "rio", name: "Além do Rio", map: "karakura", minLevel: 12, cost: 60 },
  { id: "toca", name: "Toca do Grand Fisher", map: "karakura", minLevel: 20, cost: 120 },
  { id: "hueco", name: "Hueco Mundo (Garganta)", map: "hueco", minLevel: 22, cost: 200 },
];
