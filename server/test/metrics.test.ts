import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AddressInfo } from "node:net";
import { createHttpServer } from "../src/http.js";
import { resetTickStats, recordTick } from "../src/tickStats.js";
import {
  recordSave,
  getSaveStats,
  resetSaveStats,
  setWorldMetricsProvider,
  getOperationalMetrics,
  WARN_SAVE_MS,
} from "../src/metrics.js";

describe("Métricas de operação /metrics (W-09)", () => {
  beforeEach(() => {
    resetTickStats();
    resetSaveStats();
    setWorldMetricsProvider(null);
  });

  it("contabiliza saves, emite aviso acima de 50 ms e dispara alerta mínimo quando tick ou save ficam lentos", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      recordTick(8, 1_000);
      recordSave(4.5, 12, 1_000);
      setWorldMetricsProvider(() => ({
        players: { online: 3, offlineHunt: 2, totalInWorld: 5 },
        entities: { monsters: 176, bags: 1 },
      }));

      const okSnap = getOperationalMetrics(10);
      expect(okSnap.alert).toBe(false);
      expect(okSnap.alerts).toEqual([]);
      expect(okSnap.saves).toEqual({
        saves: 1,
        savedChars: 12,
        slowSaves: 0,
        lastMs: 4.5,
        maxMs: 4.5,
      });
      expect(okSnap.players).toEqual({ online: 3, offlineHunt: 2, totalInWorld: 5 });
      expect(okSnap.entities).toEqual({ monsters: 176, bags: 1 });

      // Simula save lento (> WARN_SAVE_MS) e tick lento
      recordSave(WARN_SAVE_MS + 15, 200, 10_000);
      recordTick(62, 10_000);
      expect(warn).toHaveBeenCalled();

      const alertSnap = getOperationalMetrics(20);
      expect(alertSnap.alert).toBe(true);
      expect(alertSnap.alerts).toContain("tick_lento");
      expect(alertSnap.alerts).toContain("save_lento");
      expect(getSaveStats().slowSaves).toBe(1);
    } finally {
      warn.mockRestore();
    }
  });

  it("expõe GET /metrics no servidor HTTP com cabeçalhos de segurança e cache-control no-store", async () => {
    recordTick(5, 1_000);
    recordSave(2.1, 4, 1_000);
    setWorldMetricsProvider(() => ({
      players: { online: 1, offlineHunt: 0, totalInWorld: 1 },
      entities: { monsters: 176, bags: 0 },
    }));

    const srv = createHttpServer(() => getOperationalMetrics(42));
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
    const port = (srv.address() as AddressInfo).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/metrics`);
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.alert).toBe(false);
      expect(body.uptimeS).toBe(42);
      expect(body.tick.ticks).toBe(1);
      expect(body.saves.saves).toBe(1);
      expect(body.players.online).toBe(1);
      expect(body.entities.monsters).toBe(176);
    } finally {
      await new Promise<void>((resolve) => srv.close(() => resolve()));
    }
  });
});
