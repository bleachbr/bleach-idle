import { describe, it, expect } from "vitest";
import { deathPenalty, inPvpCombat, INVASION_DEATH } from "../src/deathPenalty";
import { DEATH_EXP_LOSS } from "../src/formulas";
import { DEATH_ITEM_LOSS, DEATH_GOLD_LOSS } from "../src/items";
import { SKULL_ITEM_LOSS, SKULL_GOLD_LOSS, RECALL_COMBAT_MS } from "../src/social";

const base = { skulled: false, amulet: false, invasionMob: false, pvpRecent: false };

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

  it("PvP recente (marcado por agressão ou atacado por jogador) não usa o atenuante: morte comum", () => {
    const common = { exp: DEATH_EXP_LOSS, gold: DEATH_GOLD_LOSS, item: DEATH_ITEM_LOSS, protected: false, invasion: false };
    expect(deathPenalty({ ...base, invasionMob: true, pvpRecent: true })).toEqual(common);
    // o amuleto continua protegendo quem não é assassino
    expect(deathPenalty({ ...base, invasionMob: true, pvpRecent: true, amulet: true })).toMatchObject({ protected: true });
  });
});

describe("inPvpCombat: quem está no PvP agora (#39)", () => {
  const now = 1_000_000;
  it("marcado por agressão (pvpUntil no futuro)", () => {
    expect(inPvpCombat(now, now + 1, 0)).toBe(true);
    expect(inPvpCombat(now, now, 0)).toBe(false); // venceu no instante exato
  });

  it("levou dano de jogador dentro da janela de combate (RECALL_COMBAT_MS)", () => {
    expect(inPvpCombat(now, 0, now - RECALL_COMBAT_MS + 1)).toBe(true);
    expect(inPvpCombat(now, 0, now - RECALL_COMBAT_MS)).toBe(false);
    expect(inPvpCombat(now, 0, 0)).toBe(false); // nunca atacado
  });
});
