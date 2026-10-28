import { describe, it, expect } from "vitest";
import {
  expForLevel,
  maxHp,
  maxRei,
  rollDamage,
  playerAtk,
  playerDef,
  chebyshev,
  DEATH_EXP_LOSS,
} from "../src/formulas";

describe("formulas", () => {
  describe("expForLevel", () => {
    it("retorna 0 XP para o nível 1", () => {
      expect(expForLevel(1)).toBe(0);
    });

    it("calcula valores de XP estritamente crescentes para os níveis 1 a 50", () => {
      for (let l = 1; l < 50; l++) {
        expect(expForLevel(l + 1)).toBeGreaterThan(expForLevel(l));
      }
    });

    it("retorna o valor esperado para o nível inicial do jogo (nível 8)", () => {
      // Fórmula Tibia: (50/3) * (8^3 - 6*8^2 + 17*8 - 12) = (50/3) * (512 - 384 + 136 - 12) = (50/3) * 252 = 4200
      expect(expForLevel(8)).toBe(4200);
    });
  });

  describe("maxHp e maxRei", () => {
    it("calcula HP máximo com base de 100 e +15 por nível", () => {
      expect(maxHp(1)).toBe(115);
      expect(maxHp(8)).toBe(220);
      expect(maxHp(20)).toBe(400);
    });

    it("calcula Reiatsu máximo com base de 40 e +8 por nível", () => {
      expect(maxRei(1)).toBe(48);
      expect(maxRei(8)).toBe(104);
      expect(maxRei(20)).toBe(200);
    });
  });

  describe("rollDamage", () => {
    it("sempre retorna pelo menos 1 de dano", () => {
      for (let i = 0; i < 50; i++) {
        const damage = rollDamage(1, 0.1, 9999);
        expect(damage).toBeGreaterThanOrEqual(1);
      }
    });

    it("aplica redução percentual conforme a defesa", () => {
      // Com atk alto e def = 0 vs def = 50:
      // Com def = 50, a fórmula multiplica por 50 / (50 + 50) = 0.5 (metade do dano)
      const dmgNoDef: number[] = [];
      const dmgWithDef: number[] = [];
      for (let i = 0; i < 100; i++) {
        dmgNoDef.push(rollDamage(100, 1, 0));
        dmgWithDef.push(rollDamage(100, 1, 50));
      }
      const avgNoDef = dmgNoDef.reduce((a, b) => a + b) / dmgNoDef.length;
      const avgWithDef = dmgWithDef.reduce((a, b) => a + b) / dmgWithDef.length;

      // O dano médio com 50 de defesa deve ser aproximadamente metade do dano sem defesa
      expect(avgWithDef).toBeLessThan(avgNoDef * 0.7);
    });
  });

  describe("playerAtk e playerDef", () => {
    it("escala o ataque do jogador com nível * 1.2", () => {
      expect(playerAtk(10, 10)).toBe(22);
    });

    it("escala a defesa do jogador com nível * 0.4", () => {
      expect(playerDef(10, 10)).toBe(14);
    });
  });

  describe("chebyshev", () => {
    it("distância para o mesmo ponto é 0", () => {
      expect(chebyshev(5, 5, 5, 5)).toBe(0);
    });

    it("distância em linha reta", () => {
      expect(chebyshev(0, 0, 0, 5)).toBe(5);
      expect(chebyshev(0, 0, 7, 0)).toBe(7);
    });

    it("distância em diagonal pega o maior eixo", () => {
      expect(chebyshev(0, 0, 3, 5)).toBe(5);
      expect(chebyshev(10, 20, 2, 8)).toBe(12);
    });
  });

  describe("constantes", () => {
    it("DEATH_EXP_LOSS é 8% (0.08)", () => {
      expect(DEATH_EXP_LOSS).toBe(0.08);
    });
  });
});
