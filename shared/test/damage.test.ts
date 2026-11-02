import { describe, it, expect } from "vitest";
import { CHARS, START_KIT, attackDmgMult, rebirthBonus, reiMult, setBonuses, trainedDmgMult, zanMult } from "../src";

// mesma cadeia que o WorldRoom.hit aplicava em linha antes da extração (#36)
const equip = { ...START_KIT.equip, weapon: "lua_negra", ring: "anel_espiritual" };
const p = { zanjutsu: 10, reiryoku: 5, rebirths: 2, equip };
const legacy = (skill: boolean) => (skill ? reiMult(p.reiryoku) : zanMult(p.zanjutsu)) * rebirthBonus(p.rebirths).dmg * setBonuses(p.equip).total.dmg;

describe("cadeia de multiplicadores de dano (#36)", () => {
  it("perícia × renascimento × conjuntos é bit a bit a conta antiga do hit", () => {
    expect(trainedDmgMult(p, false)).toBe(legacy(false));
    expect(trainedDmgMult(p, true)).toBe(legacy(true));
    expect(trainedDmgMult({ zanjutsu: 0, reiryoku: 0, rebirths: 0, equip: {} }, true)).toBe(1);
  });

  it("o estágio vale para golpe e técnica", () => {
    const bankai = CHARS.ichigo.forms[1].dmgMult;
    expect(attackDmgMult(bankai, p, false)).toBe(bankai * legacy(false));
    expect(attackDmgMult(bankai, p, true)).toBe(bankai * legacy(true));
    expect(attackDmgMult(bankai, p, true)).toBeCloseTo(1.7 * 1.15 * 1.1 * 1.06, 10);
  });
});
