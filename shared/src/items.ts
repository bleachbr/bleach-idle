// Itens, equipamentos, loot dos Hollows, loja e kit inicial.
// O ícone de cada item é a célula `icon` (0-15) de client/public/assets/items.png (folha 4x4).

export type EquipSlot = "head" | "armor" | "legs" | "boots" | "weapon" | "ring" | "amulet";
export const EQUIP_SLOTS: EquipSlot[] = ["head", "armor", "legs", "boots", "weapon", "ring", "amulet"];
export const SLOT_LABEL: Record<EquipSlot, string> = {
  head: "Cabeça", armor: "Corpo", legs: "Pernas", boots: "Pés", weapon: "Arma", ring: "Anel", amulet: "Amuleto",
};

export interface ItemDef {
  id: string;
  name: string;
  icon: number;
  /** preço de compra na loja; ausente = não vende */
  buy?: number;
  /** quanto a loja paga */
  sell: number;
  stack: boolean;
  slot?: EquipSlot;
  atk?: number;
  def?: number;
  hp?: number;
  rei?: number;
  minLevel?: number;
  /** consumível: fração de HP ou reiatsu restaurada */
  heal?: number;
  restoreRei?: number;
  desc?: string;
}

const items: ItemDef[] = [
  { id: "pocao_vida", name: "Poção de Cura", icon: 0, buy: 50, sell: 10, stack: true, heal: 0.35, desc: "Recupera 35% do HP." },
  { id: "pocao_rei", name: "Poção de Reiatsu", icon: 1, buy: 60, sell: 12, stack: true, restoreRei: 0.4, desc: "Recupera 40% do reiatsu." },
  { id: "fragmento", name: "Fragmento de Máscara", icon: 2, sell: 12, stack: true, desc: "Loot. Vende na loja." },
  { id: "garra", name: "Garra de Hollow", icon: 3, sell: 30, stack: true, desc: "Loot. Vende na loja." },
  { id: "nucleo", name: "Núcleo de Reishi", icon: 4, sell: 90, stack: true, desc: "Loot raro. Vende na loja." },
  { id: "bandana", name: "Bandana de Shinigami", icon: 5, buy: 120, sell: 30, stack: false, slot: "head", def: 2 },
  { id: "mascara", name: "Máscara de Osso", icon: 6, sell: 400, stack: false, slot: "head", def: 5, rei: 15, minLevel: 12 },
  { id: "shihakusho", name: "Shihakushō Reforçado", icon: 7, buy: 300, sell: 75, stack: false, slot: "armor", def: 5 },
  { id: "haori", name: "Haori de Capitão", icon: 8, sell: 1500, stack: false, slot: "armor", def: 10, hp: 60, minLevel: 15 },
  { id: "hakama", name: "Hakama Reforçado", icon: 9, buy: 200, sell: 50, stack: false, slot: "legs", def: 3 },
  { id: "waraji", name: "Waraji de Couro", icon: 10, buy: 80, sell: 20, stack: false, slot: "boots", def: 1 },
  { id: "zanpakuto", name: "Zanpakutō Afiada", icon: 11, buy: 400, sell: 100, stack: false, slot: "weapon", atk: 4 },
  { id: "lamina_garra", name: "Lâmina de Garra", icon: 12, sell: 900, stack: false, slot: "weapon", atk: 9, minLevel: 14 },
  { id: "anel_rei", name: "Anel de Reiatsu", icon: 13, buy: 500, sell: 125, stack: false, slot: "ring", rei: 30 },
  { id: "amuleto_alma", name: "Amuleto da Alma", icon: 14, buy: 250, sell: 60, stack: false, slot: "amulet", desc: "Se morrer usando, não perde XP. Some ao proteger." },
];
export const ITEMS: Record<string, ItemDef> = Object.fromEntries(items.map((i) => [i.id, i]));
export const GOLD_ICON = 15;
export const CURRENCY = "kan";

// Morte sem Amuleto da Alma (estilo Tibia): cada peça equipada e cada espaço do
// inventário têm esta chance de se perder; perde também parte do dinheiro carregado.
// O depot nunca perde nada.
export const DEATH_ITEM_LOSS = 0.1;
export const DEATH_GOLD_LOSS = 0.1;

export const INV_SIZE = 20;
export const DEPOT_SIZE = 60;
export const STACK_MAX = 100;
/** distância (Chebyshev) para usar depot e loja */
export const INTERACT_RANGE = 2;

export const SHOP: string[] = [
  "pocao_vida", "pocao_rei", "amuleto_alma", "zanpakuto", "anel_rei", "bandana", "shihakusho", "hakama", "waraji",
];

export interface Slot { id: string; qty: number }

export interface LootEntry { item: string; chance: number; min?: number; max?: number }
export interface LootTable { gold: [number, number]; items: LootEntry[] }

