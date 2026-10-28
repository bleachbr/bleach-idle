// Personagens, formas (Shikai/Bankai), monstros e spawns.

export const TILE = 32;
export const TICK_MS = 100;
export const START_LEVEL = 8;

/** Direção = linha da folha de sprite: 0 baixo, 1 esquerda, 2 direita, 3 cima. */
export type Dir = 0 | 1 | 2 | 3;
export const DIR_VEC: Record<Dir, [number, number]> = { 0: [0, 1], 1: [-1, 0], 2: [1, 0], 3: [0, -1] };

export interface SpriteDef {
  /** arquivo em client/public/assets/sprites/<key>.png: 4 linhas (baixo, esquerda, direita, cima) */
  frame: number;
  /** quadros de andar por direção: 4 (padrão) ou 8 (ciclo completo, art/walk8.py) */
  cols?: number;
}
export const SPRITES: Record<string, SpriteDef> = {
  ichigo_shikai: { frame: 48, cols: 8 },
  ichigo_bankai: { frame: 48, cols: 8 },
  rukia: { frame: 48, cols: 8 },
  renji: { frame: 48, cols: 8 },
  hollow: { frame: 96 },
  adjuchas: { frame: 96, cols: 8 },
  gillian: { frame: 96 },
  arrancar: { frame: 48, cols: 8 },
  boneco: { frame: 48 },
  fishbone: { frame: 96, cols: 8 },
  rukia_bankai: { frame: 48, cols: 8 },
  renji_bankai: { frame: 48, cols: 8 },
  ishida: { frame: 48, cols: 8 },
  ishida_power: { frame: 48, cols: 8 },
  sado: { frame: 48, cols: 8 },
  sado_power: { frame: 48, cols: 8 },
  hollow_menor: { frame: 96, cols: 8 },
  hollow_rastejante: { frame: 96, cols: 8 },
  hollow_acido: { frame: 96, cols: 8 },
  hollow_sombrio: { frame: 96, cols: 8 },
  hollow_uivante: { frame: 96, cols: 8 },
  hollow_faminto: { frame: 96, cols: 8 },
  hollow_encouracado: { frame: 96, cols: 8 },
  hollow_devorador: { frame: 96, cols: 8 },
  grand_fisher: { frame: 96, cols: 8 },
  metastacia: { frame: 96, cols: 8 },
  arrancar_numeros: { frame: 48, cols: 8 },
  exequias: { frame: 48, cols: 8 },
  fraccion: { frame: 96 },
  privaron: { frame: 96 },
};

// Variantes de visual por equipamento (folha inteira por combinação: <base>__<look>).
// O Bankai do Ichigo tem roupa própria e não muda.
export const OUTFIT_BASES = ["ichigo_shikai", "rukia", "renji"];
export const OUTFIT_LOOKS = ["haori", "mask", "haori_mask"];
for (const b of OUTFIT_BASES) for (const l of OUTFIT_LOOKS) SPRITES[`${b}__${l}`] = { frame: 48 };

export const spriteCols = (key: string) => SPRITES[key]?.cols ?? 4;
/** quadro "parado" de uma direção: o de passagem, com as pernas juntas */
export const standFrame = (key: string, dir: number) => dir * spriteCols(key) + (spriteCols(key) === 8 ? 2 : 1);
/** posição CSS do quadro parado olhando para baixo (retratos do lobby e do livro) */
export const portraitCss = (key: string) => {
  const cols = spriteCols(key);
  return `background-size:${cols * 100}% 400%;background-position:${((cols === 8 ? 2 : 1) / (cols - 1)) * 100}% 0`;
};

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
      { id: "bankai", label: "Bankai: Hakka no Togame", sprite: "rukia_bankai", dmgMult: 1.6, stepMs: 190, attackMs: 700, reiDrain: 2.5, minLevel: 10 },
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
      { id: "bankai", label: "Bankai: Hihiō Zabimaru", sprite: "renji_bankai", dmgMult: 1.8, stepMs: 200, attackMs: 750, reiDrain: 2.5, minLevel: 10 },
    ],
    skill: { name: "Higa Zekkō", range: 3, cost: 18, mult: 2.4, cdMs: 2500, color: 0xff6a4a },
  },
  // Quincy: corpo a corpo fraco, flecha de longe e barata (a "segunda forma" é o Letzt Stil)
  ishida: {
    id: "ishida",
    name: "Ishida",
    atk: 10,
    def: 3,
    forms: [
      { id: "shikai", label: "Quincy: Ginrei Kojaku", sprite: "ishida", dmgMult: 1, stepMs: 240, attackMs: 900, reiDrain: 0, minLevel: 1 },
      { id: "bankai", label: "Quincy: Letzt Stil", sprite: "ishida_power", dmgMult: 1.6, stepMs: 180, attackMs: 650, reiDrain: 2.5, minLevel: 10 },
    ],
    skill: { name: "Licht Regen", range: 7, cost: 16, mult: 2.5, cdMs: 2500, color: 0x7fd6ff },
  },
  // braço do gigante: o mais forte e resistente, o mais lento
  sado: {
    id: "sado",
    name: "Sado",
    atk: 17,
    def: 7,
    forms: [
      { id: "shikai", label: "Brazo Derecha de Gigante", sprite: "sado", dmgMult: 1, stepMs: 290, attackMs: 1100, reiDrain: 0, minLevel: 1 },
      { id: "bankai", label: "Brazo Izquierda del Diablo", sprite: "sado_power", dmgMult: 1.85, stepMs: 200, attackMs: 800, reiDrain: 2.5, minLevel: 10 },
    ],
    skill: { name: "El Directo", range: 3, cost: 20, mult: 2.8, cdMs: 3000, color: 0xff5040 },
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
  /** folha de sprite em client/public/assets/sprites/ */
  sprite: string;
  /** boneco de treino: não anda, não ataca, não morre, não dá XP nem loot */
  dummy?: boolean;
}

