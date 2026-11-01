import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initRebirthDialog } from "../src/rebirthDialog";

// DOM mínimo (o Vitest do projeto roda em Node, sem jsdom): só o que a janela de renascimento toca
type FakeEl = { id: string; textContent: string; disabled: boolean; open: boolean; className: string; children: unknown[]; onclick: null | (() => void);
  replaceChildren: (...c: unknown[]) => void; showModal: () => void; close: () => void };
const el = (id: string): FakeEl => ({
  id, textContent: "", disabled: false, open: false, className: "", children: [], onclick: null,
  replaceChildren(...c) { this.children = c; }, showModal() { this.open = true; }, close() { this.open = false; },
});
const saved = { document: (globalThis as any).document, window: (globalThis as any).window };
let els: Record<string, FakeEl>;

beforeEach(() => {
  els = {};
  (globalThis as any).document = {
    querySelector: (sel: string) => (els[sel] ??= el(sel)),
    createElement: () => el("li"),
  };
  (globalThis as any).window = { addEventListener: () => {} };
});
afterEach(() => { Object.assign(globalThis, saved); });

/** sala falsa: guarda o ouvinte de mudança de estado para o teste disparar o patch do servidor */
function fakeRoom() {
  const listeners: (() => void)[] = [];
  const sent: string[] = [];
  return { sent, patch: () => listeners.forEach((l) => l()), room: { send: (t: string) => sent.push(t), onStateChange: (cb: () => void) => listeners.push(cb) } as any };
}

describe("janela de renascimento acompanha o estado (issue #35)", () => {
  it("com a janela aberta, cair abaixo do nível desabilita o Confirmar e mostra o requisito", () => {
    const player = { level: 60, rebirths: 0 };
    const r = fakeRoom();
    initRebirthDialog(r.room, () => player).open();
    expect(els["#rebirth-dialog"].open).toBe(true);
    expect(els["#rebirth-confirm"].disabled).toBe(false);

    player.level = 59; // ex.: morreu caçando no Auto Hunt com a janela aberta
    r.patch();
    expect(els["#rebirth-confirm"].disabled).toBe(true);
    expect((els["#rebirth-reqs"].children[0] as FakeEl).textContent).toBe("✖ Nível 60 (você está no 59)");
  });

  it("com a janela fechada, o patch do servidor não a reabre nem a redesenha", () => {
    const player = { level: 60, rebirths: 0 };
    const r = fakeRoom();
    initRebirthDialog(r.room, () => player);
    r.patch();
    expect(els["#rebirth-dialog"].open).toBe(false);
    expect(els["#rebirth-title"]?.textContent ?? "").toBe("");
  });
});
