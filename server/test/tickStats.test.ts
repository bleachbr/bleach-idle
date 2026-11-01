import { describe, it, expect, beforeEach, vi } from "vitest";
import { recordTick, getTickStats, resetTickStats, WARN_TICK_MS } from "../src/tickStats";

describe("tickStats (F-08)", () => {
  beforeEach(() => {
    resetTickStats();
  });

  it("acumula amostras de duração do tick e calcula p50, p95 e máximo", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const ms of [1.2, 2.4, 1.8, 3.0, 2.0]) recordTick(ms, 1000);

    const st = getTickStats();
    expect(st.ticks).toBe(5);
    expect(st.slowTicks).toBe(0);
    expect(st.lastMs).toBe(2.0);
    expect(st.p50Ms).toBe(2.0);
    expect(st.maxMs).toBe(3.0);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("emite aviso quando o tick ultrapassa 50 ms e respeita intervalo de silêncio", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    recordTick(WARN_TICK_MS + 12.5, 10_000);
    // Segundo tick lento logo em seguida (mesmo segundo) conta em slowTicks mas não inunda o log
    recordTick(WARN_TICK_MS + 25.0, 10_100);
    // Passados 10 s, avisa novamente
    recordTick(WARN_TICK_MS + 5.0, 20_500);

    const st = getTickStats();
    expect(st.ticks).toBe(3);
    expect(st.slowTicks).toBe(3);
    expect(st.maxMs).toBe(75.0);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toContain("[tick]");
    warn.mockRestore();
  });
});

