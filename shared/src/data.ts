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
  /** sem folha em client/public/assets/sprites_hd/ (ex.: boneco de treino estático) */
  noHd?: boolean;
  /** fora do preload: o cliente baixa quando alguém aparece com ela (trajes da Loja de Cristais) */
  lazy?: boolean;
}
export const SPRITES: Record<string, SpriteDef> = {
  ichigo_shikai: { frame: 48, cols: 8 },
  ichigo_bankai: { frame: 48, cols: 8 },
  rukia: { frame: 48, cols: 8 },
  renji: { frame: 48, cols: 8 },
  hollow: { frame: 96 },
  adjuchas: { frame: 96, cols: 8 },
  gillian: { frame: 96, cols: 8 },
  arrancar: { frame: 48, cols: 8 },
  boneco: { frame: 48, noHd: true },
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
  fraccion: { frame: 96, cols: 8 },
  privaron: { frame: 96, cols: 8 },
  ichigo_final: { frame: 48, cols: 8 },
  ichigo_hollow: { frame: 48, cols: 8 },
  ichigo_mugetsu: { frame: 48, cols: 8 },
  rukia_tenente: { frame: 48, cols: 8 },
  rukia_capita: { frame: 48, cols: 8 },
  renji_zero: { frame: 48, cols: 8 },
  renji_soo: { frame: 48, cols: 8 },
  ishida_hueco: { frame: 48, cols: 8 },
  ishida_stern: { frame: 48, cols: 8 },
  ishida_antithesis: { frame: 48, cols: 8 },
  sado_directo: { frame: 48, cols: 8 },
  sado_muerte: { frame: 48, cols: 8 },
  hitsugaya: { frame: 48, cols: 8 },
  hitsugaya_bankai: { frame: 48, cols: 8 },
  hitsugaya_hyakkaso: { frame: 48, cols: 8 },
  hitsugaya_adulto: { frame: 48, cols: 8 },
  hitsugaya_shiten: { frame: 48, cols: 8 },
  renji_final: { frame: 48, cols: 8 },
  sado_final: { frame: 48, cols: 8 },
  byakuya: { frame: 48, cols: 8 },
  byakuya_bankai: { frame: 48, cols: 8 },
  byakuya_senkei: { frame: 96, cols: 8 },
  byakuya_gokei: { frame: 48, cols: 8 },
  byakuya_hakuteiken: { frame: 96, cols: 8 },
  kenpachi: { frame: 48, cols: 8 },
  kenpachi_sem_tapa: { frame: 96, cols: 8 },
  kenpachi_kendo: { frame: 96, cols: 8 },
  kenpachi_shikai: { frame: 96, cols: 8 },
  kenpachi_bankai: { frame: 96, cols: 8 },
  // R-01: Yoruichi, Ukitake e Shunsui
  yoruichi: { frame: 48, cols: 8 },
  yoruichi_onmitsu: { frame: 48, cols: 8 },
  yoruichi_shunko: { frame: 48, cols: 8 },
  yoruichi_raijin: { frame: 48, cols: 8 },
  yoruichi_raijujin: { frame: 48, cols: 8 },
  ukitake: { frame: 48, cols: 8 },
  ukitake_shikai: { frame: 48, cols: 8 },
  ukitake_kotowari: { frame: 48, cols: 8 },
  ukitake_kido: { frame: 96, cols: 8 },
  ukitake_mimihagi: { frame: 96, cols: 8 },
  shunsui: { frame: 48, cols: 8 },
  shunsui_shikai: { frame: 48, cols: 8 },
  shunsui_kageoni: { frame: 48, cols: 8 },
  shunsui_bankai: { frame: 48, cols: 8 },
  shunsui_soutaichou: { frame: 48, cols: 8 },
  // níveis 60–150: Karakura Falsa e Wandenreich
  fraccion_espada: { frame: 48, cols: 8 },
  arrancar_resurreccion: { frame: 96, cols: 8 },
  vasto_lorde: { frame: 96, cols: 8 },
  ayon: { frame: 96, cols: 8 },
  soldado_wandenreich: { frame: 48, cols: 8 },
  sternritter: { frame: 48, cols: 8 },
  sternritter_vollstandig: { frame: 96, cols: 8 },
  yhwach: { frame: 96, cols: 8 },
};

// Variantes de visual por equipamento (folha inteira por combinação: <base>__<look>), só onde a lore permite:
// o haori de capitão nos shinigami da forma base e a máscara Hollow só no Ichigo (o único Visored).
export const OUTFIT_BASES = ["ichigo_shikai", "rukia", "renji"];
export const OUTFIT_LOOKS = ["haori", "mask", "haori_mask"];
const OUTFIT_OK: Record<string, string[]> = { ichigo_shikai: ["haori", "mask", "haori_mask"], rukia: ["haori"], renji: ["haori"] };
for (const b of OUTFIT_BASES) for (const l of OUTFIT_OK[b]) SPRITES[`${b}__${l}`] = { frame: 48, cols: 8 };

