import { describe, it, expect } from "vitest";
import { createMinimapPing, isPingActive, pingPulseRadius } from "../src/minimapPing";

describe("F-25: Feedback de navegação e rota no minimapa (#68, #70, #194, #195)", () => {
  it("cria um ping com coordenadas e expiração", () => {
    const ping = createMinimapPing(15, 25, 1000, 2000);
    expect(ping.x).toBe(15);
    expect(ping.y).toBe(25);
    expect(ping.until).toBe(3000);
  });

  it("permanece ativo enquanto o jogador não atinge o destino e não expira", () => {
    const ping = createMinimapPing(10, 20, 1000, 2000);
    expect(isPingActive(ping, 5, 5, 1500)).toBe(true);
  });

  it("desativa imediatamente quando o jogador atinge as coordenadas de destino", () => {
    const ping = createMinimapPing(10, 20, 1000, 2000);
    expect(isPingActive(ping, 10, 20, 1500)).toBe(false);
  });

  it("desativa quando o tempo expira", () => {
    const ping = createMinimapPing(10, 20, 1000, 2000);
    expect(isPingActive(ping, 5, 5, 3001)).toBe(false);
  });

  it("calcula raio de pulso oscilante para animação visual", () => {
    const ping = createMinimapPing(10, 20, 1000, 2000);
    const r1 = pingPulseRadius(ping, 1000, 6);
    const r2 = pingPulseRadius(ping, 1250, 6);
    expect(r1).toBeGreaterThanOrEqual(6);
    expect(r2).toBeGreaterThanOrEqual(6);
    expect(r1).not.toBe(r2);
  });
});
