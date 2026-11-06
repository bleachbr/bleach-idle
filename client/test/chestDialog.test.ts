import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  renderChestRewardHtml,
  showChestReward,
  closeChestReward,
  isChestOpen,
} from "../src/chestDialog";
import { KARAKURA_CHESTS, type ChestOpenResult } from "../../shared/src";

type FakeEl = {
  id: string;
  className: string;
  innerHTML: string;
  textContent: string;
  children: FakeEl[];
  parentElement: FakeEl | null;
  remove: () => void;
  appendChild: (child: FakeEl) => void;
  querySelector: (sel: string) => FakeEl | null;
  addEventListener: (event: string, handler: Function) => void;
  focus: () => void;
};

const makeEl = (tag = "div"): FakeEl => ({
  id: "",
  className: "",
  innerHTML: "",
  textContent: "",
  children: [],
  parentElement: null,
  remove() {
    if (this.parentElement) {
      const idx = this.parentElement.children.indexOf(this);
      if (idx >= 0) this.parentElement.children.splice(idx, 1);
      this.parentElement = null;
    }
  },
  appendChild(child: FakeEl) {
    child.parentElement = this;
    this.children.push(child);
  },
  querySelector(sel: string): FakeEl | null {
    if (sel.startsWith("#") && this.id === sel.slice(1)) return this;
    for (const c of this.children) {
      if (sel.startsWith("#") && c.id === sel.slice(1)) return c;
      if (c.className.includes(sel.replace(".", ""))) return c;
      if (sel.includes("data-chest-close") && c.innerHTML.includes("data-chest-close")) return c;
      const found = c.querySelector(sel);
      if (found) return found;
    }
    return null;
  },
  addEventListener() {},
  focus() {},
});

const saved = { document: (globalThis as any).document, window: (globalThis as any).window };

describe("chestDialog (Diálogo de Recompensa de Baús de Tesouro)", () => {
  let fakeBody: FakeEl;

  beforeEach(() => {
    fakeBody = makeEl("body");
    fakeBody.id = "body";
    (globalThis as any).document = {
      body: fakeBody,
      querySelector: (sel: string) => fakeBody.querySelector(sel),
      createElement: (tag: string) => makeEl(tag),
    };
    (globalThis as any).window = { addEventListener: () => {} };
  });

  afterEach(() => {
    closeChestReward(fakeBody as any);
    Object.assign(globalThis, saved);
  });

  it("renderChestRewardHtml formata ouro, itens e dica do local secreto", () => {
    const chest = KARAKURA_CHESTS.find((c) => c.id === "chest_zelkova_grove")!;
    const result: ChestOpenResult = {
      success: true,
      chestId: chest.id,
      name: chest.name,
      goldAwarded: 250,
      itemsAwarded: [
        { id: "pocao_vida", qty: 5 },
        { id: "pedra_reishi", qty: 2 },
      ],
      itemsLostToFullInv: [],
      message: "Sucesso!",
    };

    const html = renderChestRewardHtml(result, chest);
    expect(html).toContain("Baú Secreto da Zelkova Ancestral");
    expect(html).toContain("Árvore Zelkova Ancestral");
    expect(html).toContain("+250 Kan");
    expect(html).toContain("Poção de Cura");
    expect(html).toContain("Pedra de Reishi");
  });

  it("renderChestRewardHtml lida com baú já aberto anteriormente", () => {
    const chest = KARAKURA_CHESTS[0];
    const result: ChestOpenResult = {
      success: false,
      chestId: chest.id,
      name: chest.name,
      goldAwarded: 0,
      itemsAwarded: [],
      itemsLostToFullInv: [],
      message: `${chest.name} já foi aberto anteriormente.`,
      alreadyOpened: true,
    };

    const html = renderChestRewardHtml(result, chest);
    expect(html).toContain("já foi aberto anteriormente");
    expect(html).not.toContain("+ Kan");
  });

  it("escapa caracteres maliciosos no nome e dica do baú", () => {
    const maliciousChest = {
      id: "chest_xss",
      map: "karakura",
      x: 1,
      y: 1,
      name: "<b>Baú Perigoso</b>",
      hint: "<script>hack()</script>",
      secretSpot: "alley" as const,
      sectorId: "setor_1" as const,
      rewards: { gold: 10, items: [] },
    };
    const result: ChestOpenResult = {
      success: true,
      chestId: maliciousChest.id,
      name: maliciousChest.name,
      goldAwarded: 10,
      itemsAwarded: [],
      itemsLostToFullInv: [],
      message: "",
    };

    const html = renderChestRewardHtml(result, maliciousChest);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;hack()&lt;/script&gt;");
    expect(html).toContain("&lt;b&gt;Baú Perigoso&lt;/b&gt;");
  });

  it("showChestReward abre o modal no DOM e atualiza isChestOpen", () => {
    const chest = KARAKURA_CHESTS[0];
    const result: ChestOpenResult = {
      success: true,
      chestId: chest.id,
      name: chest.name,
      goldAwarded: 100,
      itemsAwarded: [],
      itemsLostToFullInv: [],
      message: "Abriu!",
    };

    expect(isChestOpen(fakeBody as any)).toBe(false);
    const overlay = showChestReward(result, chest, fakeBody as any);
    expect(isChestOpen(fakeBody as any)).toBe(true);
    expect(overlay.id).toBe("chest-modal");
  });

  it("closeChestReward remove o modal do DOM", () => {
    const chest = KARAKURA_CHESTS[0];
    const result: ChestOpenResult = {
      success: true,
      chestId: chest.id,
      name: chest.name,
      goldAwarded: 100,
      itemsAwarded: [],
      itemsLostToFullInv: [],
      message: "Abriu!",
    };

    showChestReward(result, chest, fakeBody as any);
    expect(isChestOpen(fakeBody as any)).toBe(true);

    closeChestReward(fakeBody as any);
    expect(isChestOpen(fakeBody as any)).toBe(false);
  });
});
