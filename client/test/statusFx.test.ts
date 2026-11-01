import { describe, it, expect } from "vitest";
import { parseStatusFlags, statusTint, desiredTint, STATUS_LOOK, STATUS_KINDS, dotHitStyle } from "../src/statusFx";
import { applyStatus, formatStatusFlags, type StatusMap } from "../../shared/src/combatStatus";

describe("contrato com o servidor", () => {
  it("o cliente lê na mesma ordem em que o servidor escreve statusFlags", () => {
    const st: StatusMap = {};
    for (const kind of ["dot", "slow", "stun", "freeze"] as const) applyStatus(st, { kind, durationMs: 1000 }, "x", 10, 0);
    const flags = formatStatusFlags(st, 500);
    expect(parseStatusFlags(flags)).toEqual([...STATUS_KINDS]);
    expect(flags).toBe(STATUS_KINDS.join(","));
  });

  it("todo status do servidor tem visual", () => {
    expect(Object.keys(STATUS_LOOK).sort()).toEqual([...STATUS_KINDS].sort());
  });
});

describe("parseStatusFlags (statusFlags do servidor)", () => {
  it("lê a lista separada por vírgula na ordem de prioridade", () => {
    expect(parseStatusFlags("dot,freeze")).toEqual(["freeze", "dot"]);
    expect(parseStatusFlags("slow,stun,dot,freeze")).toEqual(["freeze", "stun", "slow", "dot"]);
  });

  it("vazio, repetido, desconhecido ou que não é texto vira lista sem lixo", () => {
    expect(parseStatusFlags("")).toEqual([]);
    expect(parseStatusFlags(undefined)).toEqual([]);
    expect(parseStatusFlags(42)).toEqual([]);
    expect(parseStatusFlags("freeze,freeze")).toEqual(["freeze"]);
    expect(parseStatusFlags("__proto__,constructor,slow")).toEqual(["slow"]);
  });
});

describe("statusTint (cor no sprite)", () => {
  it("sem status não pinta", () => {
    expect(statusTint([])).toBeUndefined();
  });

  it("vale a cor do status mais forte: congelado e atordoado vencem lento e dano contínuo", () => {
    expect(statusTint(["freeze", "dot"])).toBe(STATUS_LOOK.freeze.tint);
    expect(statusTint(parseStatusFlags("dot,stun"))).toBe(STATUS_LOOK.stun.tint);
    expect(statusTint(["slow"])).toBe(STATUS_LOOK.slow.tint);
  });

  it("cada status tem cor, rótulo e cor de texto próprios", () => {
    const tints = Object.values(STATUS_LOOK).map((l) => l.tint);
    expect(new Set(tints).size).toBe(tints.length);
    for (const l of Object.values(STATUS_LOOK)) {
      expect(l.label).not.toBe("");
      expect(l.text).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("desiredTint: status vence a cor da forma; sem nenhum dos dois, branco (sem tint)", () => {
    expect(desiredTint(["dot"], 0x123456)).toBe(STATUS_LOOK.dot.tint);
    expect(desiredTint([], 0x123456)).toBe(0x123456);
    expect(desiredTint([], undefined)).toBe(0xffffff);
    // quando o status acaba, volta à cor da forma, e não fica preso na cor do status
    expect(desiredTint(parseStatusFlags(""), 0x123456)).toBe(0x123456);
  });
});

describe("dotHitStyle (número do dano contínuo)", () => {
  it("só o dano marcado como contínuo ganha o estilo próprio", () => {
    expect(dotHitStyle({ dot: true, v: 12 })).toEqual({ text: "12", color: STATUS_LOOK.dot.text });
    expect(dotHitStyle({ v: 12 })).toBeUndefined();
    expect(dotHitStyle({ dot: true })).toBeUndefined();
    expect(dotHitStyle({ dot: true, v: 0 })).toBeUndefined();
  });
});
