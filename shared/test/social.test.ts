import { describe, it, expect } from "vitest";
import {
  PARTY_MAX,
  PARTY_SHARE_RANGE,
  PARTY_SHARE_BONUS,
  PARTY_LEVEL_RATIO,
  PVP_MIN_LEVEL,
  PVP_DAMAGE,
  TRAVEL,
} from "../src/social";
import { MAP_IDS } from "../src/map";

describe("social rules", () => {
  describe("party", () => {
    it("limite de membros da party é 4", () => {
      expect(PARTY_MAX).toBe(4);
    });

    it("alcance máximo para divisão de XP é 12 tiles", () => {
      expect(PARTY_SHARE_RANGE).toBe(12);
    });

    it("valida a regra do Tibia dos 2/3 para divisão de XP", () => {
      // Menor nível precisa ser >= 2/3 do maior
      const canShare = (minLvl: number, maxLvl: number) => minLvl >= maxLvl * PARTY_LEVEL_RATIO;

      expect(canShare(20, 30)).toBe(true); // 20 >= 30 * 2/3 (20)
      expect(canShare(19, 30)).toBe(false); // 19 < 20
      expect(canShare(10, 15)).toBe(true);
      expect(canShare(8, 15)).toBe(false); // 8 < 10
    });

    it("bônus por membro extra é de 10%", () => {
      expect(PARTY_SHARE_BONUS).toBe(0.1);
    });
  });

  describe("pvp", () => {
    it("nível mínimo de PvP é 10", () => {
      expect(PVP_MIN_LEVEL).toBe(10);
    });

    it("redução de dano em PvP é 50%", () => {
      expect(PVP_DAMAGE).toBe(0.5);
    });
  });

  describe("viagem (Senkaimon/Garganta)", () => {
    it("todos os destinos possuem nome, mapa existente e custo válido", () => {
      for (const dest of TRAVEL) {
        expect(dest.id).toBeTruthy();
        expect(dest.name).toBeTruthy();
        expect(MAP_IDS).toContain(dest.map);
        expect(dest.cost).toBeGreaterThanOrEqual(0);
        expect(dest.minLevel).toBeGreaterThanOrEqual(1);
      }
    });

    it("viagem para Hueco Mundo exige nível 22 e custa 200 kan", () => {
      const hueco = TRAVEL.find((t) => t.id === "hueco");
      expect(hueco).toBeDefined();
      expect(hueco?.minLevel).toBe(22);
      expect(hueco?.cost).toBe(200);
    });
  });
});
