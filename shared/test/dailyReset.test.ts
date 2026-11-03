import { describe, it, expect } from "vitest";
import { nextDailyReset, dailyResetRemainingMs } from "../src/progress";

// Brasília é UTC-3 o ano todo: 00:00 BRT = 03:00 UTC.
const brt = (iso: string) => Date.parse(`${iso}-03:00`);

describe("nextDailyReset e dailyResetRemainingMs (meia-noite de Brasília)", () => {
  it("meio do dia: calcula a próxima meia-noite corretamente", () => {
    const now = brt("2026-11-03T15:30:00");
    const expected = brt("2026-11-04T00:00:00");
    expect(nextDailyReset(now)).toBe(expected);
    // 8 horas e 30 minutos restantes (15:30 -> 24:00)
    expect(dailyResetRemainingMs(now)).toBe((8 * 60 + 30) * 60_000);
  });

  it("1 segundo antes da meia-noite: falta 1000ms para virar o dia", () => {
    const now = brt("2026-11-03T23:59:59");
    const expected = brt("2026-11-04T00:00:00");
    expect(nextDailyReset(now)).toBe(expected);
    expect(dailyResetRemainingMs(now)).toBe(1000);
  });

  it("exatamente à meia-noite: aponta para a meia-noite do dia seguinte (24h)", () => {
    const now = brt("2026-11-04T00:00:00");
    const expected = brt("2026-11-05T00:00:00");
    expect(nextDailyReset(now)).toBe(expected);
    expect(dailyResetRemainingMs(now)).toBe(24 * 3600_000);
  });

  it("virada de mês no fuso de Brasília", () => {
    const now = brt("2026-11-30T22:00:00");
    const expected = brt("2026-12-01T00:00:00");
    expect(nextDailyReset(now)).toBe(expected);
    expect(dailyResetRemainingMs(now)).toBe(2 * 3600_000);
  });
});
