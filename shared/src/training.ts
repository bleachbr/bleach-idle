// Treino no estilo Tibia/DBO: duas habilidades que sobem com o uso e aumentam o dano.
//   Zanjutsu (esgrima) — sobe a cada golpe corpo a corpo que acerta; +2% de dano corpo a corpo por nível.
//   Reiryoku (o "magic level") — sobe com o reiatsu gasto (habilidades e Auto Treino); +3% de dano de habilidade por nível.
// Bonecos de treino (Soul Society) aguentam golpes sem morrer: dá para treinar Zanjutsu inclusive offline.

export const ZANJUTSU_BASE = 40; // golpes para o nível 1
export const REIRYOKU_BASE = 150; // reiatsu para o nível 1
const GROWTH = 1.12;

/** quanto falta acumular para passar do nível `lvl` ao seguinte */
export const zanNext = (lvl: number) => Math.round(ZANJUTSU_BASE * GROWTH ** lvl);
export const reiNext = (lvl: number) => Math.round(REIRYOKU_BASE * GROWTH ** lvl);

export const zanMult = (lvl: number) => 1 + lvl * 0.02;
export const reiMult = (lvl: number) => 1 + lvl * 0.03;

/** Auto Treino: fora de combate, queima esta fração do reiatsu máximo a cada 2 s */
export const AUTO_TRAIN_BURN = 0.08;
