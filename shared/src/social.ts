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

/** Invasão de Hollows em Karakura, perto da praça: de tempos em tempos, por 15 min. */
export const INVASION = {
  everyMs: 3 * 3600_000,
  firstMs: 30 * 60_000,
  durationMs: 15 * 60_000,
  kinds: ["hollow_sombrio", "hollow_uivante", "hollow_faminto"],
  count: 12,
  leader: "fishbone",
  expMult: 1.5,
  boxChance: 0.08,
};

/** Caveira de assassino: matar quem não atacou ninguém. Cada abate injusto soma tempo. */
export const SKULL_PER_KILL_MS = 15 * 60_000;
export const SKULL_MAX_MS = 2 * 3600_000;
/** assassino morrendo: chance de perder cada item e fração do dinheiro (o Amuleto da Alma não protege) */
export const SKULL_ITEM_LOSS = 0.5;
export const SKULL_GOLD_LOSS = 0.3;

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
  { id: "soul", name: "Soul Society (Seireitei)", map: "soul", minLevel: 14, cost: 120 },
  { id: "hueco", name: "Hueco Mundo (Garganta)", map: "hueco", minLevel: 22, cost: 200 },
];
