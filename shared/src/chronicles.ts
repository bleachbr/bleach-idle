// Rotação semanal determinística, persistência e catálogo das 5 Crônicas do Seireitei (M1-01, M1-05 e M1-08).
import type { ChronicleProgress, Progress } from "./progress";

export const TOTAL_CRONICAS = 5;
export const MS_PER_WEEK = 7 * 24 * 3600 * 1000;

/** Âncora temporal alinhada à segunda-feira 26/10/2026 00:00 BRT (03:00 UTC). */
export const CHRONICLE_EPOCH = Date.UTC(2026, 9, 26, 3, 0, 0);

/** Número da semana desde a âncora. Só aritmética sobre o instante UTC: não depende do fuso (TZ) do processo. */
export const weekNumber = (now = Date.now()): number => Math.floor((now - CHRONICLE_EPOCH) / MS_PER_WEEK);

/** Índice da crônica ativa (0 a 4) para qualquer instante. */
export function weekIndex(now = Date.now()): number {
  const weeks = weekNumber(now);
  return ((weeks % TOTAL_CRONICAS) + TOTAL_CRONICAS) % TOTAL_CRONICAS;
}

/** Chave gravada em `ChronicleProgress.activeWeekKey`. Vira no mesmo instante que `weekIndex`. */
export const currentWeekKey = (now = Date.now()): string => `w${weekNumber(now)}`;

/**
 * Sincroniza o estado da crônica do personagem para a semana atual (M1-05).
 * Na virada de semana, zera `questKills` e remove `completedAt` sem rotina batch no banco.
 */
export function syncChronicleProgress(prog: Pick<Progress, "chronicle">, now = Date.now()): ChronicleProgress {
  const key = currentWeekKey(now);
  if (!prog.chronicle || prog.chronicle.activeWeekKey !== key) {
    prog.chronicle = { activeWeekKey: key, questKills: 0 };
  }
  return prog.chronicle;
}

export interface ChronicleQuestDef {
  name: string;
  desc: string;
  monsters: string[];
  kills: number;
  items?: { id: string; qty: number }[];
}

export interface ChronicleRewardDef {
  gold: number;
  crystals: number;
  items: { id: string; qty: number }[];
  titleId: string;
}

export interface ChronicleDef {
  id: string;
  title: string;
  badge: string;
  pages: string[];
  quest: ChronicleQuestDef;
  reward: ChronicleRewardDef;
}

