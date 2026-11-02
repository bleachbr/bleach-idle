import { describe, it, expect } from "vitest";
import { skillBlock, skillBlockText, type SkillGateInput } from "../src/skillGate";

// técnica pronta: cada caso muda só o campo que quer bloquear
const ready: SkillGateInput = {
  now: 10_000, canAct: true, arenaCountdown: false, level: 50, minLevel: 1,
  skillReadyAt: 0, techReadyAt: 0, rei: 100, maxRei: 100, cost: 30, auto: false,
  inPZ: false, dist: 2, range: 4,
};

describe("skillBlock: por que a técnica não saiu (#27)", () => {
  it("técnica pronta não tem bloqueio", () => {
    expect(skillBlock(ready)).toBeNull();
  });

  it("recarga devolve o tempo que falta, pela maior das duas travas", () => {
    expect(skillBlock({ ...ready, techReadyAt: 13_200 })).toEqual({ kind: "cooldown", ms: 3200 });
    expect(skillBlock({ ...ready, skillReadyAt: 10_400, techReadyAt: 10_100 })).toEqual({ kind: "cooldown", ms: 400 });
    expect(skillBlock({ ...ready, techReadyAt: 10_000 })).toBeNull(); // vence no instante exato
  });

  it("reiatsu insuficiente devolve quanto precisa e quanto tem", () => {
    expect(skillBlock({ ...ready, rei: 29.6 })).toEqual({ kind: "reiatsu", need: 30, have: 29.6 });
    expect(skillBlock({ ...ready, rei: 30 })).toBeNull();
  });

  it("alvo longe devolve distância e alcance", () => {
    expect(skillBlock({ ...ready, dist: 5 })).toEqual({ kind: "range", dist: 5, range: 4 });
    expect(skillBlock({ ...ready, dist: 4 })).toBeNull();
  });

  it("demais travas: atordoado, contagem da arena, nível, zona de proteção e reserva do Auto Hunt", () => {
    expect(skillBlock({ ...ready, canAct: false })).toEqual({ kind: "stunned" });
    expect(skillBlock({ ...ready, arenaCountdown: true })).toEqual({ kind: "countdown" });
    expect(skillBlock({ ...ready, minLevel: 60 })).toEqual({ kind: "level", min: 60 });
    expect(skillBlock({ ...ready, inPZ: true })).toEqual({ kind: "pz" });
    // 100 - 30 = 70 >= 30% de 100: passa; com 50, sobram 20 e o Auto Hunt guarda
    expect(skillBlock({ ...ready, auto: true })).toBeNull();
    expect(skillBlock({ ...ready, auto: true, rei: 50 })).toEqual({ kind: "reserve" });
    expect(skillBlock({ ...ready, auto: false, rei: 50 })).toBeNull();
  });

  it("mantém a ordem do servidor: recarga vem antes de reiatsu e de alcance", () => {
    expect(skillBlock({ ...ready, techReadyAt: 12_000, rei: 0, dist: 9 })).toEqual({ kind: "cooldown", ms: 2000 });
    expect(skillBlock({ ...ready, rei: 0, dist: 9 })).toMatchObject({ kind: "reiatsu" });
  });
});

describe("skillBlock: curto-circuito barato (#27, Auto Hunt chama até 4 vezes por tick)", () => {
  it("zona de proteção e distância podem vir preguiçosas e só são calculadas quando chegam a vez", () => {
    let calls = 0;
    const lazy = { inPZ: () => (calls++, false), dist: () => (calls++, 2) };
    expect(skillBlock({ ...ready, ...lazy, techReadyAt: 12_000 })).toEqual({ kind: "cooldown", ms: 2000 });
    expect(skillBlock({ ...ready, ...lazy, rei: 0 })).toMatchObject({ kind: "reiatsu" });
    expect(calls).toBe(0);
    expect(skillBlock({ ...ready, ...lazy })).toBeNull();
    expect(calls).toBe(2);
    expect(skillBlock({ ...ready, inPZ: () => true, dist: () => 9 })).toEqual({ kind: "pz" });
    expect(skillBlock({ ...ready, dist: () => 9 })).toEqual({ kind: "range", dist: 9, range: 4 });
  });
});

describe("skillBlockText: mensagem do chat", () => {
  it("cada causa tem texto próprio, sem a mensagem genérica", () => {
    expect(skillBlockText("Getsuga Tenshō", { kind: "cooldown", ms: 3200 })).toBe("Getsuga Tenshō em recarga (restam 4s).");
    expect(skillBlockText("Getsuga Tenshō", { kind: "cooldown", ms: 400 })).toBe("Getsuga Tenshō em recarga (restam 1s).");
    expect(skillBlockText("Mugetsu", { kind: "reiatsu", need: 30, have: 29.6 })).toBe("Reiatsu insuficiente para Mugetsu (precisa 30, tem 29).");
    expect(skillBlockText("Mugetsu", { kind: "range", dist: 5, range: 4 })).toBe("Alvo fora de alcance de Mugetsu (distância 5, alcance 4).");
    for (const b of [{ kind: "stunned" }, { kind: "countdown" }, { kind: "level", min: 60 }, { kind: "pz" }, { kind: "reserve" }] as const) {
      const txt = skillBlockText("X", b);
      expect(txt).not.toMatch(/recarga, reiatsu ou alcance/);
      expect(txt.length).toBeGreaterThan(3);
    }
  });
});
