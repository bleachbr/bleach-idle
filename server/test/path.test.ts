import { describe, it, expect } from "vitest";
import { findPath } from "../src/path";

describe("pathfinding (BFS)", () => {
  it("encontra caminho em linha reta", () => {
    const isGoal = (x: number, y: number) => x === 3 && y === 0;
    const blocked = () => false;

    const path = findPath(0, 0, isGoal, blocked);

    expect(path).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it("desvia de um obstáculo", () => {
    // Grid:
    // S(0,0) . (2,0)
    // # bloqueio em (1,0)
    // Deve contornar por y=1 ou y=-1
    const isGoal = (x: number, y: number) => x === 2 && y === 0;
    const blocked = (x: number, y: number) => x === 1 && y === 0;

    const path = findPath(0, 0, isGoal, blocked);

    expect(path.length).toBeGreaterThan(0);
    // Destino final é (2, 0)
    expect(path[path.length - 1]).toEqual({ x: 2, y: 0 });
    // Nenhum ponto do caminho pode ser o obstáculo bloqueado
    expect(path.some((p) => p.x === 1 && p.y === 0)).toBe(false);
  });

  it("retorna vazio se o alvo for inalcançável", () => {
    const isGoal = (x: number, y: number) => x === 5 && y === 5;
    // Totalmente cercado por paredes
    const blocked = (x: number, y: number) => x >= -1 && x <= 1 && y >= -1 && y <= 1 && !(x === 0 && y === 0);

    const path = findPath(0, 0, isGoal, blocked);

    expect(path).toEqual([]);
  });

  it("respeita o limite de maxNodes", () => {
    const isGoal = (x: number, y: number) => x === 50 && y === 50;
    const blocked = () => false;

    // Com apenas 10 nós permitidos, não alcança (50, 50)
    const path = findPath(0, 0, isGoal, blocked, 10);

    expect(path).toEqual([]);
  });
});
