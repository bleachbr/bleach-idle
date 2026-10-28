import { describe, it, expect } from "vitest";
import {
  spaceFor,
  addItem,
  removeItem,
  countItem,
  lookOf,
  equipBonus,
  rollLoot,
  ITEMS,
  STACK_MAX,
  INV_SIZE,
  type Slot,
} from "../src/items";

describe("items", () => {
  describe("spaceFor", () => {
    it("retorna capacidade total para inventário vazio com item empilhável", () => {
      const inv: (Slot | null)[] = Array(INV_SIZE).fill(null);
      // Item empilhável pode ocupar todos os 20 slots com até STACK_MAX (100) cada = 2000
      expect(spaceFor(inv, "pocao_vida")).toBe(INV_SIZE * STACK_MAX);
    });

    it("retorna apenas a contagem de slots vazios para item não-empilhável", () => {
      const inv: (Slot | null)[] = Array(INV_SIZE).fill(null);
      // Zanpakuto não é empilhável: só pode entrar 1 por slot vazio
      expect(spaceFor(inv, "zanpakuto")).toBe(INV_SIZE);
    });

    it("considera espaço restante em pilhas incompletas de itens empilháveis", () => {
      const inv: (Slot | null)[] = Array(INV_SIZE).fill(null);
      inv[0] = { id: "pocao_vida", qty: 30 };
      // 1 slot com 70 de espaço + 19 slots vazios com 100 cada = 1970
      expect(spaceFor(inv, "pocao_vida")).toBe(70 + 19 * STACK_MAX);
    });

    it("retorna 0 quando o inventário está cheio", () => {
      const inv: (Slot | null)[] = Array(INV_SIZE).fill({ id: "zanpakuto", qty: 1 });
      expect(spaceFor(inv, "pocao_vida")).toBe(0);
      expect(spaceFor(inv, "zanpakuto")).toBe(0);
    });
  });

  describe("addItem", () => {
    it("adiciona item empilhável em slot vazio", () => {
      const inv: (Slot | null)[] = Array(INV_SIZE).fill(null);
      const added = addItem(inv, "pocao_vida", 10);
      expect(added).toBe(10);
      expect(inv[0]).toEqual({ id: "pocao_vida", qty: 10 });
      expect(inv[1]).toBeNull();
    });

    it("acumula em pilha existente se houver espaço", () => {
      const inv: (Slot | null)[] = Array(INV_SIZE).fill(null);
      inv[0] = { id: "pocao_vida", qty: 80 };
      const added = addItem(inv, "pocao_vida", 30);
      expect(added).toBe(30);
      expect(inv[0]).toEqual({ id: "pocao_vida", qty: 100 });
      expect(inv[1]).toEqual({ id: "pocao_vida", qty: 10 });
    });

    it("respeita o limite de não-empilhável criando 1 item por slot", () => {
      const inv: (Slot | null)[] = Array(INV_SIZE).fill(null);
      const added = addItem(inv, "zanpakuto", 2);
      expect(added).toBe(2);
      expect(inv[0]).toEqual({ id: "zanpakuto", qty: 1 });
      expect(inv[1]).toEqual({ id: "zanpakuto", qty: 1 });
      expect(inv[2]).toBeNull();
    });

    it("retorna apenas o que coube quando o inventário enche", () => {
      const inv: (Slot | null)[] = Array(INV_SIZE).fill({ id: "zanpakuto", qty: 1 });
      inv[0] = null; // Apenas 1 espaço livre
      const added = addItem(inv, "pocao_vida", 150);
      expect(added).toBe(100); // Coube 1 stack cheia no único slot vago
    });
  });

  describe("removeItem", () => {
    it("remove quantidade exata de um item", () => {
      const inv: (Slot | null)[] = Array(INV_SIZE).fill(null);
      inv[0] = { id: "pocao_vida", qty: 10 };
      const removed = removeItem(inv, "pocao_vida", 10);
      expect(removed).toBe(10);
      expect(inv[0]).toBeNull();
    });

    it("remove parcialmente de uma pilha", () => {
      const inv: (Slot | null)[] = Array(INV_SIZE).fill(null);
      inv[0] = { id: "pocao_vida", qty: 25 };
      const removed = removeItem(inv, "pocao_vida", 10);
      expect(removed).toBe(10);
      expect(inv[0]).toEqual({ id: "pocao_vida", qty: 15 });
    });

    it("remove de múltiplos slots quando necessário", () => {
      const inv: (Slot | null)[] = Array(INV_SIZE).fill(null);
      inv[0] = { id: "pocao_vida", qty: 50 };
      inv[1] = { id: "pocao_vida", qty: 30 };
      const removed = removeItem(inv, "pocao_vida", 60);
      expect(removed).toBe(60);
      // Remove do fim pro começo
      expect(countItem(inv, "pocao_vida")).toBe(20);
    });

    it("retorna 0 se o item não existir", () => {
      const inv: (Slot | null)[] = Array(INV_SIZE).fill(null);
      expect(removeItem(inv, "pocao_vida", 5)).toBe(0);
    });
  });

  describe("countItem", () => {
    it("soma quantidade de itens iguais através de diferentes slots", () => {
      const inv: (Slot | null)[] = Array(INV_SIZE).fill(null);
      inv[0] = { id: "pocao_vida", qty: 20 };
      inv[3] = { id: "pocao_vida", qty: 50 };
      inv[5] = { id: "zanpakuto", qty: 1 };
      expect(countItem(inv, "pocao_vida")).toBe(70);
      expect(countItem(inv, "zanpakuto")).toBe(1);
      expect(countItem(inv, "amuleto_alma")).toBe(0);
    });
  });

  describe("lookOf", () => {
    it("retorna string vazia quando não tem haori nem mascara", () => {
      expect(lookOf({})).toBe("");
      expect(lookOf({ head: "bandana", armor: "shihakusho" })).toBe("");
    });

    it("retorna 'haori' com Haori de Capitão", () => {
      expect(lookOf({ armor: "haori" })).toBe("haori");
    });

    it("retorna 'mask' com Máscara de Osso", () => {
      expect(lookOf({ head: "mascara" })).toBe("mask");
    });

    it("retorna 'haori_mask' com ambos equipados", () => {
      expect(lookOf({ armor: "haori", head: "mascara" })).toBe("haori_mask");
    });
  });

  describe("equipBonus", () => {
    it("soma atributos de múltiplos equipamentos", () => {
      // bandana: def: 2
      // shihakusho: def: 5
      // zanpakuto: atk: 4
      // anel_rei: rei: 30
      const bonus = equipBonus({
        head: "bandana",
        armor: "shihakusho",
        weapon: "zanpakuto",
        ring: "anel_rei",
      });

      expect(bonus).toEqual({
        atk: 4,
        def: 7,
        hp: 0,
        rei: 30,
      });
    });

    it("retorna tudo 0 para equipamento vazio ou slots inválidos", () => {
      expect(equipBonus({})).toEqual({ atk: 0, def: 0, hp: 0, rei: 0 });
    });
  });

  describe("rollLoot", () => {
    it("retorna ouro e itens dentro dos limites para hollow_menor", () => {
      for (let i = 0; i < 20; i++) {
        const loot = rollLoot("hollow_menor");
        expect(loot.gold).toBeGreaterThanOrEqual(3);
        expect(loot.gold).toBeLessThanOrEqual(10);
        for (const item of loot.items) {
          expect(ITEMS[item.id]).toBeDefined();
        }
      }
    });

    it("retorna vazio para monstro inexistente", () => {
      expect(rollLoot("monstro_fantasma")).toEqual({ gold: 0, items: [] });
    });
  });
});
