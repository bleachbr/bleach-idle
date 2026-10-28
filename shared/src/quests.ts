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
    id: "adjuchas", name: "Expedição a Hueco Mundo", minLevel: 24,
    desc: "Atravesse a Garganta e derrote 10 Adjuchas.",
    goal: { type: "kill", monsters: ["adjuchas"], count: 10 }, reward: { exp: 26000, gold: 1500 },
  },
  {
    id: "menos", name: "Caçador de Menos", minLevel: 28,
    desc: "Derrube um Menos Grande (Gillian) no deserto.",
    goal: { type: "kill", monsters: ["gillian"], count: 1 }, reward: { exp: 42000, gold: 2000, items: [{ id: "haori", qty: 1 }] },
  },
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

export interface QuestState {
  /** id -> progresso (abates; nas de entrega o progresso é o que está no inventário) */
  active: Record<string, number>;
  done: string[];
}
