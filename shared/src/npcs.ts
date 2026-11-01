// NPCs interativos (M1-02, ADR-001 das Crônicas): identidade e diálogo. A posição de cada um vem do
// mapa (objeto "npc" na camada "logica" do .tmj, M1-03), a mesma fonte única dos outros objetos.
// Quem decide o nó atual, a distância e a ação de cada opção é o servidor (M1-04, ADR-003); o
// cliente só mostra o nó que recebe e devolve o índice da opção escolhida.
import { CHRONICLES } from "./chronicles";
import { own } from "./lookup";

/** O que a opção faz. O cliente usa só para o ícone e o estilo do botão. */
export type NpcAction = "next" | "quest_accept" | "quest_claim" | "close";

export interface NpcDialogOption {
  label: string;
  action: NpcAction;
  /** nó seguinte, só com action "next" */
  nextDialogId?: string;
}

export interface NpcDialogNode {
  id: string;
  text: string;
  options: NpcDialogOption[];
}

export interface NpcDef {
  id: string;
  name: string;
  title: string;
  /** folha em SPRITES (shared/src/data.ts) */
  sprite: string;
  /** ocupa o tile: ninguém anda por cima (M1-03 marca na matriz de colisão) */
  solid?: boolean;
  /** nó em que toda conversa começa */
  start: string;
  nodes: NpcDialogNode[];
  /** apresenta a crônica da semana (o diálogo vem de chronicleDialog, montado no servidor) */
  chronicle?: boolean;
}

const close = (label = "Até mais."): NpcDialogOption => ({ label, action: "close" });
const next = (label: string, nextDialogId: string): NpcDialogOption => ({ label, action: "next", nextDialogId });

/** Primeiro nó da crônica da semana. Um "next" para um nó "chr:*" só existe no NPC com `chronicle`,
 * e quem resolve o nó é o servidor, com chronicleDialog (a crônica e o estado da missão mudam por semana). */
export const CHRONICLE_START = "chr:0";
export const isChronicleNode = (nodeId: unknown): nodeId is string => typeof nodeId === "string" && nodeId.startsWith("chr:");

// PRD §4. A Maki apresenta todas as semanas (PRD §8, item 5); os outros dois só conversam.
export const NPCS: NpcDef[] = [
  {
    id: "npc_cronista",
    name: "Maki",
    title: "Cronista do Gotei 13",
    sprite: "rukia__haori",
    solid: true,
    chronicle: true,
    start: "oi",
    nodes: [
      { id: "oi", text: "Os arquivos do Gotei 13 guardam mais do que relatórios. Toda semana eu escolho uma página da história para contar.", options: [next("Conte a crônica da semana.", CHRONICLE_START), next("O que são as crônicas?", "sobre"), close()] },
      { id: "sobre", text: "São os grandes acontecimentos do Seireitei, um por semana. Quem ouve a crônica até o fim pode ajudar com a missão da semana e levar um título para casa.", options: [next("Então conte a desta semana.", CHRONICLE_START), close("Vou voltar para ouvir.")] },
    ],
  },
  {
    id: "npc_shunsui",
    name: "Shunsui Kyōraku",
    title: "Capitão da 8ª Divisão",
    sprite: "shunsui",
    solid: true,
    start: "oi",
    nodes: [
      { id: "oi", text: "Ora, ora. Um dia bonito desses e você aí, sério demais. Senta um pouco, a guerra não vai fugir.", options: [next("Algum conselho para a luta?", "conselho"), next("O que o senhor faz aqui?", "aqui"), close()] },
      { id: "conselho", text: "Brigar cansado é pedir para perder. Guarde o reiatsu para a técnica que importa e deixe o resto para quem tem pressa.", options: [next("E contra os grandes?", "grandes"), close("Vou lembrar disso.")] },
      { id: "grandes", text: "Contra os grandes, olhe primeiro, ataque depois. Até o mais forte muda de jeito quando está ferido. É aí que você precisa estar pronto.", options: [close("Valeu, capitão.")] },
      { id: "aqui", text: "Oficialmente? Inspecionando a praça. Na prática, fugindo da papelada que a Nanao deixou na minha mesa. Não conte a ela.", options: [close("Seu segredo está seguro.")] },
    ],
  },
  {
    id: "npc_sentinela",
    name: "Sentinela do Seireitei",
    title: "13ª Divisão",
    sprite: "renji__haori",
    solid: true,
    start: "oi",
    nodes: [
      { id: "oi", text: "Alto! Ah, é você. O Senkaimon está aberto, mas fique de olho: os Hollows do Rukongai andam inquietos.", options: [next("O que está acontecendo no Rukongai?", "rukongai"), next("Como funciona o Senkaimon?", "portal"), close()] },
      { id: "rukongai", text: "Tem uma criatura estranha rondando as muralhas: a Metastacia, a mesma que matou o tenente Kaien Shiba. Dizem que ela nasceu dos experimentos de Aizen.", options: [close("Vou ficar de olho.")] },
      { id: "portal", text: "O Senkaimon liga a Soul Society aos outros mundos. As borboletas do inferno guiam a passagem; sem elas, o Dangai engole quem fica para trás.", options: [close("Entendido.")] },
    ],
  },
];

/** Partial: indexar com chave da rede pode dar undefined (ou o protótipo); para isso, use npcById. */
export const NPC_BY_ID = Object.fromEntries(NPCS.map((n) => [n.id, n])) as Partial<Record<string, NpcDef>>;

/** NPC pelo id vindo da rede (`interact`): nunca indexe NPC_BY_ID direto com chave do cliente. */
export const npcById = (id: unknown): NpcDef | undefined => own(NPC_BY_ID, id);

/** Nó do diálogo fixo do NPC. A chave pode vir da rede: busca segura (own). */
export function npcNode(npc: NpcDef, nodeId: unknown): NpcDialogNode | undefined {
  return typeof nodeId === "string" ? npc.nodes.find((n) => n.id === nodeId) : undefined;
}

/** Situação da missão semanal do personagem, decidida no servidor (M1-04/M1-06). */
export type ChronicleQuestState = "available" | "active" | "ready" | "done";

const QUEST_OPTIONS: Record<ChronicleQuestState, NpcDialogOption[]> = {
  available: [{ label: "Aceitar a missão da semana", action: "quest_accept" }, close("Agora não.")],
  active: [close("Vou continuar a missão.")],
  ready: [{ label: "Entregar a missão", action: "quest_claim" }, close("Depois.")],
  done: [close("Até a próxima crônica.")],
};

/**
 * Diálogo da crônica da semana (o `chronicleDialog` do ADR-001): uma página por nó ("chr:0", "chr:1"...)
 * e, no fim, a missão ("chr:quest") com as opções do estado dela. Nó, crônica ou estado desconhecido: undefined.
 */
export function chronicleDialog(chronicleId: string, state: ChronicleQuestState, nodeId: string): NpcDialogNode | undefined {
  const c = CHRONICLES.find((x) => x.id === chronicleId);
  const options = own(QUEST_OPTIONS, state);
  if (!c || !options) return undefined;
  if (nodeId === "chr:quest") return { id: nodeId, text: `${c.quest.name}: ${c.quest.desc}`, options };
  const m = /^chr:(\d+)$/.exec(nodeId);
  const page = m ? Number(m[1]) : -1;
  if (page < 0 || page >= c.pages.length) return undefined;
  return { id: nodeId, text: c.pages[page], options: [next("Continuar", page + 1 < c.pages.length ? `chr:${page + 1}` : "chr:quest"), close("Depois eu ouço o resto.")] };
}
