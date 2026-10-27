// Fórmulas de progressão no estilo Tibia.

/** XP total para estar no nível l (fórmula do Tibia). */
export function expForLevel(l: number): number {
  return Math.round((50 / 3) * (l ** 3 - 6 * l ** 2 + 17 * l - 12));
}

export const maxHp = (level: number) => 100 + 15 * level;
export const maxRei = (level: number) => 40 + 8 * level;

/** Fração de XP perdida ao morrer. */
export const DEATH_EXP_LOSS = 0.08;

/** Defesa reduz em proporção (50/(50+def)) em vez de subtrair: com equipamento a
 * defesa passa de 15 e, subtraindo, os Hollows fracos davam sempre 0 de dano. */
export function rollDamage(atk: number, mult: number, def: number): number {
  const raw = atk * mult * (0.75 + Math.random() * 0.5);
  return Math.max(1, Math.round((raw * 50) / (50 + Math.max(0, def))));
}

export const playerAtk = (baseAtk: number, level: number) => baseAtk + level * 1.2;
export const playerDef = (baseDef: number, level: number) => baseDef + level * 0.4;

export const chebyshev = (ax: number, ay: number, bx: number, by: number) =>
  Math.max(Math.abs(ax - bx), Math.abs(ay - by));
