import { describe, it, expect } from "vitest";
import { BOSS_PHASES, evaluateBossPhase } from "../src/bossPhases";
import { MONSTERS } from "../src/data";

describe("W-04: Motor de chefes com fases", () => {
  it("todos os chefes em BOSS_PHASES existem em MONSTERS com limiares hpPct decrescentes válidos", () => {
    const keys = Object.keys(BOSS_PHASES);
    expect(keys.length).toBeGreaterThanOrEqual(6);
    for (const kind of keys) {
      expect(MONSTERS[kind], `monstro ${kind} inexistente`).toBeDefined();
      const phases = BOSS_PHASES[kind];
      expect(phases.length).toBeGreaterThanOrEqual(1);
      let prevPct = 1;
      phases.forEach((p, idx) => {
        expect(p.phase).toBe(idx + 1);
        expect(p.hpPct).toBeGreaterThan(0);
        expect(p.hpPct).toBeLessThan(prevPct);
        prevPct = p.hpPct;
        expect(p.atkMult).toBeGreaterThanOrEqual(1);
        expect(p.defMult).toBeGreaterThan(0);
        expect(p.stepMult).toBeGreaterThan(0);
        expect(p.shout.length).toBeGreaterThan(5);
      });
    }
  });

  it("transita de fase ao cruzar 70% e 35% de HP no Yhwach sem repetir fase já ativa", () => {
    const maxHp = 120_000;
    // 80% de HP -> continua na fase 0
    expect(evaluateBossPhase("yhwach", 0, 96_000, maxHp)).toBeNull();

    // 70% de HP -> entra na Fase 1 (Auswählen)
    const p1 = evaluateBossPhase("yhwach", 0, 84_000, maxHp);
    expect(p1).not.toBeNull();
    expect(p1?.phase).toBe(1);
    expect(p1?.atkMult).toBeGreaterThan(1);

    // Continua com 60% na fase 1 -> não dispara de novo
    expect(evaluateBossPhase("yhwach", 1, 72_000, maxHp)).toBeNull();

    // 30% de HP -> entra na Fase 2 (The Almighty)
    const p2 = evaluateBossPhase("yhwach", 1, 36_000, maxHp);
    expect(p2).not.toBeNull();
    expect(p2?.phase).toBe(2);
    expect(p2?.atkMult).toBeGreaterThan(p1!.atkMult);
    expect(p2?.aoeStatus?.kind).toBe("stun");
  });

  it("salta direto para a Fase 2 se um único golpe reduzir o HP de 100% para 25%, e ignora se hp <= 0", () => {
    const maxHp = 40_000;
    const jumped = evaluateBossPhase("ayon", 0, 10_000, maxHp);
    expect(jumped?.phase).toBe(2);

    // Se o golpe matou o chefe (hp <= 0), não anuncia fase
    expect(evaluateBossPhase("ayon", 0, 0, maxHp)).toBeNull();
    expect(evaluateBossPhase("ayon", 1, -50, maxHp)).toBeNull();
  });
});
