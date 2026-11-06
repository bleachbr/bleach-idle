import type { Rect } from "./map";

export type KarakuraSectorId = "setor_1" | "setor_2" | "setor_3" | "setor_4";

export interface KarakuraSector {
  id: KarakuraSectorId;
  sectorNumber: 1 | 2 | 3 | 4;
  name: string;
  subtitle: string;
  description: string;
  minLevel: number;
  maxLevel: number;
  rects: Rect[];
  landmarks: string[];
  recommendedHollows: string[];
  heroJourneySummary: string;
}

export const KARAKURA_SECTORS: Record<KarakuraSectorId, KarakuraSector> = {
  setor_1: {
    id: "setor_1",
    sectorNumber: 1,
    name: "Distrito Residencial",
    subtitle: "Clínica Kurosaki & Ruas Pacatas",
    description: "Área residencial tranquila onde almas humanas repousam. Berço dos primeiros passos de todo Shinigami recruta em Karakura.",
    minLevel: 1,
    maxLevel: 10,
    rects: [
      { x0: 0, y0: 0, x1: 17, y1: 11 },
      { x0: 0, y0: 12, x1: 31, y1: 23 },
      { x0: 0, y0: 24, x1: 15, y1: 34 },
    ],
    landmarks: ["Clínica Kurosaki", "Templo do Despertar (Spawn Inicial)", "Casas Residenciais", "Beco Silencioso"],
    recommendedHollows: ["hollow_menor"],
    heroJourneySummary: "Despertar espiritual e proteção das primeiras almas de Karakura (Lv 1-10).",
  },
  setor_2: {
    id: "setor_2",
    sectorNumber: 2,
    name: "Centro Comercial & Loja Urahara",
    subtitle: "Mercado Espiritual & Campo de Treinamento",
    description: "Distrito movimentado que abriga a Loja de Conveniência Urahara e a clareira a leste, ponto central para suprimentos e testes de poder.",
    minLevel: 10,
    maxLevel: 18,
    rects: [
      { x0: 18, y0: 0, x1: 63, y1: 11 },
      { x0: 32, y0: 12, x1: 63, y1: 23 },
    ],
    landmarks: ["Loja de Conveniência Urahara", "Senkaimon (Portal para a Soul Society)", "Depot Central", "Campo de Treinamento Leste"],
    recommendedHollows: ["hollow_menor", "hollow_rastejante", "hollow_sombrio", "hollow_uivante"],
    heroJourneySummary: "Aprimoramento sob a tutela de Kisuke Urahara e domínio das primeiras artes de combate (Lv 10-18).",
  },
  setor_3: {
    id: "setor_3",
    sectorNumber: 3,
    name: "Parque Beira-Rio Onagawa & Travessia da Ponte",
    subtitle: "Águas Espelhas & Memórias Sob a Chuva",
    description: "Extensão verdejante cortada pelo Rio Onagawa e sua ponte imponente. Lugar de memórias nostálgicas e Hollows adaptados à água.",
    minLevel: 18,
    maxLevel: 25,
    rects: [
      { x0: 16, y0: 24, x1: 36, y1: 34 },
      { x0: 0, y0: 35, x1: 36, y1: 47 },
    ],
    landmarks: ["Rio Onagawa", "Ponte de Karakura", "Parque Beira-Rio", "Memorial das Almas"],
    recommendedHollows: ["hollow_encouracado", "hollow_devorador"],
    heroJourneySummary: "Confronto de lembranças e enfrentamento de Hollows com defesas reforçadas (Lv 18-25).",
  },
  setor_4: {
    id: "setor_4",
    sectorNumber: 4,
    name: "Periferia Industrial Abandonada",
    subtitle: "Ruínas Fabris & Ninho dos Predadores",
    description: "Zona fabril decadente repleta de sucatas e galpões abandonados. Covil de Hollows ferozes e do temido Grand Fisher, porta de entrada para a Soul Society.",
    minLevel: 25,
    maxLevel: 30,
    rects: [
      { x0: 37, y0: 24, x1: 63, y1: 47 },
    ],
    landmarks: ["Galpões Abandonados", "Toca do Grand Fisher", "Chaminés Industriais", "Limiar Dimensional"],
    recommendedHollows: ["hollow_faminto", "hollow_acido", "fishbone", "grand_fisher"],
    heroJourneySummary: "Provação final contra ameaças de alto escalão até a oficial Convocação do Seireitei no nível 30 (Lv 25-30).",
  },
};

export const KARAKURA_SECTOR_LIST: KarakuraSector[] = [
  KARAKURA_SECTORS.setor_1,
  KARAKURA_SECTORS.setor_2,
  KARAKURA_SECTORS.setor_3,
  KARAKURA_SECTORS.setor_4,
];

/** Localiza o setor de Karakura com base nas coordenadas de tile (x, y) */
export function getKarakuraSector(x: number, y: number): KarakuraSector | undefined {
  if (x < 0 || y < 0 || x >= 64 || y >= 48) return undefined;
  for (const sector of KARAKURA_SECTOR_LIST) {
    for (const r of sector.rects) {
      if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) {
        return sector;
      }
    }
  }
  return undefined;
}

export function getKarakuraSectorById(id: string): KarakuraSector | undefined {
  return (KARAKURA_SECTORS as Record<string, KarakuraSector>)[id];
}

export function getKarakuraSectorByNumber(num: number): KarakuraSector | undefined {
  return KARAKURA_SECTOR_LIST.find((s) => s.sectorNumber === num);
}

/** Setor sugerido para o nível do jogador na Jornada do Herói */
export function getRecommendedSectorForLevel(level: number): KarakuraSector {
  if (level < 10) return KARAKURA_SECTORS.setor_1;
  if (level < 18) return KARAKURA_SECTORS.setor_2;
  if (level < 25) return KARAKURA_SECTORS.setor_3;
  return KARAKURA_SECTORS.setor_4;
}

/** Progresso da Jornada do Herói através dos setores de Karakura */
export function getHeroJourneySectorProgress(level: number): {
  currentSector: KarakuraSector;
  nextSector?: KarakuraSector;
  progressPct: number;
  summonReady: boolean;
} {
  const currentSector = getRecommendedSectorForLevel(level);
  const nextSector = KARAKURA_SECTOR_LIST.find((s) => s.sectorNumber === currentSector.sectorNumber + 1);
  const clampedLevel = Math.max(1, Math.min(30, level));
  const progressPct = Math.round(((clampedLevel - 1) / 29) * 100);
  const summonReady = level >= 30;

  return {
    currentSector,
    nextSector,
    progressPct,
    summonReady,
  };
}
