import { describe, it, expect } from "vitest";
import {
  calculateEloChange,
  getArenaTier,
  matchmakingTolerance,
  validateStepInterval,
  DEFAULT_ARENA_RATING,
} from "../src/arena";

describe("W-01: Arena de duelos 1v1 ranqueada (fórmulas e integridade)", () => {
  it("inicia jogadores com rating padrão de 1000 pontos", () => {
    expect(DEFAULT_ARENA_RATING).toBe(1000);
    expect(getArenaTier(DEFAULT_ARENA_RATING).id).toBe("bronze");
  });

  it("calcula variação de Elo simétrica para jogadores de mesmo nível", () => {
    const win = calculateEloChange(1000, 1000, "win");
    expect(win.playerDelta).toBe(16);
    expect(win.opponentDelta).toBe(-16);

    const loss = calculateEloChange(1000, 1000, "loss");
    expect(loss.playerDelta).toBe(-16);
    expect(loss.opponentDelta).toBe(16);

    const draw = calculateEloChange(1000, 1000, "draw");
    expect(draw.playerDelta).toBe(0);
    expect(draw.opponentDelta).toBe(0);
  });

  it("concede maior recompensa ao azarão ao derrotar um favorito", () => {
    const upset = calculateEloChange(1000, 1400, "win");
    expect(upset.playerDelta).toBeGreaterThanOrEqual(28);
    expect(upset.opponentDelta).toBe(-upset.playerDelta);

    const expected = calculateEloChange(1400, 1000, "win");
    expect(expected.playerDelta).toBeLessThanOrEqual(4);
    expect(expected.opponentDelta).toBe(-expected.playerDelta);
  });

  it("classifica tiers competitivos por faixas de pontuação", () => {
    expect(getArenaTier(900).id).toBe("bronze");
    expect(getArenaTier(1150).id).toBe("bronze");
    expect(getArenaTier(1250).id).toBe("prata");
    expect(getArenaTier(1450).id).toBe("ouro");
    expect(getArenaTier(1650).id).toBe("platina");
    expect(getArenaTier(1850).id).toBe("diamante");
    expect(getArenaTier(2100).id).toBe("capitao");
  });

  it("expande a janela de tolerância de pareamento com o tempo de fila", () => {
    expect(matchmakingTolerance(0)).toBe(100);
    expect(matchmakingTolerance(5_000)).toBe(100);
    expect(matchmakingTolerance(10_000)).toBe(150);
    expect(matchmakingTolerance(25_000)).toBe(200);
    expect(matchmakingTolerance(120_000)).toBe(500); // capped em 500
  });

  it("anti-cheat de velocidade valida intervalo mínimo entre passos", () => {
    const stepMs = 300;
    const t0 = 1_000_000;

    // Tentativa rápida demais (hack de velocidade / teleporte): rejeitada
    expect(validateStepInterval(t0, t0 + 150, stepMs)).toBe(false);

    // Passo no tempo correto ou superior: aceito
    expect(validateStepInterval(t0, t0 + 300, stepMs)).toBe(true);
    expect(validateStepInterval(t0, t0 + 450, stepMs)).toBe(true);
  });
});