// tabela por monstro (ids de MONSTERS em data.ts)
export const LOOT: Record<string, LootTable> = {
  hollow_menor: { gold: [3, 10], items: [{ item: "fragmento", chance: 0.35 }] },
  hollow_rastejante: { gold: [5, 15], items: [{ item: "fragmento", chance: 0.4 }, { item: "garra", chance: 0.12 }] },
  hollow_sombrio: { gold: [8, 20], items: [{ item: "fragmento", chance: 0.45 }, { item: "garra", chance: 0.18 }, { item: "pocao_vida", chance: 0.05 }] },
  hollow_uivante: { gold: [10, 28], items: [{ item: "fragmento", chance: 0.5, max: 2 }, { item: "garra", chance: 0.2 }, { item: "nucleo", chance: 0.04 }] },
  hollow_faminto: { gold: [14, 35], items: [{ item: "garra", chance: 0.3 }, { item: "nucleo", chance: 0.06 }, { item: "mascara", chance: 0.015 }] },
  hollow_acido: { gold: [18, 42], items: [{ item: "garra", chance: 0.35 }, { item: "nucleo", chance: 0.08 }, { item: "pocao_rei", chance: 0.08 }, { item: "mascara", chance: 0.02 }] },
  hollow_encouracado: { gold: [22, 50], items: [{ item: "garra", chance: 0.4, max: 2 }, { item: "nucleo", chance: 0.09 }, { item: "mascara", chance: 0.025 }] },
  hollow_devorador: { gold: [30, 65], items: [{ item: "nucleo", chance: 0.12 }, { item: "mascara", chance: 0.03 }, { item: "lamina_garra", chance: 0.012 }] },
  fishbone: { gold: [45, 90], items: [{ item: "nucleo", chance: 0.18, max: 2 }, { item: "lamina_garra", chance: 0.02 }, { item: "haori", chance: 0.02 }] },
  grand_fisher: { gold: [400, 800], items: [{ item: "nucleo", chance: 1, min: 3, max: 6 }, { item: "lamina_garra", chance: 0.4 }, { item: "haori", chance: 0.3 }, { item: "mascara", chance: 0.5 }] },
};

/** kit de quem nasce (no estilo do DBO Idle: equipamento básico, 2 proteções, poções e dinheiro) */
export const START_KIT = {
  gold: 150,
  equip: { head: "bandana", armor: "shihakusho", legs: "hakama", boots: "waraji" } as Partial<Record<EquipSlot, string>>,
  inv: [
    { id: "pocao_vida", qty: 10 },
    { id: "pocao_rei", qty: 3 },
    { id: "amuleto_alma", qty: 1 },
    { id: "amuleto_alma", qty: 1 },
  ] as Slot[],
};

export function rollLoot(kind: string): { gold: number; items: Slot[] } {
  const t = LOOT[kind];
  if (!t) return { gold: 0, items: [] };
  const gold = t.gold[0] + Math.floor(Math.random() * (t.gold[1] - t.gold[0] + 1));
  const out: Slot[] = [];
  for (const e of t.items) {
    if (Math.random() >= e.chance) continue;
    const lo = e.min ?? 1, hi = e.max ?? lo;
    out.push({ id: e.item, qty: lo + Math.floor(Math.random() * (hi - lo + 1)) });
  }
  return { gold, items: out };
}

// ---------- operações de inventário (usadas no servidor; puras para poder testar) ----------

/** Quantos cabem de `id` em `slots`. */
export function spaceFor(slots: (Slot | null)[], id: string): number {
  const def = ITEMS[id];
  let n = 0;
  for (const s of slots) {
    if (!s) n += def.stack ? STACK_MAX : 1;
    else if (def.stack && s.id === id) n += STACK_MAX - s.qty;
  }
  return n;
}

/** Adiciona até `qty` unidades; retorna quantas entraram. */
export function addItem(slots: (Slot | null)[], id: string, qty: number): number {
  const def = ITEMS[id];
  let left = qty;
  if (def.stack)
    for (const s of slots) {
      if (left <= 0) break;
      if (s && s.id === id && s.qty < STACK_MAX) {
        const k = Math.min(left, STACK_MAX - s.qty);
        s.qty += k;
        left -= k;
      }
    }
  for (let i = 0; i < slots.length && left > 0; i++) {
    if (slots[i]) continue;
    const k = def.stack ? Math.min(left, STACK_MAX) : 1;
    slots[i] = { id, qty: k };
    left -= k;
  }
  return qty - left;
}

/** Remove até `qty` unidades de `id` (de qualquer pilha); retorna quantas saíram. */
export function removeItem(slots: (Slot | null)[], id: string, qty: number): number {
  let left = qty;
  for (let i = slots.length - 1; i >= 0 && left > 0; i--) {
    const s = slots[i];
    if (!s || s.id !== id) continue;
    const k = Math.min(left, s.qty);
    s.qty -= k;
    left -= k;
    if (s.qty <= 0) slots[i] = null;
  }
  return qty - left;
}

export function countItem(slots: (Slot | null)[], id: string): number {
  return slots.reduce((n, s) => n + (s && s.id === id ? s.qty : 0), 0);
}

/** Visual do personagem conforme o equipamento: "", "haori", "mask" ou "haori_mask". */
export function lookOf(equip: Partial<Record<EquipSlot, string>>): string {
  const parts = [];
  if (equip.armor === "haori") parts.push("haori");
  if (equip.head === "mascara") parts.push("mask");
  return parts.join("_");
}

/** Bônus somados do equipamento. */
export function equipBonus(equip: Partial<Record<EquipSlot, string>>) {
  const b = { atk: 0, def: 0, hp: 0, rei: 0 };
  for (const id of Object.values(equip)) {
    const d = id ? ITEMS[id] : undefined;
    if (!d) continue;
    b.atk += d.atk ?? 0;
    b.def += d.def ?? 0;
    b.hp += d.hp ?? 0;
    b.rei += d.rei ?? 0;
  }
  return b;
}
