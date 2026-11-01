import { describe, it, expect } from "vitest";
import { EVENT_BANNER, EVENT_LORE, eventLore, type EventPhase } from "../src/events";
import { MONSTERS } from "../src/data";
import { WORLD_BOSS } from "../src/season";

const PHASES = Object.keys(EVENT_BANNER) as EventPhase[];

describe("catálogo dos eventos narrados", () => {
  it("toda fase tem banner com título e subtítulo e pelo menos uma linha de lore", () => {
    expect(PHASES.sort()).toEqual((Object.keys(EVENT_LORE) as EventPhase[]).sort());
    for (const p of PHASES) {
      expect(EVENT_BANNER[p].title, p).not.toBe("");
      expect(EVENT_BANNER[p].text, p).not.toBe("");
      expect(EVENT_LORE[p].length, p).toBeGreaterThan(0);
      for (const line of EVENT_LORE[p]) expect(line.trim(), p).not.toBe("");
    }
  });

  it("as fases de cada evento são as esperadas", () => {
    const of = (k: string) => PHASES.filter((p) => EVENT_BANNER[p].kind === k).sort();
    expect(of("invasion")).toEqual(["invLost", "invStart", "invWon"]);
    expect(of("worldBoss")).toEqual(["bossGone", "bossKilled", "bossSpawn", "bossWarn"]);
  });

  it("só as fases em andamento mostram contagem regressiva", () => {
    expect(PHASES.filter((p) => EVENT_BANNER[p].clock).sort()).toEqual(["bossSpawn", "bossWarn", "invStart"]);
  });

  it("os textos do chefe mundial citam o chefe que de fato aparece", () => {
    // EVENT_BANNER e EVENT_LORE escrevem o nome à mão: se WORLD_BOSS.kind mudar, os textos precisam mudar junto
    const name = MONSTERS[WORLD_BOSS.kind].name;
    expect(name).toBe("Menos Ancião");
    expect(EVENT_BANNER.bossSpawn.text).toContain(name);
    expect(EVENT_BANNER.bossKilled.title).toContain(name);
    expect(EVENT_BANNER.bossGone.title).toContain(name);
  });
});

describe("eventLore (rodízio das linhas)", () => {
  it("segue a ordem do catálogo e volta ao começo", () => {
    const lines = EVENT_LORE.invStart;
    expect(lines.length).toBeGreaterThan(1);
    lines.forEach((l, i) => expect(eventLore("invStart", i)).toBe(l));
    expect(eventLore("invStart", lines.length)).toBe(lines[0]);
    expect(eventLore("invStart", lines.length + 1)).toBe(lines[1]);
  });

  it("contador inválido cai na primeira linha, e negativo não quebra", () => {
    expect(eventLore("bossSpawn", Number.NaN)).toBe(EVENT_LORE.bossSpawn[0]);
    expect(eventLore("bossSpawn", 1.5)).toBe(EVENT_LORE.bossSpawn[0]);
    expect(eventLore("bossSpawn", -1)).toBe(EVENT_LORE.bossSpawn[EVENT_LORE.bossSpawn.length - 1]);
  });
});
