// Progresso de longo prazo: bestiário (abates por monstro dão bônus), conquistas e
// recompensa diária com sequência. Tudo conta também na hunt offline.

import { MONSTERS } from "./data";

// ---------- bestiário ----------

/** chefes: poucos abates por estágio */
export const BOSSES = new Set(["grand_fisher", "gillian", "metastacia"]);

/** abates para cada um dos 3 estágios */
export function bestiaryStages(kind: string): [number, number, number] {
  return BOSSES.has(kind) ? [1, 5, 15] : [25, 150, 500];
}

/** estágio atual (0 a 3) */
export function bestiaryStage(kind: string, kills: number): number {
  return bestiaryStages(kind).filter((n) => kills >= n).length;
}

/** dano a mais contra o monstro: +4% por estágio */
export const BESTIARY_DMG = 0.04;
/** no estágio máximo, cada item da tabela de loot tem 20% a mais de chance */
export const BESTIARY_LOOT = 1.2;

export const bestiaryDmgMult = (kind: string, kills: number) => 1 + BESTIARY_DMG * bestiaryStage(kind, kills);
export const bestiaryLootMult = (kind: string, kills: number) => (bestiaryStage(kind, kills) >= 3 ? BESTIARY_LOOT : 1);

/** monstros que contam no bestiário (o boneco de treino não) */
export const BESTIARY_KINDS = () => Object.values(MONSTERS).filter((m) => !m.dummy).map((m) => m.id);

// ---------- conquistas ----------

export interface Stats {
  level: number;
  kills: number;
  bossKills: number;
  stages: number; // soma dos estágios do bestiário
  frags: number;
  quests: number;
  zanjutsu: number;
  reiryoku: number;
  streak: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  stat: keyof Stats;
  need: number;
  reward: { gold: number; items?: { id: string; qty: number }[] };
}

const a = (id: string, name: string, desc: string, stat: keyof Stats, need: number, gold: number, items?: { id: string; qty: number }[]): AchievementDef =>
  ({ id, name, desc, stat, need, reward: { gold, items } });

export const ACHIEVEMENTS: AchievementDef[] = [
  a("lv15", "Shinigami Substituto", "Chegue ao nível 15.", "level", 15, 300),
  a("lv25", "Oficial do Gotei", "Chegue ao nível 25.", "level", 25, 1000, [{ id: "pocao_rei", qty: 5 }]),
  a("lv40", "Tenente", "Chegue ao nível 40.", "level", 40, 4000, [{ id: "amuleto_alma", qty: 1 }]),
  a("lv60", "Capitão", "Chegue ao nível 60.", "level", 60, 10000, [{ id: "haori", qty: 1 }]),
  a("k100", "Purificador", "Derrote 100 Hollows.", "kills", 100, 200, [{ id: "pocao_vida", qty: 5 }]),
  a("k1000", "Caçador de Hollows", "Derrote 1.000 Hollows.", "kills", 1000, 1500),
  a("k10000", "Flagelo de Hueco Mundo", "Derrote 10.000 Hollows.", "kills", 10000, 8000, [{ id: "amuleto_alma", qty: 2 }]),
  a("boss1", "Matador de Gigantes", "Derrote um chefe.", "bossKills", 1, 500),
  a("boss25", "Terror dos Menos", "Derrote 25 chefes.", "bossKills", 25, 5000, [{ id: "lamina_garra", qty: 1 }]),
  a("st5", "Estudioso", "Some 5 estágios no bestiário.", "stages", 5, 400),
  a("st20", "Pesquisador do 12º Esquadrão", "Some 20 estágios no bestiário.", "stages", 20, 3000, [{ id: "pocao_rei", qty: 10 }]),
  a("q3", "Freguês do Kisuke", "Entregue 3 missões.", "quests", 3, 300),
  a("q9", "Sócio da Loja Urahara", "Entregue 9 missões.", "quests", 9, 2000),
  a("zan20", "Espadachim", "Zanjutsu 20.", "zanjutsu", 20, 800),
  a("rei20", "Kidō Avançado", "Reiryoku 20.", "reiryoku", 20, 800),
  a("pvp1", "Primeiro Sangue", "Derrote um jogador em PvP.", "frags", 1, 100),
  a("pvp25", "Kenpachi", "Derrote 25 jogadores em PvP.", "frags", 25, 2500),
  a("dia7", "Disciplina", "Pegue a recompensa diária 7 dias seguidos.", "streak", 7, 1000),
  a("dia30", "Rotina de Capitão", "Pegue a recompensa diária 30 dias seguidos.", "streak", 30, 6000, [{ id: "amuleto_alma", qty: 2 }]),
];

