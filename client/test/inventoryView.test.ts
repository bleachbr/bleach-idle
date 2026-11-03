import { describe, it, expect, vi } from "vitest";
import {
  formatSlotAria,
  formatInventoryCount,
  itemDetailHtml,
  isItemLevelLocked,
  handleInventorySlotClick,
} from "../src/inventoryView";
import { ITEMS } from "../../shared/src";

describe("Lote 3: Usabilidade do Inventário e Acessibilidade de Slots", () => {
  it("formatSlotAria gera texto descritivo claro em vez de BUTTON vazio ou apenas quantidade", () => {
    // Slot vazio do inventário
    expect(formatSlotAria(null)).toBe("Slot de inventário vazio");

    // Slot vazio de equipamento
    expect(formatSlotAria(null, "weapon")).toContain("Arma (vazio)");
    expect(formatSlotAria(null, "armor")).toContain("Corpo (vazio)");

    // Slot com item empilhável (ex.: 13 poções de vida)
    const pocaoSlot = { id: "pocao_vida", qty: 13 };
    const pocaoAria = formatSlotAria(pocaoSlot);
    expect(pocaoAria).toContain("Poção de Cura (13)");
    expect(pocaoAria).toContain("Recupera");

    // Slot com equipamento (ex.: Manto de Sternritter)
    const mantoSlot = { id: "manto_sternritter", qty: 1 };
    const mantoAria = formatSlotAria(mantoSlot);
    expect(mantoAria).toContain("Manto de Sternritter");
    expect(mantoAria).toContain("Corpo");
    expect(mantoAria).toContain("Defesa +22");
    expect(mantoAria).toContain("Nível 105+");
  });

  it("formatInventoryCount calcula taxa de ocupação e alerta de inventário cheio", () => {
    const emptyInv = Array(20).fill(null);
    expect(formatInventoryCount(emptyInv)).toEqual({
      used: 0,
      total: 20,
      isFull: false,
      text: "0/20 slots",
    });

    const halfInv = [...Array(10).fill({ id: "pocao_vida", qty: 1 }), ...Array(10).fill(null)];
    expect(formatInventoryCount(halfInv)).toEqual({
      used: 10,
      total: 20,
      isFull: false,
      text: "10/20 slots",
    });

    const fullInv = Array(20).fill({ id: "garra", qty: 1 });
    expect(formatInventoryCount(fullInv)).toEqual({
      used: 20,
      total: 20,
      isFull: true,
      text: "20/20 slots (cheio)",
    });
  });

  it("isItemLevelLocked identifica corretamente itens que o jogador não tem nível para equipar", () => {
    const manto = { id: "manto_sternritter", qty: 1 }; // minLevel: 105
    expect(isItemLevelLocked(manto, 1)).toBe(true);
    expect(isItemLevelLocked(manto, 50)).toBe(true);
    expect(isItemLevelLocked(manto, 105)).toBe(false);
    expect(isItemLevelLocked(manto, 120)).toBe(false);

    const espada = { id: "zanpakuto", qty: 1 }; // sem minLevel
    expect(isItemLevelLocked(espada, 1)).toBe(false);

    expect(isItemLevelLocked(null, 1)).toBe(false);
  });

  it("itemDetailHtml gera painel com nome, atributos e aviso explícito de nível insuficiente", () => {
    // Quando nenhum item está selecionado
    const emptyDetail = itemDetailHtml(null, 1);
    expect(emptyDetail).toContain("Passe o mouse ou clique em um item");

    // Item com nível bloqueado (Manto de Sternritter para jogador nível 5)
    const lockedDetail = itemDetailHtml({ id: "manto_sternritter", qty: 1 }, 5);
    expect(lockedDetail).toContain("Manto de Sternritter");
    expect(lockedDetail).toContain("Corpo");
    expect(lockedDetail).toContain("<b>Defesa</b> +22");
    expect(lockedDetail).toContain("<b>HP</b> +220");
    expect(lockedDetail).toContain("Exige nível 105");
    expect(lockedDetail).toContain("seu nível atual é 5");
    expect(lockedDetail).toContain("Nível insuficiente");

    // Item consumível que pode ser usado
    const pocaoDetail = itemDetailHtml({ id: "pocao_vida", qty: 5 }, 1);
    expect(pocaoDetail).toContain("Poção de Cura");
    expect(pocaoDetail).toContain("Quantidade: 5");
    expect(pocaoDetail).toContain("Clique para usar");

    // Equipamento que pode ser equipado (Haori de Capitão para nível 20)
    const haoriDetail = itemDetailHtml({ id: "haori", qty: 1 }, 20);
    expect(haoriDetail).toContain("Haori de Capitão");
    expect(haoriDetail).toContain("Clique para equipar");
  });

  it("handleInventorySlotClick bloqueia envio de equip quando o jogador não tem nível suficiente", () => {
    const send = vi.fn();
    const onInspect = vi.fn();

    // Manto de Sternritter exige nível 105; jogador está nível 10
    const manto = { id: "manto_sternritter", qty: 1 };
    const handled = handleInventorySlotClick(manto, 3, {
      playerLevel: 10,
      send,
      onInspect,
    });

    expect(handled).toBe(false);
    expect(send).not.toHaveBeenCalledWith("equip", expect.anything());
    expect(onInspect).toHaveBeenCalledWith(manto);

    // Quando o jogador atinge nível suficiente (105+), equipa normalmente
    send.mockClear();
    onInspect.mockClear();
    const allowed = handleInventorySlotClick(manto, 3, {
      playerLevel: 105,
      send,
      onInspect,
    });

    expect(allowed).toBe(true);
    expect(send).toHaveBeenCalledWith("equip", { index: 3 });
    expect(onInspect).not.toHaveBeenCalled();
  });

  it("handleInventorySlotClick encaminha para depot ou useItem conforme o contexto", () => {
    const send = vi.fn();

    // Com depot aberto, guarda no depot em vez de equipar
    const espada = { id: "zanpakuto", qty: 1 };
    handleInventorySlotClick(espada, 0, {
      open: "depot",
      playerLevel: 10,
      send,
    });
    expect(send).toHaveBeenCalledWith("depot", { op: "put", index: 0 });

    // Item consumível chama useItem
    send.mockClear();
    const pocao = { id: "pocao_vida", qty: 2 };
    handleInventorySlotClick(pocao, 1, {
      playerLevel: 10,
      send,
    });
    expect(send).toHaveBeenCalledWith("useItem", { index: 1 });
  });
});
