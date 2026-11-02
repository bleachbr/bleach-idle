import { describe, it, expect } from "vitest";
import { keyBelongsToField } from "../src/keyFocus";

// R-14 (RF-08): com o foco num campo, a tecla é do campo; controles deslizantes e caixas de marcar não seguram os atalhos.
const input = (type?: string) => ({ tagName: "INPUT", type });

describe("keyBelongsToField", () => {
  it("campo de texto, lista, área de texto e contenteditable ficam com a tecla", () => {
    expect(keyBelongsToField(input("text"))).toBe(true);
    expect(keyBelongsToField(input("password"))).toBe(true);
    expect(keyBelongsToField(input("search"))).toBe(true);
    expect(keyBelongsToField(input())).toBe(true); // <input> sem type é texto
    expect(keyBelongsToField({ tagName: "SELECT" })).toBe(true); // #hunt-spot deixava passar setas, dígitos, T e R
    expect(keyBelongsToField({ tagName: "textarea" })).toBe(true);
    expect(keyBelongsToField({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });

  it("range, checkbox, radio e botões não bloqueiam os atalhos", () => {
    // os controles do Auto Helper são <input type="range">: antes seguravam WASD até perder o foco
    for (const t of ["range", "checkbox", "radio", "button", "submit", "reset", "RANGE"]) expect(keyBelongsToField(input(t))).toBe(false);
    expect(keyBelongsToField({ tagName: "BUTTON" })).toBe(false);
    expect(keyBelongsToField({ tagName: "CANVAS" })).toBe(false);
    expect(keyBelongsToField({ tagName: "DIV", isContentEditable: false })).toBe(false);
  });

  it("alvo que não é elemento não bloqueia", () => {
    for (const t of [null, undefined, "INPUT", 7, {}, { tagName: 3 }]) expect(keyBelongsToField(t)).toBe(false);
  });
});
