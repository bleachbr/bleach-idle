import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { INVENTORY_KEYS, isInventoryKey, isTypingTarget } from "../src/hotkeys";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const key = (code: string, extra: Partial<KeyboardEvent> = {}) => ({ code, repeat: false, ctrlKey: false, metaKey: false, altKey: false, ...extra });

describe("atalho do inventário (issue #25)", () => {
  it("I e B abrem o inventário; outras teclas, não", () => {
    expect(isInventoryKey(key("KeyI"))).toBe(true);
    expect(isInventoryKey(key("KeyB"))).toBe(true);
    for (const code of ["KeyT", "KeyR", "Tab", "Escape", "Digit2"]) expect(isInventoryKey(key(code)), code).toBe(false);
  });

  it("ignora tecla segurada e combinações com Ctrl, Cmd ou Alt (Ctrl+B, Cmd+I do navegador)", () => {
    expect(isInventoryKey(key("KeyI", { repeat: true }))).toBe(false);
    expect(isInventoryKey(key("KeyB", { ctrlKey: true }))).toBe(false);
    expect(isInventoryKey(key("KeyI", { metaKey: true }))).toBe(false);
    expect(isInventoryKey(key("KeyI", { altKey: true }))).toBe(false);
  });

  it("não dispara enquanto se digita no chat, num campo ou num select", () => {
    for (const tagName of ["INPUT", "TEXTAREA", "SELECT"]) expect(isTypingTarget({ tagName }), tagName).toBe(true);
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
    expect(isTypingTarget({ tagName: "BUTTON" })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });

  it("não colide com os atalhos de combate do GameScene", () => {
    const scene = read("../src/GameScene.ts");
    for (const code of INVENTORY_KEYS) expect(scene.includes(`"${code}"`), code).toBe(false);
  });

  it("a barra superior tem um botão real de Inventário com rótulo e atalho anunciados", () => {
    const html = read("../index.html");
    const btn = html.match(/<button[^>]*id="inv-btn"[^>]*>/)?.[0] ?? "";
    expect(btn, "botão #inv-btn").not.toBe("");
    expect(btn).toMatch(/type="button"/);
    expect(btn).toMatch(/aria-label="Inventário \(I\)"/);
    expect(btn).toMatch(/aria-keyshortcuts="I B"/);
    expect(btn).toMatch(/aria-controls="gear"/);
    // e a dica do atalho na lista de Atalhos da barra lateral
    expect(html).toMatch(/<kbd>I<\/kbd>[^<]*Inventário/);
  });
});
