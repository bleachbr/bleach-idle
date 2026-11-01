import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseMap, TILE, type GameMap } from "../../shared/src";
import { interactAt, interactNear, interactHint } from "../src/interactHit";

// mapa de verdade: na praça de Karakura a loja fica em (18,12), o depot em (14,12), o portal em (16,11) e o templo em (16,14)
const karakura = parseMap("karakura", JSON.parse(readFileSync(new URL("../public/maps/karakura.tmj", import.meta.url), "utf8")));
const center = (x: number, y: number) => [x * TILE + TILE / 2, y * TILE + TILE / 2] as const;

describe("clique na loja, no depot e no portal (#26)", () => {
  it("confere as posições do mapa usadas nos casos abaixo", () => {
    expect(karakura.shop).toMatchObject({ x: 18, y: 12 });
    expect(karakura.depot).toEqual({ x: 14, y: 12 });
    expect(karakura.gate).toMatchObject({ x: 16, y: 11 });
  });

  it("o tile de cada lugar abre o que é dele", () => {
    expect(interactAt(karakura, ...center(18, 12))).toBe("shop");
    expect(interactAt(karakura, ...center(18, 11))).toBe("shop"); // a cabeça do Kisuke, no tile de cima
    expect(interactAt(karakura, ...center(14, 12))).toBe("depot");
    expect(interactAt(karakura, ...center(16, 11))).toBe("travel");
    expect(interactAt(karakura, ...center(16, 13))).toBeNull();
  });

  it("qualquer ponto do desenho do Kisuke (48 px, mais largo que o tile) abre a loja", () => {
    const cx = 18 * TILE + TILE / 2, foot = 13 * TILE;
    expect(interactAt(karakura, cx - 22, foot - 10)).toBe("shop"); // borda esquerda, já no tile 17
    expect(interactAt(karakura, cx + 22, foot - 10)).toBe("shop"); // borda direita, já no tile 19
    expect(interactAt(karakura, cx, foot - 56)).toBe("shop"); // o nome em cima do desenho
    expect(interactAt(karakura, cx - 30, foot - 10)).toBeNull(); // fora do desenho
  });

  it("com o depot colado na loja, o Kisuke tem prioridade onde os dois se encostam", () => {
    const m = { shop: { x: 5, y: 5, name: "Loja" }, depot: { x: 6, y: 5 } } as Pick<GameMap, "shop" | "depot" | "gate">;
    expect(interactAt(m, 6 * TILE + 4, 5 * TILE + 16)).toBe("shop"); // borda do desenho por cima do baú
    expect(interactAt(m, ...center(6, 5))).toBe("depot"); // meio do baú continua sendo depot
  });

  it("mapa sem loja nem depot não abre nada", () => {
    expect(interactAt({}, ...center(18, 12))).toBeNull();
  });
});

describe("indicador e tecla de interação por perto", () => {
  it("no templo a loja e o depot estão ao alcance: vale a loja", () => {
    expect(interactNear(karakura, 16, 14)).toBe("shop");
  });

  it("perto só do depot, vale o depot; longe de tudo, nada", () => {
    expect(interactNear(karakura, 13, 12)).toBe("depot");
    expect(interactNear(karakura, 30, 30)).toBeNull();
  });

  it("o rótulo diz o que abre e como", () => {
    expect(interactHint(karakura, 16, 14)).toEqual({ kind: "shop", x: 18, y: 12, text: "Kisuke (loja): E / Espaço / clique" });
    expect(interactHint(karakura, 13, 12)).toEqual({ kind: "depot", x: 14, y: 12, text: "Depot: E / Espaço / clique" });
    expect(interactHint(karakura, 30, 30)).toBeNull();
  });
});
