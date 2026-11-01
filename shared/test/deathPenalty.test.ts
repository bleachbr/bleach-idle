import { describe, it, expect } from "vitest";
import { deathPenalty, INVASION_DEATH } from "../src/deathPenalty";
import { DEATH_EXP_LOSS } from "../src/formulas";
import { DEATH_ITEM_LOSS, DEATH_GOLD_LOSS } from "../src/items";
import { SKULL_ITEM_LOSS, SKULL_GOLD_LOSS } from "../src/social";

const base = { skulled: false, amulet: false, invasionMob: false };

describe("penalidade de morte (#39, proposta para aprovação)", () => {
  it("morte comum no mundo aberto continua igual", () => {
    expect(deathPenalty(base)).toEqual({ exp: DEATH_EXP_LOSS, gold: DEATH_GOLD_LOSS, item: DEATH_ITEM_LOSS, protected: false, invasion: false });
  });

  it("morto por Hollow da invasão ativa: sem perda de itens, metade de XP e de kan", () => {
    expect(INVASION_DEATH).toEqual({ expMult: 0.5, goldMult: 0.5, itemLoss: 0 });
    expect(deathPenalty({ ...base, invasionMob: true })).toEqual({
      exp: DEATH_EXP_LOSS * 0.5, gold: DEATH_GOLD_LOSS * 0.5, item: 0, protected: false, invasion: true,
    });
  });

  it("assassino (☠) não escapa da penalidade dele morrendo para a invasão", () => {
    const skull = { exp: DEATH_EXP_LOSS, gold: SKULL_GOLD_LOSS, item: SKULL_ITEM_LOSS, protected: false, invasion: false };
    expect(deathPenalty({ ...base, skulled: true })).toEqual(skull);
    expect(deathPenalty({ ...base, skulled: true, invasionMob: true })).toEqual(skull);
    expect(deathPenalty({ ...base, skulled: true, amulet: true })).toEqual(skull); // o amuleto não protege assassino
  });

  it("Amuleto da Alma protege tudo como antes, também na invasão", () => {
    const prot = { exp: 0, gold: 0, item: 0, protected: true, invasion: false };
    expect(deathPenalty({ ...base, amulet: true })).toEqual(prot);
    expect(deathPenalty({ ...base, amulet: true, invasionMob: true })).toEqual(prot);
  });
});
