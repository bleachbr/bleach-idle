// Filtro de loot do Auto Helper (M3-03, ADR-003 do Social avançado): por item, pegar (padrão), vender na hora
// ou ignorar. O servidor aplica em giveLoot, o mesmo caminho online e offline; o cliente só escolhe as regras.
import { ITEMS, LOOT, type Slot } from "./items";
import { QUEST_BY_ID } from "./quests";
import { own } from "./lookup";

export type LootRule = "sell" | "ignore";
export type LootRules = Record<string, LootRule>;

/**
 * Valida regras vindas do cliente ou do save: só itens do catálogo e valores "sell" ou "ignore" ("take" ou
 * qualquer outro valor some, e o item volta ao padrão, pegar). Não é objeto, ou tem mais chaves que o catálogo: null.
 */
export function parseLootRules(raw: unknown): LootRules | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const keys = Object.keys(raw);
  if (keys.length > Object.keys(ITEMS).length) return null;
  const out: LootRules = {};
  for (const k of keys) {
    const v = (raw as Record<string, unknown>)[k];
    if (own(ITEMS, k) && (v === "sell" || v === "ignore")) out[k] = v;
  }
  return out;
}

/** Itens que as missões de coleta ativas e abertas pedem: esses o filtro nunca vende nem ignora. */
export function collectItems(active: Record<string, number>): Set<string> {
  const ids = new Set<string>();
  for (const id of Object.keys(active)) {
    const g = own(QUEST_BY_ID, id)?.goal;
    if (g?.type === "collect") ids.add(g.item);
  }
  return ids;
}

/** Separa o loot que caiu. `keep`: itens de missão de coleta, sempre pegos. `gold`: kan da venda, pelo preço da loja. */
export function applyLootRules(items: Slot[], rules: LootRules, keep: Set<string>): { take: Slot[]; sell: Slot[]; ignored: Slot[]; gold: number } {
  const take: Slot[] = [], sell: Slot[] = [], ignored: Slot[] = [];
  let gold = 0;
  for (const s of items) {
    const rule = keep.has(s.id) ? undefined : own(rules, s.id);
    if (rule === "sell") { sell.push(s); gold += ITEMS[s.id].sell * s.qty; }
    else if (rule === "ignore") ignored.push(s);
    else take.push(s);
  }
  return { take, sell, ignored, gold };
}

/** Itens que o personagem já viu cair: o loot das espécies que ele já abateu (pelo bestiário). */
export function seenLoot(bestiary: Record<string, number>): string[] {
  const ids = new Set<string>();
  for (const [kind, kills] of Object.entries(bestiary)) {
    if (!(kills > 0)) continue;
    for (const e of own(LOOT, kind)?.items ?? []) ids.add(e.item);
  }
  return [...ids].filter((id) => own(ITEMS, id));
}