export const CHRONICLES: ChronicleDef[] = [
  {
    id: "invasao_ryoka",
    title: "A Invasão dos Ryoka",
    badge: "[CRÔNICA SEMANAL: A INVASÃO DOS RYOKA]",
    pages: [
      "Quando o canhão da família Shiba rasgou a barreira de Shakonmaku, o céu do Seireitei tremeu. Quatro intrusos do mundo humano — Ichigo Kurosaki, Uryū Ishida, Yasutora Sado e Orihime Inoue — caíram como meteoros entre as muralhas brancas das 13 Divisões.",
      "Nas escadarias e pontes de pedra, o aço de Zaraki Kenpachi e o orgulho de Byakuya Kuchiki testaram a determinação dos invasores. Pela primeira vez em séculos, o Gotei 13 viu suas próprias leis questionadas de dentro para fora.",
      "Enquanto os tambores de alerta ecoavam pelo Rukongai até a colina do Soukyoku, os guardas das muralhas dobraram as rondas para conter os Hollows atraídos pela turbulência espiritual.",
    ],
    quest: {
      name: "Patrulha de Contenção",
      desc: "Derrote 50 Hollows na Soul Society e entregue 3 Fragmentos de Máscara.",
      monsters: ["hollow_faminto", "hollow_acido", "hollow_encouracado", "hollow_devorador", "metastacia"],
      kills: 50,
      items: [{ id: "fragmento", qty: 3 }],
    },
    reward: {
      gold: 500,
      crystals: 15,
      items: [{ id: "caixa_kisuke", qty: 1 }],
      titleId: "tit_shakonmaku",
    },
  },
  {
    id: "traicao_soukyoku",
    title: "O Julgamento do Soukyoku & A Traição de Aizen",
    badge: "[CRÔNICA SEMANAL: TRAIÇÃO NO SOUKYOKU]",
    pages: [
      "Todos acreditaram que o gentil Capitão Sōsuke Aizen havia sido assassinado nas muralhas da 5ª Divisão. Enquanto capitães se digladiavam sob ordens falsas da Central 46, a lâmina flamejante do Soukyoku despertou no topo da colina.",
      "Ichigo deteve o Kikōō com uma única lâmina, e Tōshirō Hitsugaya descobriu tarde demais os corpos silenciosos na câmara subterrânea: toda a sentença havia sido escrita sob a hipnose absoluta da Kyōka Suigetsu.",
      "Aizen, Gin Ichimaru e Kaname Tōsen ergueram-se aos céus envoltos na luz dourada do Negación, levando o Hōgyoku e deixando no Rukongai experimentos parasitas que ainda ameaçam as patrulhas.",
    ],
    quest: {
      name: "Investigação da Central 46",
      desc: "Derrote o chefe Metastacia na Soul Society e entregue 2 Pedras de Reishi.",
      monsters: ["metastacia"],
      kills: 1,
      items: [{ id: "pedra_reishi", qty: 2 }],
    },
    reward: {
      gold: 800,
      crystals: 20,
      items: [{ id: "pergaminho_xp", qty: 1 }],
      titleId: "tit_soukyoku",
    },
  },
  {
    id: "karakura_falsa",
    title: "Batalha de Karakura Falsa",
    badge: "[CRÔNICA SEMANAL: KARAKURA FALSA]",
    pages: [
      "Para impedir que Aizen forjasse a Chave do Rei com as almas de Karakura, Kisuke Urahara transpôs a cidade inteira para a Soul Society e ergueu uma réplica sustentada por quatro pilares no mundo humano.",
      "Acima dos telhados vazios, o Gotei 13 enfrentou os três primeiros Espadas: o vento solitário de Shunsui Kyōraku contra os lobos de Coyote Starrk, o gelo dos céus de Hitsugaya contra Tia Harribel e o poder implacável da senescência de Barragan.",
      "Mesmo com o surgimento colossal de Ayon, os pilares resistiram até que a lâmina final cruzasse a Garganta.",
    ],
    quest: {
      name: "Defesa dos Pilares",
      desc: "Derrote 30 monstros em Hueco Mundo, Las Noches ou Karakura Falsa.",
      monsters: [
        "fishbone",
        "adjuchas",
        "arrancar",
        "arrancar_numeros",
        "exequias",
        "fraccion",
        "privaron",
        "fraccion_espada",
        "arrancar_resurreccion",
        "vasto_lorde",
        "ayon",
      ],
      kills: 30,
    },
    reward: {
      gold: 1000,
      crystals: 25,
      items: [{ id: "incenso", qty: 1 }],
      titleId: "tit_pilares",
    },
  },
  {
    id: "guerra_mil_anos",
    title: "A Guerra Sangrenta dos Mil Anos",
    badge: "[CRÔNICA SEMANAL: GUERRA DOS MIL ANOS]",
    pages: [
      "Sem aviso, pilares de reishi azul emergiram das próprias sombras do Seireitei. O Wandenreich — o império Quincy oculto por mil anos — marchou sob o comando de Yhwach com medalhões capazes de roubar a Bankai dos capitães.",
      "A queda do tenente Chōjirō Sasakibe acendeu a fúria ancestral de Genryūsai Yamamoto, cuja Zanka no Tachi secou toda a umidade da Soul Society em um duelo que marcou a história da Primeira Divisão.",
      "Ainda hoje, patrulhas de elite vigiam as fendas de sombra para conter os batedores Quincy e as forças remanescentes nas fronteiras.",
    ],
    quest: {
      name: "Resistência das Sombras",
      desc: "Derrote 25 inimigos de Las Noches, Karakura Falsa ou Wandenreich.",
      monsters: [
        "arrancar_numeros",
        "exequias",
        "fraccion",
        "privaron",
        "fraccion_espada",
        "arrancar_resurreccion",
        "vasto_lorde",
        "ayon",
        "soldado_wandenreich",
        "sternritter",
        "sternritter_vollstandig",
        "yhwach",
      ],
      kills: 25,
    },
    reward: {
      gold: 1200,
      crystals: 30,
      items: [{ id: "caixa_kisuke", qty: 2 }],
      titleId: "tit_cinzas_primeira",
    },
  },
  {
    id: "pendulo_passado",
    title: "Turn Back the Pendulum",
    badge: "[CRÔNICA SEMANAL: 110 ANOS NO PASSADO]",
    pages: [
      "Cento e dez anos atrás, Kisuke Urahara assumiu o manto da 12ª Divisão e fundou o Instituto de Pesquisa e Desenvolvimento Espiritual (SRDI), enquanto Yoruichi Shihōin comandava o Onmitsukidō e Shinji Hirako liderava a 5ª Divisão.",
      "No Rukongai, almas e oficiais começaram a desaparecer sem deixar nada além de seus mantos vazios. Na noite chuvosa em que a força-tarefa de capitães foi emboscada, a máscara branca da Hollowficação despertou pela primeira vez.",
      "Urahara e Tessai arriscaram tudo com o Kaidō proibido para salvar os futuros Visored, sendo exilados para sempre ao mundo humano enquanto a verdade permanecia trancada nos arquivos secretos de Reishi.",
    ],
    quest: {
      name: "Arquivos Secretos de Reishi",
      desc: "Derrote 20 Hollows e entregue 5 Pedras de Reishi para o arquivo do SRDI.",
      monsters: [
        "hollow_menor",
        "hollow_rastejante",
        "hollow_sombrio",
        "hollow_uivante",
        "hollow_faminto",
        "hollow_acido",
        "hollow_encouracado",
        "hollow_devorador",
      ],
      kills: 20,
      items: [{ id: "pedra_reishi", qty: 5 }],
    },
    reward: {
      gold: 600,
      crystals: 20,
      items: [{ id: "amuleto_alma", qty: 1 }],
      titleId: "tit_arquivista",
    },
  },
];

/** Crônica ativa na semana correspondente ao instante `now`. */
export const activeChronicle = (now = Date.now()): ChronicleDef => CHRONICLES[weekIndex(now)];