// R-13: trajes da Loja de Cristais, também uma folha por combinação, mas com nomes próprios para não mudar a
// regra do equipamento (o haori equipado continua sem efeito no Sado). Valem na forma base de todos;
// quem já usa haori de capitão na forma base fica sem o "capitao". Baixam só quando alguém aparece com eles (lazy).
export const COS_LOOK_BASES = ["ichigo_shikai", "rukia", "renji", "ishida", "sado", "hitsugaya", "byakuya", "kenpachi", "yoruichi", "ukitake", "shunsui"];
const CAPTAIN_BASES = new Set(["hitsugaya", "byakuya", "kenpachi", "ukitake", "shunsui"]);
for (const b of COS_LOOK_BASES)
  for (const l of ["karakura", "vizard", ...(CAPTAIN_BASES.has(b) ? [] : ["capitao"])]) {
    (OUTFIT_OK[b] ??= []).push(l);
    SPRITES[`${b}__${l}`] = { frame: 48, cols: 8, lazy: true };
  }

export const spriteCols = (key: string) => SPRITES[key]?.cols ?? 4;
/** quadro "parado" de uma direção: o de passagem, com as pernas juntas */
export const standFrame = (key: string, dir: number) => dir * spriteCols(key) + (spriteCols(key) === 8 ? 2 : 1);
/** posição CSS do quadro parado olhando para baixo (retratos do lobby e do livro) */
export const portraitCss = (key: string) => {
  const cols = spriteCols(key);
  return `background-size:${cols * 100}% 400%;background-position:${((cols === 8 ? 2 : 1) / (cols - 1)) * 100}% 0`;
};

export function spriteKey(base: string, look: string): string {
  return look && OUTFIT_OK[base]?.includes(look) ? `${base}__${look}` : base;
}

export interface FormDef {
  id: string;
  label: string;
  /** grito ao liberar a forma ("BANKAI!", "MÁSCARA HOLLOW!") */
  shout?: string;
  sprite: string;
  tint?: number;
  dmgMult: number;
  stepMs: number;
  attackMs: number;
  /** reiatsu gasto por segundo enquanto a forma estiver ativa */
  reiDrain: number;
  minLevel: number;
  /** a técnica 1 evolui com a forma: novo nome, cor e força */
  skill?: { name: string; color: number; mult: number };
}

export interface SkillDef {
  name: string;
  range: number;
  cost: number;
  mult: number;
  cdMs: number;
  color: number;
  /** nível para aprender (a técnica 1 vem do começo) */
  minLevel?: number;
  /** raio em volta do alvo: acerta também os monstros vizinhos */
  area?: number;
  /** efeito de status aplicado no alvo (M2-01..05) */
  status?: import("./combatStatus").SkillStatusDef;
}

export interface CharDef {
  id: string;
  name: string;
  atk: number;
  def: number;
  /** estágios da evolução, nos níveis de FORM_LEVELS, seguindo a história de cada um */
  forms: FormDef[];
  skill: SkillDef;
  /** técnicas aprendidas com o nível (25, 50 e 100) */
  techs: SkillDef[];
}

/** Níveis de cada estágio da evolução: a base, a liberação e mais três passos da história do personagem. */
export const FORM_LEVELS = [1, 10, 30, 60, 100];

