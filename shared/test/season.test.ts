import { describe, it, expect } from "vitest";
import { xpWeekend, WEEKEND_EXP } from "../src/season";

// Brasília é UTC-3 o ano todo (sem horário de verão desde 2019): 00:00 BRT = 03:00 UTC.
const brt = (iso: string) => Date.parse(`${iso}-03:00`);

describe("xpWeekend (XP em dobro aos sábados e domingos, em Brasília)", () => {
  it("sexta 23:59:59 ainda não vale em dobro", () => {
    expect(xpWeekend(brt("2026-10-30T23:59:59"))).toBe(false);
  });

  it("sábado 00:00:00 já vale em dobro", () => {
    expect(xpWeekend(brt("2026-10-31T00:00:00"))).toBe(true);
  });

  it("domingo 23:59:59 ainda vale em dobro", () => {
    expect(xpWeekend(brt("2026-11-01T23:59:59"))).toBe(true);
  });

  it("segunda 00:00:00 volta ao normal", () => {
    expect(xpWeekend(brt("2026-11-02T00:00:00"))).toBe(false);
  });

  it("dia útil no meio da semana não vale em dobro", () => {
    expect(xpWeekend(brt("2026-11-04T12:00:00"))).toBe(false);
  });

  it("o resultado não depende do fuso do processo", () => {
    // 02:59:59 UTC de segunda é domingo 23:59:59 em Brasília: em qualquer fuso do processo, continua em dobro
    expect(xpWeekend(Date.UTC(2026, 10, 2, 2, 59, 59))).toBe(true);
    expect(xpWeekend(Date.UTC(2026, 10, 2, 3, 0, 0))).toBe(false);
  });

  it("o multiplicador é 2", () => {
    expect(WEEKEND_EXP).toBe(2);
  });
});