// ---------- recompensa diária ----------

/** ciclo de 7 dias; a sequência continua contando depois do 7º (para as conquistas) */
export const DAILY: { gold: number; items?: { id: string; qty: number }[] }[] = [
  { gold: 100, items: [{ id: "pocao_vida", qty: 3 }] },
  { gold: 0, items: [{ id: "pocao_rei", qty: 3 }] },
  { gold: 300 },
  { gold: 0, items: [{ id: "pocao_vida", qty: 6 }] },
  { gold: 500 },
  { gold: 0, items: [{ id: "pocao_vida", qty: 4 }, { id: "pocao_rei", qty: 4 }] },
  { gold: 1000, items: [{ id: "amuleto_alma", qty: 1 }] },
];

/** dia no fuso de Brasília (AAAA-MM-DD): o "dia" vira à meia-noite para todo mundo */
export function dayKey(ms: number): string {
  return new Date(ms - 3 * 3600_000).toISOString().slice(0, 10);
}

export function prevDay(key: string): string {
  return dayKey(Date.parse(`${key}T12:00:00Z`) + 3 * 3600_000 - 24 * 3600_000);
}

export interface Progress {
  bestiary: Record<string, number>;
  ach: string[];
  daily: { last: string; streak: number };
  kills: number;
  bossKills: number;
  /** missões diárias do dia (refeitas quando o dia vira) */
  dm?: DailyState;
}

export const newProgress = (): Progress => ({ bestiary: {}, ach: [], daily: { last: "", streak: 0 }, kills: 0, bossKills: 0 });

export function stagesSum(bestiary: Record<string, number>): number {
  return Object.entries(bestiary).reduce((s, [k, n]) => s + bestiaryStage(k, n), 0);
}

// ---------- missões diárias ----------
// Três por dia, sorteadas por personagem e por dia (as mesmas o dia todo) conforme o nível.
// Completas pagam sozinhas; as três juntas dão uma Caixa do Kisuke.

export type DailyKind = "kill" | "any" | "boss" | "gold" | "forge";
export interface DailyMission { kind: DailyKind; target?: string; need: number; have: number; done: boolean }
export interface DailyState { day: string; list: DailyMission[]; bonus: boolean }

/** monstros comuns do mais fraco para o mais forte (o nível sugere a faixa) */
const LADDER = ["hollow_menor", "hollow_rastejante", "hollow_sombrio", "hollow_uivante", "hollow_faminto", "hollow_acido",
  "hollow_encouracado", "hollow_devorador", "fishbone", "adjuchas", "arrancar"];

function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function dailyMissions(id: string, day: string, level: number): DailyMission[] {
  const rnd = seeded(`${id}|${day}`);
  const top = Math.max(0, Math.min(LADDER.length - 1, Math.round((level - 8) / 3)));
  const target = LADDER[Math.max(0, top - Math.floor(rnd() * 2))];
  const pool: DailyMission[] = [
    { kind: "any", need: 60 + 10 * Math.floor(level / 5), have: 0, done: false },
    { kind: "gold", need: 150 * level, have: 0, done: false },
  ];
  if (level >= 20) pool.push({ kind: "boss", need: 1, have: 0, done: false });
  if (level >= 12) pool.push({ kind: "forge", need: 2, have: 0, done: false });
  // a de caçar um monstro específico sempre entra; as outras duas são sorteadas
  const out: DailyMission[] = [{ kind: "kill", target, need: 30, have: 0, done: false }];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}

/** recompensa de cada missão diária (cresce com o nível) */
export const dailyReward = (level: number) => ({ gold: 40 * level, expFrac: 0.08 });

export function dailyText(m: DailyMission, monsterName: (id: string) => string): string {
  switch (m.kind) {
    case "kill": return `${monsterName(m.target!)}: derrote ${m.need}`;
    case "any": return `Derrote ${m.need} monstros`;
    case "boss": return "Derrote um chefe";
    case "gold": return `Junte ${m.need} kan caçando`;
    case "forge": return `Tente a forja ${m.need} vezes`;
  }
}
