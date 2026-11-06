import { describe, expect, it } from "vitest";
import { FrameGate, STALL_MS, fxSound } from "../src/fxBackground";

describe("FrameGate", () => {
  const gate = (start = 0) => {
    const env = { t: start, hidden: false };
    return { env, g: new FrameGate(() => env.t, () => env.hidden) };
  };

  it("com quadros em dia, os efeitos visuais seguem", () => {
    const { env, g } = gate();
    env.t = 16;
    g.frame();
    expect(g.stalled()).toBe(false);
  });

  it("aba oculta para os efeitos na hora, mesmo com quadro recente", () => {
    const { env, g } = gate();
    env.hidden = true;
    expect(g.stalled()).toBe(true);
  });

  it("sem quadro além do limite para, mesmo com a aba dita visível", () => {
    const { env, g } = gate();
    env.t = STALL_MS;
    expect(g.stalled()).toBe(false);
    env.t = STALL_MS + 1;
    expect(g.stalled()).toBe(true);
  });

  it("ao voltar, só libera depois do primeiro quadro", () => {
    const { env, g } = gate();
    env.hidden = true;
    env.t = 60_000;
    env.hidden = false;
    expect(g.stalled()).toBe(true);
    g.frame();
    expect(g.stalled()).toBe(false);
  });
});

describe("fxSound", () => {
  const ME = "eu", TARGET = "alvo";
  const sound = (fx: Parameters<typeof fxSound>[0]) => fxSound(fx, ME, TARGET);

  it("dano em mim, no meu alvo e em terceiros", () => {
    expect(sound({ t: "dmg", id: ME, v: 5 })).toBe("hurt");
    expect(sound({ t: "dmg", id: TARGET, v: 5 })).toBe("hit");
    expect(sound({ t: "dmg", id: "outro", v: 5 })).toBeUndefined();
  });

  it("errou e dano contínuo não tocam", () => {
    expect(sound({ t: "dmg", id: ME, v: 0 })).toBeUndefined();
    expect(sound({ t: "dmg", id: ME, v: 5, dot: true })).toBeUndefined();
  });

  it("morte só do meu alvo; sem alvo, efeito sem id não conta como alvo", () => {
    expect(sound({ t: "die", id: TARGET })).toBe("die");
    expect(sound({ t: "die", id: "outro" })).toBeUndefined();
    expect(fxSound({ t: "die" }, ME, undefined)).toBeUndefined();
  });

  it("efeitos só meus", () => {
    for (const [t, name] of [["loot", "loot"], ["heal", "heal"], ["deny", "deny"], ["level", "level"]] as const) {
      expect(sound({ t, id: ME })).toBe(name);
      expect(sound({ t, id: "outro" })).toBeUndefined();
    }
  });

  it("forma: som só ao subir de estágio", () => {
    expect(sound({ t: "form", id: ME, v: 2 })).toBe("bankai");
    expect(sound({ t: "form", id: ME, v: 0 })).toBeUndefined();
  });

  it("técnica é de quem usou, avisos tocam sempre", () => {
    expect(sound({ t: "skill", from: ME })).toBe("skill");
    expect(sound({ t: "skill", from: "outro" })).toBeUndefined();
    expect(sound({ t: "book" })).toBe("chime");
    expect(sound({ t: "event" })).toBe("event");
  });
});
