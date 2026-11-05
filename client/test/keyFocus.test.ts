import { describe, it, expect } from "vitest";
import { keyBelongsToField } from "../src/keyFocus";

// R-14 (RF-08): com o foco num campo, a tecla é do campo; controles deslizantes e caixas de marcar não seguram os atalhos.
const input = (type?: string) => ({ tagName: "INPUT", type });

describe("keyBelongsToField", () => {
  it("campo de texto, lista, área de texto e contenteditable ficam com a tecla", () => {
    expect(keyBelongsToField(input("text"), "KeyW")).toBe(true);
    expect(keyBelongsToField(input("password"), "KeyW")).toBe(true);
    expect(keyBelongsToField(input("search"), "KeyW")).toBe(true);
    expect(keyBelongsToField(input(), "KeyW")).toBe(true); // <input> sem type é texto
    expect(keyBelongsToField({ tagName: "SELECT" }, "ArrowUp")).toBe(true); // #hunt-spot deixava passar setas, dígitos, T e R
    expect(keyBelongsToField({ tagName: "textarea" }, "KeyW")).toBe(true);
    expect(keyBelongsToField({ tagName: "DIV", isContentEditable: true }, "KeyW")).toBe(true);
  });

  it("range, checkbox, radio e botões não bloqueiam os atalhos", () => {
    // os controles do Auto Helper são <input type="range">: antes seguravam WASD até perder o foco
    for (const t of ["range", "checkbox", "radio", "button", "submit", "reset", "RANGE"]) expect(keyBelongsToField(input(t), "KeyW")).toBe(false);
    expect(keyBelongsToField({ tagName: "BUTTON" }, "KeyW")).toBe(false);
    expect(keyBelongsToField({ tagName: "CANVAS" }, "KeyW")).toBe(false);
    expect(keyBelongsToField({ tagName: "DIV", isContentEditable: false }, "KeyW")).toBe(false);
  });

  it("no range, só as teclas que movem o controle ficam com ele", () => {
    // o GameScene cancela as setas: sem isso, o teclado perderia o controle do deslizante do Auto Helper
    for (const code of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"]) {
      expect(keyBelongsToField(input("range"), code)).toBe(true);
    }
    for (const code of ["KeyW", "KeyA", "KeyS", "KeyD", "KeyT", "KeyR", "Digit1", "Tab"]) {
      expect(keyBelongsToField(input("range"), code)).toBe(false);
    }
    expect(keyBelongsToField(input("checkbox"), "ArrowUp")).toBe(false); // a seta só é do campo no range
  });

  it("o Espaço fica com botão, caixa de marcar e radio (não vira interagir no jogo)", () => {
    for (const t of ["checkbox", "radio", "button", "submit"]) expect(keyBelongsToField(input(t), "Space")).toBe(true);
    expect(keyBelongsToField({ tagName: "BUTTON" }, "Space")).toBe(true);
    expect(keyBelongsToField({ tagName: "BUTTON" }, "KeyE")).toBe(false); // as outras teclas seguem para o jogo
    expect(keyBelongsToField(input("checkbox"), "KeyE")).toBe(false);
    expect(keyBelongsToField({ tagName: "CANVAS" }, "Space")).toBe(false);
  });

  it("alvo que não é elemento não bloqueia", () => {
    for (const t of [null, undefined, "INPUT", 7, {}, { tagName: 3 }]) expect(keyBelongsToField(t, "KeyW")).toBe(false);
  });
});
