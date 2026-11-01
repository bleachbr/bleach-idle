import { describe, it, expect } from "vitest";
import {
  applyStatus,
  tickStatuses,
  canEntityMove,
  canEntityAct,
  effectiveStepMs,
  formatStatusFlags,
  type StatusMap,
} from "../src/combatStatus";
import { CHARS } from "../src/data";

describe("M2-01..05: Motor de status e controle de grupo por tick", () => {
  it("M2-01 e M2-02: aplica freeze, bloqueia movimento e expira no tick exato", () => {
    const statuses: StatusMap = {};
    const t0 = 1_000_000;

    applyStatus(statuses, { kind: "freeze", durationMs: 2000 }, "p_rukia", 100, t0);
    expect(canEntityMove(statuses, t0 + 500)).toBe(false);
    expect(canEntityAct(statuses, t0 + 500)).toBe(true); // freeze imobiliza, mas não atordoa
    expect(formatStatusFlags(statuses, t0 + 500)).toBe("freeze");

    // Antes de expirar (1900 ms)
    const tick1 = tickStatuses(statuses, t0 + 1900);
    expect(tick1.expired).toEqual([]);
    expect(canEntityMove(statuses, t0 + 1900)).toBe(false);

    // No instante de expiração (2000 ms)
    const tick2 = tickStatuses(statuses, t0 + 2000);
    expect(tick2.expired).toEqual(["freeze"]);
    expect(canEntityMove(statuses, t0 + 2000)).toBe(true);
    expect(formatStatusFlags(statuses, t0 + 2000)).toBe("");
  });

  it("M2-03: aplica slow, aumenta o stepMs efetivo e restaura ao expirar", () => {
    const statuses: StatusMap = {};
    const t0 = 2_000_000;

    expect(effectiveStepMs(200, statuses, t0)).toBe(200);
    applyStatus(statuses, { kind: "slow", durationMs: 3000, slowMult: 1.5 }, "p_hitsugaya", 80, t0);
    expect(effectiveStepMs(200, statuses, t0 + 1000)).toBe(300);

    tickStatuses(statuses, t0 + 3000);
    expect(effectiveStepMs(200, statuses, t0 + 3000)).toBe(200);
  });

  it("M2-04: aplica dot, causa dano periódico a cada 1000 ms e expira após a duração", () => {
    const statuses: StatusMap = {};
    const t0 = 3_000_000;

    // 20% de 150 = 30 de dano por segundo durante 3 segundos
    applyStatus(statuses, { kind: "dot", durationMs: 3000, tickMs: 1000, dotRatio: 0.2 }, "p_kenpachi", 150, t0);

    // 500 ms: ainda não bateu 1 s
    expect(tickStatuses(statuses, t0 + 500).dotDamage).toBe(0);

    // 1000 ms: 1º tick de DoT (30)
    const r1 = tickStatuses(statuses, t0 + 1000);
    expect(r1.dotDamage).toBe(30);
    expect(r1.dotFromId).toBe("p_kenpachi");

    // 2000 ms: 2º tick de DoT (30)
    expect(tickStatuses(statuses, t0 + 2000).dotDamage).toBe(30);

    // 3000 ms: 3º tick de DoT (30) e expira no mesmo instante
    const r3 = tickStatuses(statuses, t0 + 3000);
    expect(r3.dotDamage).toBe(30);
    expect(r3.expired).toEqual(["dot"]);
    expect(formatStatusFlags(statuses, t0 + 3000)).toBe("");
  });

  it("M2-05: aplica stun, bloqueando tanto movimento quanto ataques/técnicas até expirar", () => {
    const statuses: StatusMap = {};
    const t0 = 4_000_000;

    applyStatus(statuses, { kind: "stun", durationMs: 1500 }, "p_sado", 200, t0);
    expect(canEntityMove(statuses, t0 + 200)).toBe(false);
    expect(canEntityAct(statuses, t0 + 200)).toBe(false);

    tickStatuses(statuses, t0 + 1500);
    expect(canEntityMove(statuses, t0 + 1500)).toBe(true);
    expect(canEntityAct(statuses, t0 + 1500)).toBe(true);
  });

  it("catálogo CHARS configura efeitos de status canônicos em Rukia, Hitsugaya, Renji, Sado, Byakuya e Kenpachi", () => {
    expect(CHARS.rukia.skill.status?.kind).toBe("slow");
    expect(CHARS.rukia.techs[0].status?.kind).toBe("freeze");
    expect(CHARS.rukia.techs[2].status?.kind).toBe("freeze");

    expect(CHARS.hitsugaya.skill.status?.kind).toBe("slow");
    expect(CHARS.hitsugaya.techs[1].status?.kind).toBe("freeze");
    expect(CHARS.hitsugaya.techs[2].status?.kind).toBe("freeze");

    expect(CHARS.renji.techs[2].status?.kind).toBe("dot");
    expect(CHARS.kenpachi.techs[0].status?.kind).toBe("dot");
    expect(CHARS.kenpachi.techs[2].status?.kind).toBe("dot");

    expect(CHARS.sado.techs[1].status?.kind).toBe("stun");
    expect(CHARS.sado.techs[2].status?.kind).toBe("stun");
    expect(CHARS.byakuya.techs[0].status?.kind).toBe("stun");
  });
});
