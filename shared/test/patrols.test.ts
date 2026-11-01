import { describe, it, expect } from "vitest";
import {
  PATROL_SECTORS,
  PATROL_DURATIONS,
  calculatePatrolRewards,
  canClaimPatrol,
  patrolRemainingMs,
  type PatrolState,
} from "../src/patrols";

describe("W-13: Patrulhas idle de Hollows (cálculo determinístico e setores)", () => {
  it("contém catálogo balanceado de setores com níveis mínimos progressivos", () => {
    expect(PATROL_SECTORS.karakura_periferia.minLevel).toBe(1);
    expect(PATROL_SECTORS.rukongai_distritos.minLevel).toBe(15);
    expect(PATROL_SECTORS.floresta_menos.minLevel).toBe(35);
    expect(PATROL_SECTORS.deserto_hueco_mundo.minLevel).toBe(60);

    expect(PATROL_DURATIONS).toEqual([1, 4, 8, 12]);
  });

  it("calcula recompensas de EXP, Kan e Fragmentos proporcionalmente à duração com bônus de eficiência", () => {
    const r1 = calculatePatrolRewards("karakura_periferia", 1, 10, { seed: 100 });
    const r4 = calculatePatrolRewards("karakura_periferia", 4, 10, { seed: 100 });

    expect(r1.exp).toBeGreaterThan(0);
    expect(r1.gold).toBeGreaterThan(0);
    expect(r1.frags).toBeGreaterThanOrEqual(1);

    // 4h tem bônus de eficiência (+5%), então r4.exp > r1.exp * 4
    expect(r4.exp).toBeGreaterThanOrEqual(r1.exp * 4);
    expect(r4.gold).toBeGreaterThanOrEqual(r1.gold * 4);
  });

  it("aplica bônus de cooperação de Grupo (+15% em EXP, Kan e Fragmentos)", () => {
    const solo = calculatePatrolRewards("rukongai_distritos", 4, 25, { partyBonus: false, seed: 42 });
    const party = calculatePatrolRewards("rukongai_distritos", 4, 25, { partyBonus: true, seed: 42 });

    expect(party.exp).toBe(Math.round(solo.exp * 1.15));
    expect(party.gold).toBe(Math.round(solo.gold * 1.15));
    expect(party.frags).toBeGreaterThanOrEqual(solo.frags);
  });

  it("avalia conclusão e tempo restante com timestamp sem depender do relógio do sistema", () => {
    const T0 = 1_700_000_000_000;
    const patrol: PatrolState = {
      sectorId: "karakura_periferia",
      durationHours: 4,
      startedAt: T0,
      completedAt: T0 + 4 * 3600_000,
    };

    expect(canClaimPatrol(patrol, T0 + 3 * 3600_000)).toBe(false);
    expect(patrolRemainingMs(patrol, T0 + 3 * 3600_000)).toBe(3600_000);

    // No instante exato de conclusão
    expect(canClaimPatrol(patrol, T0 + 4 * 3600_000)).toBe(true);
    expect(patrolRemainingMs(patrol, T0 + 4 * 3600_000)).toBe(0);

    // Após a conclusão
    expect(canClaimPatrol(patrol, T0 + 5 * 3600_000)).toBe(true);
    expect(patrolRemainingMs(patrol, T0 + 5 * 3600_000)).toBe(0);
  });
});
