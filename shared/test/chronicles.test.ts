import { describe, expect, it } from "vitest";
import {
  CHRONICLES,
  CHRONICLE_EPOCH,
  COSMETIC,
  ITEMS,
  MONSTERS,
  MS_PER_WEEK,
  TOTAL_CRONICAS,
  activeChronicle,
  currentWeekKey,
  syncChronicleProgress,
  titleText,
  weekIndex,
  weekNumber,
  newProgress,
} from "../src";

describe("M1-01 & M1-05: rotação semanal e persistência de Crônicas (ADR-002)", () => {
  it("calcula weekNumber, weekIndex e currentWeekKey exatamente na virada de segunda 00:00 BRT", () => {
    // 1 ms antes da âncora (domingo 25/10/2026 23:59:59.999 BRT)
    expect(weekNumber(CHRONICLE_EPOCH - 1)).toBe(-1);
    expect(weekIndex(CHRONICLE_EPOCH - 1)).toBe(4);
    expect(currentWeekKey(CHRONICLE_EPOCH - 1)).toBe("w-1");

    // Exatamente na âncora (segunda 26/10/2026 00:00:00.000 BRT)
    expect(weekNumber(CHRONICLE_EPOCH)).toBe(0);
    expect(weekIndex(CHRONICLE_EPOCH)).toBe(0);
    expect(currentWeekKey(CHRONICLE_EPOCH)).toBe("w0");

    // Fim da primeira semana (domingo 01/11/2026 23:59:59.999 BRT)
    expect(weekNumber(CHRONICLE_EPOCH + MS_PER_WEEK - 1)).toBe(0);
    expect(weekIndex(CHRONICLE_EPOCH + MS_PER_WEEK - 1)).toBe(0);
    expect(currentWeekKey(CHRONICLE_EPOCH + MS_PER_WEEK - 1)).toBe("w0");

    // Início da segunda semana (segunda 02/11/2026 00:00:00.000 BRT)
    expect(weekNumber(CHRONICLE_EPOCH + MS_PER_WEEK)).toBe(1);
    expect(weekIndex(CHRONICLE_EPOCH + MS_PER_WEEK)).toBe(1);
    expect(currentWeekKey(CHRONICLE_EPOCH + MS_PER_WEEK)).toBe("w1");
  });

  it("rotaciona ciclicamente pelas 5 crônicas inclusive para datas anteriores à âncora", () => {
    expect(TOTAL_CRONICAS).toBe(5);
    for (let w = 0; w < 12; w++) {
      const ts = CHRONICLE_EPOCH + w * MS_PER_WEEK + 123_456;
      expect(weekNumber(ts)).toBe(w);
      expect(weekIndex(ts)).toBe(w % 5);
      expect(currentWeekKey(ts)).toBe(`w${w}`);
    }
    expect(weekIndex(CHRONICLE_EPOCH - 5 * MS_PER_WEEK)).toBe(0);
    expect(weekIndex(CHRONICLE_EPOCH - 2 * MS_PER_WEEK)).toBe(3);
  });

  it("produz resultados idênticos sob diferentes fusos horários (TZ) do processo", () => {
    const oldTz = process.env.TZ;
    const instants = [
      CHRONICLE_EPOCH - 1000,
      CHRONICLE_EPOCH,
      CHRONICLE_EPOCH + MS_PER_WEEK - 1,
      CHRONICLE_EPOCH + MS_PER_WEEK,
      Date.UTC(2027, 0, 1, 2, 59, 59),
      Date.UTC(2027, 0, 1, 3, 0, 0),
    ];
    const zones = ["UTC", "America/Sao_Paulo", "Asia/Tokyo", "America/Los_Angeles", "Pacific/Kiritimati"];
    try {
      const baseline = instants.map((ms) => ({
        wn: weekNumber(ms),
        wi: weekIndex(ms),
        wk: currentWeekKey(ms),
      }));
      for (const tz of zones) {
        process.env.TZ = tz;
        const current = instants.map((ms) => ({
          wn: weekNumber(ms),
          wi: weekIndex(ms),
          wk: currentWeekKey(ms),
        }));
        expect(current).toEqual(baseline);
      }
    } finally {
      if (oldTz === undefined) delete process.env.TZ;
      else process.env.TZ = oldTz;
    }
  });

  it("inicializa Progress.chronicle em newProgress() e zera questKills/completedAt na virada de semana (M1-05)", () => {
    const prog = newProgress();
    expect(prog.chronicle).toEqual({ activeWeekKey: "", questKills: 0 });

    // Primeira sincronização na semana 0
    const c0 = syncChronicleProgress(prog, CHRONICLE_EPOCH + 1000);
    expect(c0).toEqual({ activeWeekKey: "w0", questKills: 0 });

    // Jogador avança e conclui na semana 0
    c0.questKills = 50;
    c0.completedAt = CHRONICLE_EPOCH + 50_000;

    // Ainda na semana 0: mantém o progresso e completedAt
    const stillW0 = syncChronicleProgress(prog, CHRONICLE_EPOCH + MS_PER_WEEK - 1);
    expect(stillW0.activeWeekKey).toBe("w0");
    expect(stillW0.questKills).toBe(50);
    expect(stillW0.completedAt).toBe(CHRONICLE_EPOCH + 50_000);

    // Virou para a semana 1: zera questKills e remove completedAt
    const c1 = syncChronicleProgress(prog, CHRONICLE_EPOCH + MS_PER_WEEK);
    expect(c1).toEqual({ activeWeekKey: "w1", questKills: 0 });
    expect(c1.completedAt).toBeUndefined();
  });

  it("define o catálogo completo das 5 crônicas semanais com monstros, itens e títulos válidos (M1-08)", () => {
    expect(CHRONICLES).toHaveLength(TOTAL_CRONICAS);
    const ids = new Set<string>();
    for (let i = 0; i < TOTAL_CRONICAS; i++) {
      const c = activeChronicle(CHRONICLE_EPOCH + i * MS_PER_WEEK);
      expect(c).toBe(CHRONICLES[i]);
      expect(ids.has(c.id)).toBe(false);
      ids.add(c.id);
      expect(c.title.length).toBeGreaterThan(5);
      expect(c.badge).toMatch(/^\[CRÔNICA SEMANAL:/);
      expect(c.pages.length).toBeGreaterThanOrEqual(3);
      expect(c.quest.name.length).toBeGreaterThan(3);
      expect(c.quest.kills).toBeGreaterThan(0);
      expect(c.quest.monsters.length).toBeGreaterThan(0);
      for (const m of c.quest.monsters) {
        expect(MONSTERS[m]).toBeDefined();
      }
      for (const req of c.quest.items ?? []) {
        expect(ITEMS[req.id]).toBeDefined();
        expect(req.qty).toBeGreaterThan(0);
      }
      expect(c.reward.gold).toBeGreaterThan(0);
      expect(c.reward.crystals).toBeGreaterThanOrEqual(15);
      expect(c.reward.crystals).toBeLessThanOrEqual(30);
      for (const it of c.reward.items) {
        expect(ITEMS[it.id]).toBeDefined();
        expect(it.qty).toBeGreaterThan(0);
      }
      expect(COSMETIC[c.reward.titleId]).toBeDefined();
      expect(COSMETIC[c.reward.titleId].kind).toBe("title");
      expect(COSMETIC[c.reward.titleId].season).toBe(true);
      expect(titleText(c.reward.titleId).length).toBeGreaterThan(3);
    }
  });
});
