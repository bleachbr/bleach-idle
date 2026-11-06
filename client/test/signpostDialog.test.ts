import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  renderSignpostHtml,
  showSignpost,
  closeSignpost,
  isSignpostOpen,
} from "../src/signpostDialog";
import { KARAKURA_SIGNPOSTS } from "../../shared/src";

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
      if (sel.includes("data-signpost-close") && c.innerHTML.includes("data-signpost-close")) return c;
      const found = c.querySelector(sel);
      if (found) return found;
    }
    return null;
  },
  addEventListener() {},
  focus() {},
});

const saved = { document: (globalThis as any).document, window: (globalThis as any).window };

describe("signpostDialog (Diálogo de Placas estilo Pokémon ORAS)", () => {
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
    closeSignpost(fakeBody as any);
    Object.assign(globalThis, saved);
  });

  it("renderSignpostHtml gera HTML com título, setor, badge e coordenadas", () => {
    const sign = KARAKURA_SIGNPOSTS[0]; // Encruzilhada do Despertar
    const html = renderSignpostHtml(sign);

    expect(html).toContain("Encruzilhada do Despertar");
    expect(html).toContain("Setor 1: Distrito Residencial");
    expect(html).toContain("Direções");
    expect(html).toContain("Karakura (15, 15)");
    expect(html).toContain("Centro Comercial");
  });

  it("escapa caracteres HTML perigosos contra injeção de script", () => {
    const maliciousSign = {
      id: "sign_evil",
      map: "karakura",
      x: 10,
      y: 10,
      title: "<script>alert(1)</script>",
      text: "<b>Negrito</b> & perigo",
      category: "lore" as const,
      sectorId: "setor_1" as const,
    };
    const html = renderSignpostHtml(maliciousSign);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&amp; perigo");
  });

  it("showSignpost abre o modal no DOM e atualiza isSignpostOpen", () => {
    const sign = KARAKURA_SIGNPOSTS[1]; // Clínica Kurosaki
    expect(isSignpostOpen(fakeBody as any)).toBe(false);

    const overlay = showSignpost(sign, fakeBody as any);
    expect(isSignpostOpen(fakeBody as any)).toBe(true);
    expect(overlay.id).toBe("signpost-modal");
    expect(overlay.innerHTML).toContain("Clínica Kurosaki");
  });

  it("closeSignpost remove o modal do DOM e reseta o estado", () => {
    const sign = KARAKURA_SIGNPOSTS[2]; // Loja Urahara
    showSignpost(sign, fakeBody as any);
    expect(isSignpostOpen(fakeBody as any)).toBe(true);

    closeSignpost(fakeBody as any);
    expect(isSignpostOpen(fakeBody as any)).toBe(false);
  });
});
