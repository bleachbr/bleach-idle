import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initCharacterSheet } from "../src/characterSheetDialog";

type FakeEl = {
  id: string;
  textContent: string;
  disabled: boolean;
  open: boolean;
  className: string;
  children: unknown[];
  onclick: null | (() => void);
  replaceChildren: (...c: unknown[]) => void;
  showModal: () => void;
  close: () => void;
  append: (...c: unknown[]) => void;
};

const el = (id: string): FakeEl => ({
  id,
  textContent: "",
  disabled: false,
  open: false,
  className: "",
  children: [],
  onclick: null,
  replaceChildren(...c) {
    this.children = c;
  },
  showModal() {
    this.open = true;
  },
  close() {
    this.open = false;
  },
  append(...c) {
    this.children.push(...c);
  },
});

const saved = { document: (globalThis as any).document, window: (globalThis as any).window };
let els: Record<string, FakeEl>;

beforeEach(() => {
  els = {};
  (globalThis as any).document = {
    querySelector: (sel: string) => (els[sel] ??= el(sel)),
    createElement: (tag: string) => el(tag),
  };
  (globalThis as any).window = { addEventListener: () => {} };
});

afterEach(() => {
  Object.assign(globalThis, saved);
});

function fakeRoom() {
  const handlers = new Map<string, (m: any) => void>();
  return {
    dispatch: (type: string, payload?: any) => handlers.get(type)?.(payload),
    room: {
      onMessage: (type: string, cb: (m: any) => void) => handlers.set(type, cb),
    } as any,
  };
}

describe("diálogo da ficha do personagem", () => {
  it("mensagem sheet do servidor abre o diálogo da ficha", () => {
    const r = fakeRoom();
    const closed: string[] = [];
    const closeWindows = (keep?: string) => { closed.push(keep ?? ""); };

    initCharacterSheet(r.room, () => undefined, () => 0, closeWindows);
    expect(els["#sheet-dialog"].open).toBe(false);

    // Servidor envia evento "sheet" disparado pelo comando /atributos
    r.dispatch("sheet", {});
    expect(els["#sheet-dialog"].open).toBe(true);
    expect(closed).toContain("#sheet-dialog");
  });

  it("função close fecha o diálogo quando ele está aberto", () => {
    const r = fakeRoom();
    const sheet = initCharacterSheet(r.room, () => undefined, () => 0);
    r.dispatch("sheet", {});
    expect(els["#sheet-dialog"].open).toBe(true);

    sheet.close();
    expect(els["#sheet-dialog"].open).toBe(false);
  });
});