const m = (id: string, name: string, hp: number, atk: number, def: number, exp: number, scale: number, tint: number, stepMs = 420, respawnMs = 20000, sprite = "hollow"): MonsterDef =>
  ({ id, name, hp, atk, def, exp, scale, tint, stepMs, attackMs: 1400, respawnMs, sprite });

// Todos os monstros têm sprite próprio (gerados pelo Codex; veja art/raw/prompts.md).
// O sprite genérico "hollow" fica disponível para monstros novos ainda sem arte.
// Onde cada um nasce fica no mapa (objetos "spawn" na camada "logica" do Tiled).
export const MONSTERS: Record<string, MonsterDef> = Object.fromEntries([
  m("hollow_menor", "Hollow Menor", 45, 7, 0, 60, 1, 0xffffff, 450, 20000, "hollow_menor"),
  m("hollow_rastejante", "Hollow Rastejante", 80, 10, 1, 110, 1, 0xffffff, 420, 20000, "hollow_rastejante"),
  m("hollow_sombrio", "Hollow Sombrio", 120, 13, 2, 170, 1, 0xffffff, 420, 20000, "hollow_sombrio"),
  m("hollow_uivante", "Hollow Uivante", 160, 16, 2, 240, 1, 0xffffff, 360, 20000, "hollow_uivante"),
  m("hollow_faminto", "Hollow Faminto", 220, 19, 3, 330, 1, 0xffffff, 420, 20000, "hollow_faminto"),
  m("hollow_acido", "Hollow Ácido", 280, 22, 4, 420, 1, 0xffffff, 420, 20000, "hollow_acido"),
  m("hollow_encouracado", "Hollow Encouraçado", 380, 24, 8, 560, 1, 0xffffff, 520, 20000, "hollow_encouracado"),
  m("hollow_devorador", "Hollow Devorador", 480, 30, 6, 720, 1, 0xffffff, 420, 20000, "hollow_devorador"),
  m("fishbone", "Fishbone D", 700, 36, 8, 1100, 1, 0xffffff, 420, 20000, "fishbone"),
  m("grand_fisher", "Grand Fisher", 2600, 48, 12, 6000, 1, 0xffffff, 380, 180000, "grand_fisher"),
  m("adjuchas", "Adjuchas", 950, 42, 10, 1500, 1, 0xffffff, 330, 25000, "adjuchas"),
  m("arrancar", "Arrancar", 1400, 50, 14, 2300, 1, 0xffffff, 300, 30000, "arrancar"),
  m("metastacia", "Metastacia", 3800, 44, 11, 8000, 1, 0xffffff, 360, 150000, "metastacia"),
  m("gillian", "Menos Grande (Gillian)", 5200, 62, 16, 9000, 1, 0xffffff, 650, 120000, "gillian"),
  // Las Noches (nível 45+)
  m("arrancar_numeros", "Arrancar Números", 2300, 60, 17, 4800, 1, 0xffffff, 300, 30000, "arrancar_numeros"),
  m("exequias", "Exequias", 3200, 68, 20, 7000, 1, 0xffffff, 330, 30000, "exequias"),
  m("fraccion", "Fracción", 4300, 78, 24, 9800, 1, 0xffffff, 360, 35000, "fraccion"),
  m("privaron", "Privaron Espada", 18000, 92, 28, 42000, 1, 0xffffff, 300, 240000, "privaron"),
  { ...m("boneco", "Boneco de Treino", 3000, 0, 0, 0, 1, 0xffffff, 1000, 5000, "boneco"), dummy: true },
].map((d) => [d.id, d]));
