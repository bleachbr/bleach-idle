// Missões do Kisuke: caçar monstros ou entregar itens, em troca de XP, kan e itens.
// Aceitar e entregar é com o Kisuke (perto da loja); o progresso de caça conta
// também para quem está na party e divide a XP do abate.

export type QuestGoal =
  | { type: "kill"; monsters: string[]; count: number }
  | { type: "collect"; item: string; count: number };

export interface QuestDef {
  id: string;
  name: string;
  desc: string;
  minLevel: number;
  goal: QuestGoal;
  reward: { exp: number; gold: number; items?: { id: string; qty: number }[] };
  /** pode refazer depois de entregar */
  repeatable?: boolean;
}

export const MAX_ACTIVE_QUESTS = 3;

export const QUESTS: QuestDef[] = [
  {
    id: "patrulha", name: "Primeira Patrulha", minLevel: 8,
    desc: "Hollows Menores rondam a Floresta Leste. Elimine 10.",
    goal: { type: "kill", monsters: ["hollow_menor"], count: 10 }, reward: { exp: 900, gold: 120 },
  },
  {
    id: "fragmentos", name: "Fragmentos para o Kisuke", minLevel: 8, repeatable: true,
    desc: "Traga 15 Fragmentos de Máscara para os experimentos da loja.",
    goal: { type: "collect", item: "fragmento", count: 15 }, reward: { exp: 400, gold: 300, items: [{ id: "pocao_rei", qty: 2 }] },
  },
  {
    id: "rastejantes", name: "Ameaça Rastejante", minLevel: 10,
    desc: "Derrote 12 Hollows Rastejantes ou Sombrios.",
    goal: { type: "kill", monsters: ["hollow_rastejante", "hollow_sombrio"], count: 12 }, reward: { exp: 2200, gold: 200 },
  },
  {
    id: "garras", name: "Garras Afiadas", minLevel: 10,
    desc: "Entregue 10 Garras de Hollow. O Kisuke forja uma lâmina com elas.",
    goal: { type: "collect", item: "garra", count: 10 }, reward: { exp: 1500, gold: 0, items: [{ id: "zanpakuto", qty: 1 }] },
  },
  {
    id: "uivos", name: "Uivos na Floresta", minLevel: 13,
    desc: "Os Hollows Uivantes assustam a cidade. Derrote 10.",
    goal: { type: "kill", monsters: ["hollow_uivante"], count: 10 }, reward: { exp: 4500, gold: 250, items: [{ id: "anel_rei", qty: 1 }] },
  },
  {
    id: "rio", name: "Além do Rio", minLevel: 16,
    desc: "Limpe a margem sul: 8 Hollows Encouraçados.",
    goal: { type: "kill", monsters: ["hollow_encouracado"], count: 8 }, reward: { exp: 7500, gold: 500 },
  },
  {
    id: "fisher", name: "A Isca do Grand Fisher", minLevel: 20,
    desc: "O Grand Fisher espreita na toca ao sudeste. Derrote-o.",
    goal: { type: "kill", monsters: ["grand_fisher"], count: 1 }, reward: { exp: 15000, gold: 1000, items: [{ id: "mascara", qty: 1 }] },
  },
  {
    id: "rukongai", name: "Rukongai em Perigo", minLevel: 16,
    desc: "Os Hollows invadem o Rukongai. Derrote 15 Hollows Ácidos ou Devoradores na Soul Society.",
    goal: { type: "kill", monsters: ["hollow_acido", "hollow_devorador"], count: 15 }, reward: { exp: 9000, gold: 600, items: [{ id: "pedra_reishi", qty: 5 }] },
  },
  {
    id: "metastacia", name: "A Sombra de Metastacia", minLevel: 22,
    desc: "Um Hollow que devora reiatsu ronda o sul do Rukongai. Derrote o Metastacia.",
    goal: { type: "kill", monsters: ["metastacia"], count: 1 }, reward: { exp: 20000, gold: 1500, items: [{ id: "caixa_kisuke", qty: 2 }] },
  },
  {
    id: "reishi", name: "Pedras para a Forja", minLevel: 14, repeatable: true,
    desc: "Traga 3 Tentáculos de Metastacia. O Kisuke paga em Pedras de Reishi.",
    goal: { type: "collect", item: "tentaculo", count: 3 }, reward: { exp: 3000, gold: 0, items: [{ id: "pedra_reishi", qty: 8 }] },
  },
  {
    id: "adjuchas", name: "Expedição a Hueco Mundo", minLevel: 24,
    desc: "Atravesse a Garganta e derrote 10 Adjuchas.",
    goal: { type: "kill", monsters: ["adjuchas"], count: 10 }, reward: { exp: 26000, gold: 1500 },
  },
  {
    id: "menos", name: "Caçador de Menos", minLevel: 28,
    desc: "Derrube um Menos Grande (Gillian) no deserto.",
    goal: { type: "kill", monsters: ["gillian"], count: 1 }, reward: { exp: 42000, gold: 2000, items: [{ id: "haori", qty: 1 }] },
  },
  {
    id: "lasnoches", name: "Invasão a Las Noches", minLevel: 45,
    desc: "Entre no palácio e derrote 20 Arrancar Números ou Exequias.",
    goal: { type: "kill", monsters: ["arrancar_numeros", "exequias"], count: 20 }, reward: { exp: 90000, gold: 3000, items: [{ id: "pedra_reishi", qty: 10 }] },
  },
  {
    id: "fraccion", name: "A Fracción", minLevel: 50,
    desc: "Os guarda-costas do palácio guardam a sala do trono. Derrote 15 Fracción.",
    goal: { type: "kill", monsters: ["fraccion"], count: 15 }, reward: { exp: 120000, gold: 4000, items: [{ id: "pergaminho_xp", qty: 2 }] },
  },
  {
    id: "privaron", name: "O Trono Vazio", minLevel: 55,
    desc: "Um Privaron Espada tomou a sala do trono. Derrote-o.",
    goal: { type: "kill", monsters: ["privaron"], count: 1 }, reward: { exp: 150000, gold: 5000, items: [{ id: "caixa_kisuke", qty: 3 }] },
  },
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

export interface QuestState {
  /** id -> progresso (abates; nas de entrega o progresso é o que está no inventário) */
  active: Record<string, number>;
  done: string[];
}