export const CHARS: Record<string, CharDef> = {
  // Shinigami substituto → Bankai → Visored → Hollowficação → Mugetsu
  ichigo: {
    id: "ichigo",
    name: "Ichigo",
    atk: 14,
    def: 4,
    forms: [
      { id: "shikai", label: "Shikai: Zangetsu", sprite: "ichigo_shikai", dmgMult: 1, stepMs: 260, attackMs: 1000, reiDrain: 0, minLevel: 1 },
      { id: "bankai", label: "Bankai: Tensa Zangetsu", shout: "BANKAI!", sprite: "ichigo_bankai", dmgMult: 1.7, stepMs: 170, attackMs: 650, reiDrain: 2.5, minLevel: 10,
        skill: { name: "Getsuga Tenshō Negro", color: 0xd0203c, mult: 3.2 } },
      { id: "visored", label: "Visored: Máscara Hollow", shout: "MÁSCARA HOLLOW!", sprite: "ichigo_final", dmgMult: 2.1, stepMs: 155, attackMs: 580, reiDrain: 3.5, minLevel: 30,
        skill: { name: "Getsuga Tenshō Mascarado", color: 0xff1e3c, mult: 3.6 } },
      { id: "hollow", label: "Hollowficação", shout: "HOLLOWFICAÇÃO!", sprite: "ichigo_hollow", dmgMult: 2.5, stepMs: 140, attackMs: 520, reiDrain: 5, minLevel: 60,
        skill: { name: "Cero Oscuras", color: 0x9a0a2a, mult: 4 } },
      { id: "mugetsu", label: "Saigo no Getsuga Tenshō", shout: "MUGETSU!", sprite: "ichigo_mugetsu", dmgMult: 3, stepMs: 125, attackMs: 460, reiDrain: 6, minLevel: 100,
        skill: { name: "Getsuga Final", color: 0x6a1a9a, mult: 4.6 } },
    ],
    skill: { name: "Getsuga Tenshō", range: 4, cost: 20, mult: 2.6, cdMs: 3000, color: 0x5ad1ff },
    techs: [
      { name: "Getsuga Jūjishō", minLevel: 25, range: 4, cost: 35, mult: 3.4, cdMs: 6000, color: 0x5ad1ff, area: 1 },
      { name: "Cero", minLevel: 50, range: 6, cost: 50, mult: 4.5, cdMs: 10000, color: 0xff2040, area: 2 },
      { name: "Mugetsu", minLevel: 100, range: 7, cost: 90, mult: 9, cdMs: 30000, color: 0x8a2be2, area: 3 },
    ],
  },
  // Shikai → Tenente da 13ª → Bankai (Hakka no Togame) → Capitã da 13ª → Capitã com Bankai
  rukia: {
    id: "rukia",
    name: "Rukia",
    atk: 11,
    def: 3,
    forms: [
      { id: "shikai", label: "Shikai: Sode no Shirayuki", sprite: "rukia", dmgMult: 1, stepMs: 250, attackMs: 950, reiDrain: 0, minLevel: 1 },
      { id: "tenente", label: "Tenente da 13ª Divisão", shout: "TENENTE!", sprite: "rukia_tenente", dmgMult: 1.6, stepMs: 190, attackMs: 700, reiDrain: 2.5, minLevel: 10,
        skill: { name: "Juhaku", color: 0xbfe9ff, mult: 3.4 } },
      { id: "bankai", label: "Bankai: Hakka no Togame", shout: "BANKAI!", sprite: "rukia_bankai", dmgMult: 2, stepMs: 170, attackMs: 630, reiDrain: 3.5, minLevel: 30,
        skill: { name: "Hakka no Togame", color: 0xe6fbff, mult: 3.9 } },
      { id: "capita", label: "Capitã da 13ª Divisão", shout: "CAPITÃ!", sprite: "rukia__haori", dmgMult: 2.4, stepMs: 150, attackMs: 560, reiDrain: 5, minLevel: 60,
        skill: { name: "Hakuren: Neve Eterna", color: 0xffffff, mult: 4.4 } },
      { id: "zero", label: "Capitã: Hakka no Togame", shout: "ZERO ABSOLUTO!", sprite: "rukia_capita", dmgMult: 2.9, stepMs: 135, attackMs: 500, reiDrain: 6, minLevel: 100,
        skill: { name: "Hakuren Absoluto", color: 0xffffff, mult: 5 } },
    ],
    // mais alcance e mais dano de habilidade, menos corpo a corpo
    skill: { name: "Tsugi no Mai: Hakuren", range: 6, cost: 22, mult: 3.0, cdMs: 3000, color: 0xe6fbff, status: { kind: "slow", durationMs: 3000, slowMult: 1.5 } },
    techs: [
      { name: "Some no Mai: Tsukishiro", minLevel: 25, range: 5, cost: 35, mult: 3, cdMs: 6000, color: 0xbff4ff, area: 2, status: { kind: "freeze", durationMs: 2000 } },
      { name: "San no Mai: Shirafune", minLevel: 50, range: 7, cost: 45, mult: 4.8, cdMs: 9000, color: 0xe6fbff },
      { name: "Zero Absoluto", minLevel: 100, range: 6, cost: 90, mult: 8, cdMs: 30000, color: 0xffffff, area: 3, status: { kind: "freeze", durationMs: 3000 } },
    ],
  },
  // Shikai → Bankai → depois do treino com a Divisão Zero → Bankai verdadeiro (Sōō Zabimaru) → Zaga Tetsuzan
  renji: {
    id: "renji",
    name: "Renji",
    atk: 16,
    def: 5,
    forms: [
      { id: "shikai", label: "Shikai: Zabimaru", sprite: "renji", dmgMult: 1, stepMs: 270, attackMs: 1050, reiDrain: 0, minLevel: 1 },
      { id: "bankai", label: "Bankai: Hihiō Zabimaru", shout: "BANKAI!", sprite: "renji_bankai", dmgMult: 1.8, stepMs: 200, attackMs: 750, reiDrain: 2.5, minLevel: 10,
        skill: { name: "Higa Zekkō: Hihiō", color: 0xff4a2a, mult: 3 } },
      { id: "zero", label: "Treino da Divisão Zero", shout: "DIVISÃO ZERO!", sprite: "renji_zero", dmgMult: 2.25, stepMs: 180, attackMs: 680, reiDrain: 3.5, minLevel: 30,
        skill: { name: "Hikotsu Taihō", color: 0xff6a20, mult: 3.3 } },
      { id: "soo", label: "Bankai Verdadeiro: Sōō Zabimaru", shout: "SŌŌ ZABIMARU!", sprite: "renji_final", dmgMult: 2.7, stepMs: 160, attackMs: 600, reiDrain: 5, minLevel: 60,
        skill: { name: "Higa Zekkō: Sōō", color: 0xff2a10, mult: 3.6 } },
      { id: "zaga", label: "Sōō Zabimaru: Zaga Tetsuzan", shout: "ZAGA TETSUZAN!", sprite: "renji_soo", dmgMult: 3.2, stepMs: 145, attackMs: 540, reiDrain: 6, minLevel: 100,
        skill: { name: "Zaga Tetsuzan", color: 0xff3a00, mult: 4.2 } },
    ],
    skill: { name: "Higa Zekkō", range: 3, cost: 18, mult: 2.4, cdMs: 2500, color: 0xff6a4a },
    techs: [
      { name: "Rōga Sō", minLevel: 25, range: 4, cost: 35, mult: 3.2, cdMs: 6000, color: 0xff6a4a, area: 2 },
      { name: "Hikotsu Taihō", minLevel: 50, range: 6, cost: 45, mult: 4.6, cdMs: 9000, color: 0xff4020, area: 1 },
      { name: "Hihiō Zabimaru: Fogo Total", minLevel: 100, range: 5, cost: 90, mult: 9.5, cdMs: 30000, color: 0xff2010, area: 2, status: { kind: "dot", durationMs: 4000, tickMs: 1000, dotRatio: 0.25 } },
    ],
  },
  // Quincy: corpo a corpo fraco, flecha de longe e barata.
  // Ginrei Kojaku → Letzt Stil → Hueco Mundo (Seele Schneider) → Sternritter "A" → Antithesis
  ishida: {
    id: "ishida",
    name: "Ishida",
    atk: 10,
    def: 3,
    forms: [
      { id: "shikai", label: "Quincy: Ginrei Kojaku", sprite: "ishida", dmgMult: 1, stepMs: 240, attackMs: 900, reiDrain: 0, minLevel: 1 },
      { id: "letzt", label: "Quincy: Letzt Stil", shout: "LETZT STIL!", sprite: "ishida_power", dmgMult: 1.6, stepMs: 180, attackMs: 650, reiDrain: 2.5, minLevel: 10,
        skill: { name: "Licht Regen: Letzt Stil", color: 0x9fe6ff, mult: 3.1 } },
      { id: "hueco", label: "Hueco Mundo: Seele Schneider", shout: "SEELE SCHNEIDER!", sprite: "ishida_hueco", dmgMult: 2, stepMs: 160, attackMs: 570, reiDrain: 3.5, minLevel: 30,
        skill: { name: "Seele Schneider", color: 0x7fd6ff, mult: 3.5 } },
      { id: "stern", label: "Sternritter \"A\"", shout: "STERNRITTER!", sprite: "ishida_stern", dmgMult: 2.4, stepMs: 140, attackMs: 500, reiDrain: 5, minLevel: 60,
        skill: { name: "Heilig Pfeil: Sternritter", color: 0xffffff, mult: 3.8 } },
      { id: "antithesis", label: "Sternritter \"A\": Antithesis", shout: "ANTITHESIS!", sprite: "ishida_antithesis", dmgMult: 2.9, stepMs: 125, attackMs: 450, reiDrain: 6, minLevel: 100,
        skill: { name: "Antithesis", color: 0x4ab0ff, mult: 4.4 } },
    ],
    skill: { name: "Licht Regen", range: 7, cost: 16, mult: 2.5, cdMs: 2500, color: 0x7fd6ff },
    techs: [
      { name: "Sprenger", minLevel: 25, range: 6, cost: 35, mult: 3, cdMs: 6000, color: 0x7fd6ff, area: 2 },
      { name: "Heilig Pfeil", minLevel: 50, range: 9, cost: 40, mult: 4.6, cdMs: 8000, color: 0xbfefff },
      { name: "Heizen", minLevel: 100, range: 8, cost: 90, mult: 8.5, cdMs: 30000, color: 0xffffff, area: 3 },
    ],
  },
  // braço do gigante: o mais forte e resistente, o mais lento.
  // Brazo Derecha → Brazo Izquierda (Hueco Mundo) → os braços do Fullbring → El Directo → La Muerte
  sado: {
    id: "sado",
    name: "Sado",
    atk: 17,
    def: 7,
    forms: [
      { id: "shikai", label: "Brazo Derecha de Gigante", sprite: "sado", dmgMult: 1, stepMs: 290, attackMs: 1100, reiDrain: 0, minLevel: 1 },
      { id: "diablo", label: "Brazo Izquierda del Diablo", shout: "DIABLO!", sprite: "sado_power", dmgMult: 1.85, stepMs: 200, attackMs: 800, reiDrain: 2.5, minLevel: 10,
        skill: { name: "El Directo Diablo", color: 0xff3020, mult: 3.4 } },
      { id: "fullbring", label: "Fullbring: Gigante e Diablo", shout: "FULLBRING!", sprite: "sado_final", dmgMult: 2.3, stepMs: 185, attackMs: 720, reiDrain: 3.5, minLevel: 30,
        skill: { name: "El Directo Fullbring", color: 0xff1a1a, mult: 3.8 } },
      { id: "directo", label: "Fullbring: El Directo", shout: "EL DIRECTO!", sprite: "sado_directo", dmgMult: 2.8, stepMs: 170, attackMs: 640, reiDrain: 5, minLevel: 60,
        skill: { name: "El Directo Máximo", color: 0x9fd8ff, mult: 4.2 } },
      { id: "muerte", label: "Fullbring: La Muerte", shout: "LA MUERTE!", sprite: "sado_muerte", dmgMult: 3.3, stepMs: 155, attackMs: 580, reiDrain: 6, minLevel: 100,
        skill: { name: "La Muerte", color: 0xc01030, mult: 4.8 } },
    ],
    skill: { name: "El Directo", range: 3, cost: 20, mult: 2.8, cdMs: 3000, color: 0xff5040 },
    techs: [
      { name: "Golpe de Mi Abuelo", minLevel: 25, range: 3, cost: 35, mult: 3.8, cdMs: 6000, color: 0xff5040, area: 2 },
      { name: "Golpe do Gigante", minLevel: 50, range: 4, cost: 45, mult: 5, cdMs: 9000, color: 0xffd040, area: 1, status: { kind: "stun", durationMs: 1500 } },
      { name: "Puño del Diablo", minLevel: 100, range: 4, cost: 90, mult: 10, cdMs: 30000, color: 0xff2020, area: 3, status: { kind: "stun", durationMs: 2000 } },
    ],
  },
  // o capitão-prodígio do gelo: técnicas em área, alcance médio.
  // Shikai → Bankai (asas de gelo) → Hyōten Hyakkasō → Forma Adulta → Shiten Kōsō
  hitsugaya: {
    id: "hitsugaya",
    name: "Hitsugaya",
    atk: 13,
    def: 4,
    forms: [
      { id: "shikai", label: "Shikai: Hyōrinmaru", sprite: "hitsugaya", dmgMult: 1, stepMs: 250, attackMs: 950, reiDrain: 0, minLevel: 1 },
      { id: "bankai", label: "Bankai: Daiguren Hyōrinmaru", shout: "BANKAI!", sprite: "hitsugaya_bankai", dmgMult: 1.7, stepMs: 180, attackMs: 680, reiDrain: 2.5, minLevel: 10,
        skill: { name: "Ryūsenka", color: 0x9fe8ff, mult: 3.2 } },
      { id: "hyakkaso", label: "Bankai: Hyōten Hyakkasō", shout: "HYŌTEN HYAKKASŌ!", sprite: "hitsugaya_hyakkaso", dmgMult: 2.1, stepMs: 165, attackMs: 610, reiDrain: 3.5, minLevel: 30,
        skill: { name: "Hyōten Hyakkasō", color: 0xbff4ff, mult: 3.6 } },
      { id: "adulto", label: "Daiguren Hyōrinmaru: Forma Adulta", shout: "FORMA ADULTA!", sprite: "hitsugaya_adulto", dmgMult: 2.5, stepMs: 145, attackMs: 540, reiDrain: 5, minLevel: 60,
        skill: { name: "Sennen Hyōrō", color: 0xe6fbff, mult: 4.1 } },
      { id: "shiten", label: "Forma Adulta: Shiten Kōsō", shout: "SHITEN KŌSŌ!", sprite: "hitsugaya_shiten", dmgMult: 3, stepMs: 130, attackMs: 480, reiDrain: 6, minLevel: 100,
        skill: { name: "Shiten Kōsō", color: 0xffffff, mult: 4.7 } },
    ],
    skill: { name: "Hyōryū: Dragão de Gelo", range: 5, cost: 20, mult: 2.8, cdMs: 3000, color: 0x9fe8ff, status: { kind: "slow", durationMs: 3000, slowMult: 1.5 } },
    techs: [
      { name: "Guncho Tsurara", minLevel: 25, range: 5, cost: 35, mult: 3.1, cdMs: 6000, color: 0xbff4ff, area: 2, status: { kind: "slow", durationMs: 3000, slowMult: 1.5 } },
      { name: "Hyōryū Senbi", minLevel: 50, range: 6, cost: 45, mult: 4.6, cdMs: 9000, color: 0x9fe8ff, area: 1, status: { kind: "freeze", durationMs: 2000 } },
      { name: "Ryūsenka: Flor de Gelo", minLevel: 100, range: 7, cost: 90, mult: 8.5, cdMs: 30000, color: 0xffffff, area: 3, status: { kind: "freeze", durationMs: 3000 } },
    ],
  },
  // o capitão nobre da 6ª Divisão: pétalas-lâmina em área, de longe.
  // Shikai → Bankai → Senkei → Gōkei → Shūkei: Hakuteiken
  byakuya: {
    id: "byakuya",
    name: "Byakuya",
    atk: 14,
    def: 4,
    forms: [
      { id: "shikai", label: "Shikai: Senbonzakura", sprite: "byakuya", dmgMult: 1, stepMs: 250, attackMs: 950, reiDrain: 0, minLevel: 1 },
      { id: "bankai", label: "Bankai: Senbonzakura Kageyoshi", shout: "BANKAI!", sprite: "byakuya_bankai", dmgMult: 1.7, stepMs: 175, attackMs: 660, reiDrain: 2.5, minLevel: 10,
        skill: { name: "Senbonzakura Kageyoshi", color: 0xff9fc4, mult: 3.2 } },
      { id: "senkei", label: "Senkei: Senbonzakura Kageyoshi", shout: "SENKEI!", sprite: "byakuya_senkei", dmgMult: 2.1, stepMs: 160, attackMs: 600, reiDrain: 3.5, minLevel: 30,
        skill: { name: "Senkei", color: 0xffc0dc, mult: 3.6 } },
      { id: "gokei", label: "Gōkei: Senbonzakura Kageyoshi", shout: "GŌKEI!", sprite: "byakuya_gokei", dmgMult: 2.5, stepMs: 145, attackMs: 530, reiDrain: 5, minLevel: 60,
        skill: { name: "Gōkei", color: 0xff7ab0, mult: 4.1 } },
      { id: "hakuteiken", label: "Shūkei: Hakuteiken", shout: "SHŪKEI: HAKUTEIKEN!", sprite: "byakuya_hakuteiken", dmgMult: 3, stepMs: 130, attackMs: 470, reiDrain: 6, minLevel: 100,
        skill: { name: "Hakuteiken", color: 0xffffff, mult: 4.8 } },
    ],
    skill: { name: "Senbonzakura", range: 5, cost: 25, mult: 2.6, cdMs: 3500, color: 0xff9fc4, area: 1 },
    techs: [
      { name: "Hadō 4: Byakurai", minLevel: 25, range: 6, cost: 35, mult: 3.4, cdMs: 6000, color: 0xe8f4ff, status: { kind: "stun", durationMs: 1200 } },
      { name: "Senka", minLevel: 50, range: 2, cost: 45, mult: 5, cdMs: 9000, color: 0xffd0e8 },
      { name: "Ikka Senjinka", minLevel: 100, range: 5, cost: 90, mult: 9.5, cdMs: 30000, color: 0xff7ab0, area: 2 },
    ],
  },
  // o capitão da 11ª Divisão: só quer briga. Corpo a corpo, o mais forte de perto.
  // Tapa-olho e sinos → Sem o tapa-olho → Kendō com as duas mãos → Shikai: Nozarashi → Bankai
  kenpachi: {
    id: "kenpachi",
    name: "Kenpachi",
    atk: 16,
    def: 5,
    forms: [
      { id: "base", label: "Kenpachi: Tapa-Olho e Sinos", sprite: "kenpachi", dmgMult: 1, stepMs: 260, attackMs: 1000, reiDrain: 0, minLevel: 1 },
      { id: "semtapa", label: "Sem o Tapa-Olho", shout: "SEM LIMITES!", sprite: "kenpachi_sem_tapa", dmgMult: 1.85, stepMs: 185, attackMs: 680, reiDrain: 2.5, minLevel: 10,
        skill: { name: "Corte sem Limites", color: 0xffb030, mult: 3.3 } },
      { id: "kendo", label: "Kendō: Duas Mãos", shout: "KENDŌ!", sprite: "kenpachi_kendo", dmgMult: 2.3, stepMs: 170, attackMs: 610, reiDrain: 3.5, minLevel: 30,
        skill: { name: "Ryōdan", color: 0xffe080, mult: 3.8 } },
      { id: "nozarashi", label: "Shikai: Nozarashi", shout: "BEBA, NOZARASHI!", sprite: "kenpachi_shikai", dmgMult: 2.8, stepMs: 150, attackMs: 540, reiDrain: 5, minLevel: 60,
        skill: { name: "Nozarashi", color: 0xffc040, mult: 4.3 } },
      { id: "bankai", label: "Bankai", shout: "BANKAI!", sprite: "kenpachi_bankai", dmgMult: 3.3, stepMs: 135, attackMs: 480, reiDrain: 6, minLevel: 100,
        skill: { name: "Fúria do Demônio", color: 0xff2020, mult: 5 } },
    ],
    skill: { name: "Corte de Reiatsu", range: 2, cost: 20, mult: 3, cdMs: 3000, color: 0xffd040 },
    techs: [
      { name: "Reiatsu Esmagador", minLevel: 25, range: 2, cost: 35, mult: 3.8, cdMs: 6000, color: 0xffd040, area: 2, status: { kind: "dot", durationMs: 3000, tickMs: 1000, dotRatio: 0.2 } },
      { name: "Kendō: Ryōdan", minLevel: 50, range: 3, cost: 45, mult: 5.4, cdMs: 9000, color: 0xffe080, area: 1 },
      { name: "Nozarashi: Corte do Céu", minLevel: 100, range: 3, cost: 90, mult: 10.5, cdMs: 30000, color: 0xff2020, area: 3, status: { kind: "dot", durationMs: 3000, tickMs: 1000, dotRatio: 0.25 } },
    ],
  },
  // R-01 (bloco R). A ex-capitã da 2ª Divisão: a mais rápida, luta de mãos vazias (hakuda e shunpo).
  // Ex-capitã → Comandante do Onmitsukidō → Shunkō → Shunkō: Raijin Senkei → Shunkō: Raijū Senkei
  yoruichi: {
    id: "yoruichi",
    name: "Yoruichi",
    atk: 13,
    def: 4,
    forms: [
      { id: "base", label: "Ex-Capitã da 2ª Divisão", sprite: "yoruichi", dmgMult: 1, stepMs: 230, attackMs: 900, reiDrain: 0, minLevel: 1 },
      { id: "onmitsu", label: "Comandante do Onmitsukidō", shout: "ONMITSUKIDŌ!", sprite: "yoruichi_onmitsu", dmgMult: 1.75, stepMs: 165, attackMs: 620, reiDrain: 2.5, minLevel: 10,
        skill: { name: "Golpe do Onmitsukidō", color: 0xffb04a, mult: 3.2 } },
      { id: "shunko", label: "Shunkō", shout: "SHUNKŌ!", sprite: "yoruichi_shunko", dmgMult: 2.2, stepMs: 150, attackMs: 560, reiDrain: 3.5, minLevel: 30,
        skill: { name: "Shunkō", color: 0xbfe8ff, mult: 3.6 } },
      { id: "raijin", label: "Shunkō: Raijin Senkei", shout: "RAIJIN SENKEI!", sprite: "yoruichi_raijin", dmgMult: 2.6, stepMs: 135, attackMs: 500, reiDrain: 5, minLevel: 60,
        skill: { name: "Raijin Senkei", color: 0xffffff, mult: 4.1 } },
      { id: "raijujin", label: "Shunkō: Raijū Senkei", shout: "RAIJŪ SENKEI!", sprite: "yoruichi_raijujin", dmgMult: 3.05, stepMs: 120, attackMs: 460, reiDrain: 6, minLevel: 100,
        skill: { name: "Raijū Senkei", color: 0xfff06a, mult: 4.8 } },
    ],
    skill: { name: "Shunpo: Golpe Relâmpago", range: 2, cost: 20, mult: 2.9, cdMs: 3000, color: 0xffd34a },
    techs: [
      { name: "Shunkō: Onda de Choque", minLevel: 25, range: 2, cost: 35, mult: 3.6, cdMs: 6000, color: 0xbfe8ff, area: 2 },
      { name: "Utsusemi", minLevel: 50, range: 3, cost: 45, mult: 5.2, cdMs: 9000, color: 0xffb04a },
      { name: "Raijin Senkei: Trovão", minLevel: 100, range: 3, cost: 90, mult: 10.2, cdMs: 30000, color: 0xfff06a, area: 3 },
    ],
  },
  // R-01. O capitão da 13ª Divisão: kidō de longe e a Zanpakutō dupla que devolve o golpe.
  // Capitão → Shikai: Sōgyo no Kotowari → Kotowari: Reflexão → Kidō: Sōren Sōkatsui → Kamikake: Mimihagi
  ukitake: {
    id: "ukitake",
    name: "Ukitake",
    atk: 13,
    def: 4,
    forms: [
      { id: "base", label: "Capitão da 13ª Divisão", sprite: "ukitake", dmgMult: 1, stepMs: 255, attackMs: 960, reiDrain: 0, minLevel: 1 },
      { id: "shikai", label: "Shikai: Sōgyo no Kotowari", shout: "SŌGYO NO KOTOWARI!", sprite: "ukitake_shikai", dmgMult: 1.7, stepMs: 180, attackMs: 670, reiDrain: 2.5, minLevel: 10,
        skill: { name: "Sōgyo no Kotowari", color: 0x9fd0ff, mult: 3.2 } },
      { id: "kotowari", label: "Kotowari: Reflexão", shout: "REFLEXÃO!", sprite: "ukitake_kotowari", dmgMult: 2.1, stepMs: 163, attackMs: 605, reiDrain: 3.5, minLevel: 30,
        skill: { name: "Kotowari: Reflexão", color: 0xbfe0ff, mult: 3.6 } },
      { id: "kido", label: "Kidō: Sōren Sōkatsui", shout: "SŌREN SŌKATSUI!", sprite: "ukitake_kido", dmgMult: 2.55, stepMs: 148, attackMs: 535, reiDrain: 5, minLevel: 60,
        skill: { name: "Sōren Sōkatsui", color: 0x6ab8ff, mult: 4.1 } },
      { id: "mimihagi", label: "Kamikake: Mimihagi", shout: "MIMIHAGI!", sprite: "ukitake_mimihagi", dmgMult: 3, stepMs: 132, attackMs: 475, reiDrain: 6, minLevel: 100,
        skill: { name: "Mimihagi", color: 0x8a6ab0, mult: 4.8 } },
    ],
    skill: { name: "Hadō 31: Shakkahō", range: 5, cost: 25, mult: 2.7, cdMs: 3500, color: 0xff6a3a },
    techs: [
      { name: "Bakudō 61: Rikujōkōrō", minLevel: 25, range: 5, cost: 35, mult: 3.3, cdMs: 6000, color: 0xfff0a0, status: { kind: "stun", durationMs: 1500 } },
      { name: "Kotowari: Onda Refletida", minLevel: 50, range: 6, cost: 45, mult: 4.6, cdMs: 9000, color: 0x9fd0ff, area: 1 },
      { name: "Kamikake", minLevel: 100, range: 6, cost: 90, mult: 9.2, cdMs: 30000, color: 0x8a6ab0, area: 3 },
    ],
  },
  // R-01. O capitão da 8ª Divisão e depois Capitão-Comandante: duas lâminas e os jogos de criança da Zanpakutō.
  // Capitão → Shikai: Katen Kyōkotsu → Kageoni → Bankai: Karamatsu Shinjū → Capitão-Comandante
  shunsui: {
    id: "shunsui",
    name: "Shunsui",
    atk: 14,
    def: 4,
    forms: [
      { id: "base", label: "Capitão da 8ª Divisão", sprite: "shunsui", dmgMult: 1, stepMs: 250, attackMs: 940, reiDrain: 0, minLevel: 1 },
      { id: "shikai", label: "Shikai: Katen Kyōkotsu", shout: "KATEN KYŌKOTSU!", sprite: "shunsui_shikai", dmgMult: 1.75, stepMs: 178, attackMs: 650, reiDrain: 2.5, minLevel: 10,
        skill: { name: "Bushōgoma", color: 0xc0e0ff, mult: 3.3 } },
      { id: "kageoni", label: "Kageoni", shout: "KAGEONI!", sprite: "shunsui_kageoni", dmgMult: 2.2, stepMs: 162, attackMs: 590, reiDrain: 3.5, minLevel: 30,
        skill: { name: "Kageoni", color: 0x6a3a8a, mult: 3.7 } },
      { id: "bankai", label: "Bankai: Karamatsu Shinjū", shout: "BANKAI!", sprite: "shunsui_bankai", dmgMult: 2.7, stepMs: 146, attackMs: 520, reiDrain: 5, minLevel: 60,
        skill: { name: "Dangyo no Fuchi", color: 0x8a2a6a, mult: 4.2 } },
      { id: "soutaichou", label: "Capitão-Comandante", shout: "CAPITÃO-COMANDANTE!", sprite: "shunsui_soutaichou", dmgMult: 3.15, stepMs: 130, attackMs: 465, reiDrain: 6, minLevel: 100,
        skill: { name: "Karamatsu Shinjū", color: 0xff9fc4, mult: 4.9 } },
    ],
    skill: { name: "Corte Duplo", range: 2, cost: 20, mult: 3, cdMs: 3000, color: 0xff9fc4 },
    techs: [
      { name: "Bushōgoma: Vendaval", minLevel: 25, range: 4, cost: 35, mult: 3.4, cdMs: 6000, color: 0xc0e0ff, area: 1 },
      { name: "Takaoni", minLevel: 50, range: 2, cost: 45, mult: 5.2, cdMs: 9000, color: 0xffd0e0 },
      { name: "Itokiribasami", minLevel: 100, range: 4, cost: 90, mult: 10, cdMs: 30000, color: 0x8a2a6a, area: 3 },
    ],
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
  m("adjuchas", "Adjuchas", 950, 40, 10, 1650, 1, 0xffffff, 330, 25000, "adjuchas"),
  m("arrancar", "Arrancar", 1300, 45, 12, 2500, 1, 0xffffff, 300, 25000, "arrancar"),
  m("metastacia", "Metastacia", 3800, 44, 11, 8000, 1, 0xffffff, 360, 150000, "metastacia"),
  m("gillian", "Menos Grande (Gillian)", 5200, 62, 16, 9000, 1, 0xffffff, 650, 120000, "gillian"),
  // Las Noches (nível 45+)
  m("arrancar_numeros", "Arrancar Números", 1650, 49, 14, 3600, 1, 0xffffff, 300, 25000, "arrancar_numeros"),
  m("exequias", "Exequias", 2000, 53, 15, 4650, 1, 0xffffff, 330, 25000, "exequias"),
  m("fraccion", "Fracción", 2350, 55, 16, 5850, 1, 0xffffff, 360, 25000, "fraccion"),
  m("privaron", "Privaron Espada", 18000, 88, 26, 42000, 1, 0xffffff, 300, 240000, "privaron"),
  // Karakura Falsa (nível 60+): o exército de Aizen na réplica da cidade
  m("fraccion_espada", "Fracción de Espada", 2600, 56, 18, 7000, 1, 0xffffff, 320, 25000, "fraccion_espada"),
  m("arrancar_resurreccion", "Arrancar em Resurrección", 3400, 62, 20, 9500, 1, 0xffffff, 340, 25000, "arrancar_resurreccion"),
  m("vasto_lorde", "Vasto Lorde", 4400, 68, 22, 13000, 1, 0xffffff, 300, 30000, "vasto_lorde"),
  m("ayon", "Ayon", 40000, 110, 30, 160000, 1, 0xffffff, 380, 300000, "ayon"),
  // Wandenreich (nível 95+): a Seireitei tomada pelos Quincy
  m("soldado_wandenreich", "Soldado do Wandenreich", 5600, 74, 24, 17500, 1, 0xffffff, 320, 25000, "soldado_wandenreich"),
  m("sternritter", "Sternritter", 7000, 80, 26, 23000, 1, 0xffffff, 300, 30000, "sternritter"),
  m("sternritter_vollstandig", "Sternritter em Vollständig", 8800, 86, 28, 30000, 1, 0xffffff, 300, 35000, "sternritter_vollstandig"),
  m("yhwach", "Yhwach", 120000, 150, 40, 600000, 1, 0xffffff, 340, 600000, "yhwach"),
  // chefe mundial (evento): um Gillian que viveu demais; a vida real cresce com quem está online
  m("menos_anciao", "Menos Ancião", 30000, 80, 18, 40000, 1.35, 0x9a6aff, 700, 0, "gillian"),
  { ...m("boneco", "Boneco de Treino", 3000, 0, 0, 0, 1, 0xffffff, 1000, 5000, "boneco"), dummy: true },
].map((d) => [d.id, d]));
