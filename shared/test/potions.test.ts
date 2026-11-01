import { describe, it, expect } from "vitest";
import { ITEMS, potionRefusal } from "../src";

const NOW = 1_700_000_000_000;
const full = { hp: 100, maxHp: 100, rei: 50, maxRei: 50, potionReadyAt: 0, reiPotionReadyAt: 0 };

describe("motivo da poção recusada (#41)", () => {
  it("HP cheio na poção de cura", () => {
    expect(potionRefusal(ITEMS.pocao_vida, full, NOW)?.float).toBe("HP cheio!");
  });

  it("reiatsu cheio na poção de reiatsu", () => {
    expect(potionRefusal(ITEMS.pocao_rei, full, NOW)?.float).toBe("Reiatsu cheio!");
  });

  it("barra cheia vence a recarga", () => {
    expect(potionRefusal(ITEMS.pocao_vida, { ...full, potionReadyAt: NOW + 500 }, NOW)?.float).toBe("HP cheio!");
  });

  it("em recarga com a barra abaixo do máximo", () => {
    const hurt = { ...full, hp: 40, rei: 10, potionReadyAt: NOW + 500, reiPotionReadyAt: NOW + 500 };
    expect(potionRefusal(ITEMS.pocao_vida, hurt, NOW)?.float).toBe("Recarga!");
    expect(potionRefusal(ITEMS.pocao_rei, hurt, NOW)?.float).toBe("Recarga!");
  });

  it("sem motivo conhecido devolve null (a recarga acaba no instante exato)", () => {
    expect(potionRefusal(ITEMS.pocao_vida, { ...full, hp: 40, potionReadyAt: NOW }, NOW)).toBeNull();
    expect(potionRefusal({ name: "Caixa" }, full, NOW)).toBeNull();
  });

  it("morto devolve null, mesmo com reiatsu cheio ou poção em recarga (o motivo é estar morto)", () => {
    const dead = { ...full, hp: 0, potionReadyAt: NOW + 500, reiPotionReadyAt: NOW + 500 };
    expect(potionRefusal(ITEMS.pocao_vida, dead, NOW)).toBeNull();
    expect(potionRefusal(ITEMS.pocao_rei, dead, NOW)).toBeNull();
    expect(potionRefusal(ITEMS.pocao_vida, { ...dead, hp: -5 }, NOW)).toBeNull();
  });
});
