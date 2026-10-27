// Personagens, formas (Shikai/Bankai), monstros e spawns.

export const TILE = 32;
export const TICK_MS = 100;
export const START_LEVEL = 8;

/** Direção = linha da folha de sprite: 0 baixo, 1 esquerda, 2 direita, 3 cima. */
export type Dir = 0 | 1 | 2 | 3;
export const DIR_VEC: Record<Dir, [number, number]> = { 0: [0, 1], 1: [-1, 0], 2: [1, 0], 3: [0, -1] };

export interface SpriteDef {
  /** arquivo em client/public/assets/sprites/<key>.png, folha 4x4 */
  frame: number;
}
export const SPRITES: Record<string, SpriteDef> = {
  ichigo_shikai: { frame: 48 },
  ichigo_bankai: { frame: 48 },
  rukia: { frame: 48 },
  renji: { frame: 48 },
  hollow: { frame: 96 },
};

// Variantes de visual por equipamento (folha inteira por combinação: <base>__<look>).
// O Bankai do Ichigo tem roupa própria e não muda.
export const OUTFIT_BASES = ["ichigo_shikai", "rukia", "renji"];
export const OUTFIT_LOOKS = ["haori", "mask", "haori_mask"];
for (const b of OUTFIT_BASES) for (const l of OUTFIT_LOOKS) SPRITES[`${b}__${l}`] = { frame: 48 };

export function spriteKey(base: string, look: string): string {
  return look && OUTFIT_BASES.includes(base) ? `${base}__${look}` : base;
}

export interface FormDef {
  id: "shikai" | "bankai";
  label: string;
  sprite: string;
  tint?: number;
  dmgMult: number;
  stepMs: number;
  attackMs: number;
  /** reiatsu gasto por segundo enquanto a forma estiver ativa */
  reiDrain: number;
  minLevel: number;
}

export interface SkillDef {
  name: string;
  range: number;
  cost: number;
  mult: number;
  cdMs: number;
  color: number;
}

export interface CharDef {
  id: string;
  name: string;
  atk: number;
  def: number;
  forms: [FormDef, FormDef];
  skill: SkillDef;
}

export const CHARS: Record<string, CharDef> = {
  ichigo: {
    id: "ichigo",
    name: "Ichigo",
    atk: 14,
    def: 4,
    forms: [
      { id: "shikai", label: "Shikai: Zangetsu", sprite: "ichigo_shikai", dmgMult: 1, stepMs: 260, attackMs: 1000, reiDrain: 0, minLevel: 1 },
      { id: "bankai", label: "Bankai: Tensa Zangetsu", sprite: "ichigo_bankai", dmgMult: 1.7, stepMs: 170, attackMs: 650, reiDrain: 2.5, minLevel: 10 },
    ],
    skill: { name: "Getsuga Tenshō", range: 4, cost: 20, mult: 2.6, cdMs: 3000, color: 0x5ad1ff },
  },
  rukia: {
    id: "rukia",
    name: "Rukia",
    atk: 11,
    def: 3,
    forms: [
      { id: "shikai", label: "Shikai: Sode no Shirayuki", sprite: "rukia", dmgMult: 1, stepMs: 250, attackMs: 950, reiDrain: 0, minLevel: 1 },
      { id: "bankai", label: "Bankai: Hakka no Togame", sprite: "rukia", tint: 0xd8f0ff, dmgMult: 1.6, stepMs: 190, attackMs: 700, reiDrain: 2.5, minLevel: 10 },
    ],
    // mais alcance e mais dano de habilidade, menos corpo a corpo
    skill: { name: "Tsugi no Mai: Hakuren", range: 6, cost: 22, mult: 3.0, cdMs: 3000, color: 0xe6fbff },
  },
  renji: {
    id: "renji",
    name: "Renji",
    atk: 16,
    def: 5,
    forms: [
      { id: "shikai", label: "Shikai: Zabimaru", sprite: "renji", dmgMult: 1, stepMs: 270, attackMs: 1050, reiDrain: 0, minLevel: 1 },
      { id: "bankai", label: "Bankai: Hihiō Zabimaru", sprite: "renji", tint: 0xffc8b0, dmgMult: 1.8, stepMs: 200, attackMs: 750, reiDrain: 2.5, minLevel: 10 },
    ],
    skill: { name: "Higa Zekkō", range: 3, cost: 18, mult: 2.4, cdMs: 2500, color: 0xff6a4a },
  },
};

export interface MonsterDef {
  id: string;
  name: string;
  hp: number;
  atk: number;
  def: number;
  exp: number;
  scale: number;
  tint: number;
  stepMs: number;
  attackMs: number;
  respawnMs: number;
}

const m = (id: string, name: string, hp: number, atk: number, def: number, exp: number, scale: number, tint: number, stepMs = 420, respawnMs = 20000): MonsterDef =>
  ({ id, name, hp, atk, def, exp, scale, tint, stepMs, attackMs: 1400, respawnMs });

// 10 monstros: um só sprite de Hollow, variando tamanho e cor (placeholder até haver arte própria)
export const MONSTERS: Record<string, MonsterDef> = Object.fromEntries([
  m("hollow_menor", "Hollow Menor", 45, 7, 0, 60, 0.55, 0xffffff, 450),
  m("hollow_rastejante", "Hollow Rastejante", 80, 10, 1, 110, 0.62, 0xb8ffb0),
  m("hollow_sombrio", "Hollow Sombrio", 120, 13, 2, 170, 0.68, 0x8a8aa0),
  m("hollow_uivante", "Hollow Uivante", 160, 16, 2, 240, 0.74, 0xffd6a0, 360),
  m("hollow_faminto", "Hollow Faminto", 220, 19, 3, 330, 0.8, 0xffb0b0),
  m("hollow_acido", "Hollow Ácido", 280, 22, 4, 420, 0.84, 0xe4ff8a),
  m("hollow_encouracado", "Hollow Encouraçado", 380, 24, 8, 560, 0.9, 0xa8c4ff, 520),
  m("hollow_devorador", "Hollow Devorador", 480, 30, 6, 720, 0.97, 0xffffff),
  m("fishbone", "Fishbone D", 700, 36, 8, 1100, 1.05, 0xd2a8ff),
  m("grand_fisher", "Grand Fisher", 2600, 48, 12, 6000, 1.3, 0xffe27a, 380, 180000),
].map((d) => [d.id, d]));

export interface SpawnDef {
  kind: string;
  x: number;
  y: number;
  radius: number;
  count: number;
}

// hunts por faixa de nível: leste perto da cidade é fácil, sul além do rio é difícil
export const SPAWNS: SpawnDef[] = [
  { kind: "hollow_menor", x: 38, y: 6, radius: 4, count: 6 },
  { kind: "hollow_rastejante", x: 40, y: 15, radius: 4, count: 5 },
  { kind: "hollow_sombrio", x: 49, y: 7, radius: 4, count: 5 },
  { kind: "hollow_uivante", x: 52, y: 17, radius: 4, count: 4 },
  { kind: "hollow_faminto", x: 44, y: 25, radius: 4, count: 4 },
  { kind: "hollow_acido", x: 57, y: 27, radius: 3, count: 3 },
  { kind: "hollow_encouracado", x: 8, y: 41, radius: 4, count: 4 },
  { kind: "hollow_devorador", x: 28, y: 42, radius: 4, count: 3 },
  { kind: "fishbone", x: 45, y: 41, radius: 4, count: 3 },
  { kind: "grand_fisher", x: 58, y: 42, radius: 1, count: 1 },
];
