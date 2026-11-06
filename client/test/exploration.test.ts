import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  showSectorBanner,
  updateSectorPresence,
  getCurrentSectorId,
  resetSectorPresence,
  interactWithSignpost,
  interactWithChest,
} from "../src/exploration";
import {
  KARAKURA_SECTORS,
  KARAKURA_SIGNPOSTS,
  KARAKURA_CHESTS,
  INV_SIZE,
  type Slot,
} from "../../shared/src";

type FakeEl = {
  id: string;
  className: string;
  innerHTML: string;
  children: FakeEl[];
  parentElement: FakeEl | null;
  classList: {
    add: (cls: string) => void;
    remove: (cls: string) => void;
    contains: (cls: string) => boolean;
  };
  offsetWidth: number;
  remove: () => void;
  appendChild: (child: FakeEl) => void;
  querySelector: (sel: string) => FakeEl | null;
  addEventListener: (event: string, handler: Function) => void;
  focus: () => void;
};

const makeEl = (tag = "div"): FakeEl => {
  const classes = new Set<string>();
  return {
    id: "",
    className: "",
    innerHTML: "",
    children: [],
    parentElement: null,
    offsetWidth: 100,
    classList: {
      add: (cls: string) => classes.add(cls),
      remove: (cls: string) => classes.delete(cls),
      contains: (cls: string) => classes.has(cls),
    },
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
        const found = c.querySelector(sel);
        if (found) return found;
      }
      return null;
    },
    addEventListener() {},
    focus() {},
  };
};

const saved = { document: (globalThis as any).document, window: (globalThis as any).window };

describe("exploration (Controlador de Exploração e Banners)", () => {
  let fakeBody: FakeEl;

  beforeEach(() => {
    resetSectorPresence();
    fakeBody = makeEl("body");
    fakeBody.id = "body";
    (globalThis as any).document = {
      body: fakeBody,
      querySelector: (sel: string) => fakeBody.querySelector(sel),
      createElement: (tag: string) => makeEl(tag),
    };
    (globalThis as any).window = {
      addEventListener: () => {},
      setTimeout: (fn: Function) => 1,
      clearTimeout: () => {},
    };
  });

  afterEach(() => {
    resetSectorPresence();
    Object.assign(globalThis, saved);
  });

  it("showSectorBanner cria ou atualiza o banner setorial com nome e subtítulo", () => {
    const sector = KARAKURA_SECTORS.setor_1;
    const banner = showSectorBanner(sector, fakeBody as any);

    expect(banner.id).toBe("sector-banner");
    expect(banner.innerHTML).toContain("Setor 1 · Lv 1-10");
    expect(banner.innerHTML).toContain("Distrito Residencial");
    expect(banner.classList.contains("active")).toBe(true);
  });

  it("updateSectorPresence detecta transição de setores ao caminhar pelo mapa", () => {
    expect(getCurrentSectorId()).toBeNull();

    // Começa no spawn em (16, 14) -> Setor 1
    const s1 = updateSectorPresence("karakura", 16, 14, fakeBody as any);
    expect(s1?.id).toBe("setor_1");
    expect(getCurrentSectorId()).toBe("setor_1");

    // Anda para a clínica em (24, 19) -> continua no Setor 1 (sem re-disparar banner)
    const s1Same = updateSectorPresence("karakura", 24, 19, fakeBody as any);
    expect(s1Same?.id).toBe("setor_1");
    expect(getCurrentSectorId()).toBe("setor_1");

    // Atravessa para o campo de treinamento leste em (36, 10) -> transição para Setor 2
    const s2 = updateSectorPresence("karakura", 36, 10, fakeBody as any);
    expect(s2?.id).toBe("setor_2");
    expect(getCurrentSectorId()).toBe("setor_2");

    // Desce para o Rio Onagawa em (17, 40) -> transição para Setor 3
    const s3 = updateSectorPresence("karakura", 17, 40, fakeBody as any);
    expect(s3?.id).toBe("setor_3");
    expect(getCurrentSectorId()).toBe("setor_3");

    // Vai para a Periferia Industrial em (54, 40) -> transição para Setor 4
    const s4 = updateSectorPresence("karakura", 54, 40, fakeBody as any);
    expect(s4?.id).toBe("setor_4");
    expect(getCurrentSectorId()).toBe("setor_4");

    // Viagem para outro mapa reseta o setor
    const sOther = updateSectorPresence("soul", 10, 10, fakeBody as any);
    expect(sOther).toBeUndefined();
    expect(getCurrentSectorId()).toBeNull();
  });

  it("interactWithSignpost abre o diálogo da placa", () => {
    const sign = KARAKURA_SIGNPOSTS[0];
    const overlay = interactWithSignpost(sign);
    expect(overlay.id).toBe("signpost-modal");
  });

  it("interactWithChest abre o baú e atualiza as recompensas do jogador", () => {
    const chest = KARAKURA_CHESTS[0];
    const inv: (Slot | null)[] = Array(INV_SIZE).fill(null);
    const player = { gold: 50, inv, openedChests: [] };

    const result = interactWithChest(chest, player);
    expect(result.success).toBe(true);
    expect(player.gold).toBe(50 + chest.rewards.gold);
    expect(player.openedChests).toContain(chest.id);
  });
});
