// Funções puras de formatação, acessibilidade e inspeção de slots e inventário (Lote 3).
import {
  ITEMS, SETS, SLOT_LABEL, INV_SIZE,
  type Slot, type EquipSlot, type ItemDef,
} from "../../shared/src";

export function itemTooltipText(d: ItemDef): string {
  const parts = [d.name];
  const set = SETS.find((s) => s.pieces.includes(d.id));
  if (set) parts.push(`Conjunto ${set.name} (${set.pieces.length} peças)`);
  if (d.slot) parts.push(SLOT_LABEL[d.slot]);
  if (d.atk) parts.push(`Ataque +${d.atk}`);
  if (d.def) parts.push(`Defesa +${d.def}`);
  if (d.hp) parts.push(`HP +${d.hp}`);
  if (d.rei) parts.push(`Reiatsu +${d.rei}`);
  if (d.minLevel) parts.push(`Nível ${d.minLevel}+`);
  if (d.desc) parts.push(d.desc);
  return parts.join(" · ");
}

export function formatSlotAria(s: Slot | null, equipSlot?: EquipSlot): string {
  if (!s) {
    return equipSlot ? `Equipamento: ${SLOT_LABEL[equipSlot]} (vazio)` : "Slot de inventário vazio";
  }
  const d = ITEMS[s.id];
  if (!d) return "Item desconhecido";
  const qtyStr = s.qty > 1 ? ` (${s.qty})` : "";
  return `${d.name}${qtyStr}: ${itemTooltipText(d)}`;
}

export function formatInventoryCount(slots: (Slot | null)[]): { used: number; total: number; isFull: boolean; text: string } {
  const used = slots.filter(Boolean).length;
  const total = INV_SIZE;
  const isFull = used >= total;
  return {
    used,
    total,
    isFull,
    text: `${used}/${total} slots${isFull ? " (cheio)" : ""}`,
  };
}

export function isItemLevelLocked(s: Slot | null, userLevel: number): boolean {
  if (!s) return false;
  const d = ITEMS[s.id];
  return !!(d?.minLevel && userLevel < d.minLevel);
}

export function itemDetailHtml(s: Slot | null, userLevel: number, equipSlot?: EquipSlot): string {
  if (!s) {
    return `<div class="item-detail-empty"><p class="hint">Passe o mouse ou clique em um item para ver detalhes e atributos.</p></div>`;
  }
  const d = ITEMS[s.id];
  if (!d) {
    return `<div class="item-detail-empty"><p class="hint">Item desconhecido.</p></div>`;
  }

  const locked = isItemLevelLocked(s, userLevel);
  const isEquip = !!d.slot;
  const isConsumable = !!(d.heal || d.restoreRei || d.boost || d.box);

  const stats: string[] = [];
  if (d.atk) stats.push(`<b>Ataque</b> +${d.atk}`);
  if (d.def) stats.push(`<b>Defesa</b> +${d.def}`);
  if (d.hp) stats.push(`<b>HP</b> +${d.hp}`);
  if (d.rei) stats.push(`<b>Reiatsu</b> +${d.rei}`);

  const set = SETS.find((st) => st.pieces.includes(d.id));

  let actionText = "";
  if (locked) {
    actionText = `<span class="detail-action locked">⛔ Nível insuficiente para equipar</span>`;
  } else if (isEquip) {
    actionText = `<span class="detail-action equip">⚡ Clique para equipar</span>`;
  } else if (isConsumable) {
    actionText = `<span class="detail-action use">🧪 Clique para usar</span>`;
  } else if (d.sell) {
    actionText = `<span class="detail-action sell">💰 Valor de venda: ${d.sell} kan</span>`;
  }

  return `
    <div class="item-detail-card${locked ? " level-locked" : ""}">
      <div class="detail-header">
        <span class="detail-name">${d.name}</span>
        ${s.qty > 1 ? `<span class="detail-qty">Quantidade: ${s.qty}</span>` : ""}
        ${d.slot ? `<span class="detail-slot-badge">${SLOT_LABEL[d.slot]}</span>` : ""}
      </div>
      ${d.desc ? `<p class="detail-desc">${d.desc}</p>` : ""}
      ${stats.length ? `<div class="detail-stats">${stats.join(" · ")}</div>` : ""}
      ${set ? `<div class="detail-set">Conjunto: <b>${set.name}</b> (${set.pieces.length} peças)</div>` : ""}
      ${d.minLevel ? `
        <div class="detail-level${locked ? " warn" : ""}">
          ${locked ? `⚠️ Exige nível ${d.minLevel} (seu nível atual é ${userLevel})` : `Requer nível ${d.minLevel}+`}
        </div>` : ""}
      <div class="detail-footer">${actionText}</div>
    </div>
  `.trim();
}

export interface InventorySlotClickOptions {
  open?: string | null;
  playerLevel: number;
  send: (type: string, data: any) => void;
  onInspect?: (slot: Slot) => void;
}

export function handleInventorySlotClick(
  slot: Slot | null | undefined,
  index: number,
  opts: InventorySlotClickOptions
): boolean {
  if (!slot) return false;
  const d = ITEMS[slot.id];
  if (!d) return false;

  if (opts.open === "depot") {
    opts.send("depot", { op: "put", index });
    return true;
  }

  if (d.slot) {
    if (d.minLevel && opts.playerLevel < d.minLevel) {
      opts.onInspect?.(slot);
      return false;
    }
    opts.send("equip", { index });
    return true;
  }

  if (d.heal || d.restoreRei || d.boost || d.box) {
    opts.send("useItem", { index });
    return true;
  }

  return false;
}
