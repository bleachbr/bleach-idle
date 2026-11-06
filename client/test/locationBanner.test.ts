import { describe, it, expect, beforeEach } from "vitest";
import { getSectorAt, LocationTracker } from "../src/locationBanner";

describe("Location Banner HUD & Descoberta de Setores", () => {
  let tracker: LocationTracker;

  beforeEach(() => {
    tracker = new LocationTracker();
  });

  describe("Setores Canônicos de Karakura Expandida", () => {
    it("detecta 'Karakura - Distrito Residencial' (Setor 1: Clínica Kurosaki & Ruas Pacatas)", () => {
      // Coordenadas da Clínica Kurosaki e ruas pacatas (x: 10, y: 8)
      const sector = getSectorAt("karakura", 10, 8);
      expect(sector.name).toBe("Karakura - Distrito Residencial");
      expect(sector.subtitle).toContain("Clínica Kurosaki");
      expect(sector.id).toBe("karakura-residential");
    });

    it("detecta 'Karakura - Bosque do Urahara' (Setor 2: Loja Urahara & Campo de Treinamento)", () => {
      // Coordenadas no quadrante comercial/treinamento (x: 35, y: 8)
      const sector = getSectorAt("karakura", 35, 8);
      expect(sector.name).toBe("Karakura - Bosque do Urahara");
      expect(sector.subtitle).toContain("Loja de Conveniência");
      expect(sector.id).toBe("karakura-urahara");
    });

    it("detecta 'Karakura - Margem do Rio Onagawa' (Setor 3: Águas Cristalinas & Travessia da Ponte)", () => {
      // Parque Beira-Rio Onagawa e travessia das pontes (x: 20, y: 30)
      const sector1 = getSectorAt("karakura", 20, 30);
      expect(sector1.name).toBe("Karakura - Margem do Rio Onagawa");
      expect(sector1.subtitle).toContain("Águas Cristalinas");
      expect(sector1.id).toBe("karakura-river");

      // Margem inferior do rio (x: 15, y: 40)
      const sector2 = getSectorAt("karakura", 15, 40);
      expect(sector2.name).toBe("Karakura - Margem do Rio Onagawa");
    });

    it("detecta 'Karakura - Zona Industrial' (Setor 4: Ruínas Fabris & Ninho dos Predadores)", () => {
      // Galpões industriais no quadrante sudeste (x: 50, y: 35)
      const sector = getSectorAt("karakura", 50, 35);
      expect(sector.name).toBe("Karakura - Zona Industrial");
      expect(sector.subtitle).toContain("Ruínas Fabris");
      expect(sector.id).toBe("karakura-industrial");
    });
  });

  describe("Setores de Outros Reinos", () => {
    it("identifica 'Soul Society - Seireitei'", () => {
      const sector = getSectorAt("soul", 20, 20);
      expect(sector.name).toBe("Soul Society - Seireitei");
      expect(sector.subtitle).toContain("Seireitei");
      expect(sector.id).toBe("soul-seireitei");
    });

    it("identifica 'Hueco Mundo - Deserto Branco'", () => {
      const sector = getSectorAt("hueco", 15, 15);
      expect(sector.name).toBe("Hueco Mundo - Deserto Branco");
      expect(sector.id).toBe("hueco-desert");
    });

    it("identifica 'Las Noches - Palácio Imperial'", () => {
      const sector = getSectorAt("lasnoches", 12, 12);
      expect(sector.name).toBe("Las Noches - Palácio Imperial");
      expect(sector.id).toBe("lasnoches-palace");
    });

    it("identifica 'Dangai - Precipício Temporal'", () => {
      const sector = getSectorAt("dangai", 10, 10);
      expect(sector.name).toBe("Dangai - Precipício Temporal");
      expect(sector.id).toBe("dangai-corridor");
    });

    it("identifica 'Cidade Falsa de Karakura'", () => {
      const sector = getSectorAt("falsa", 30, 20);
      expect(sector.name).toBe("Cidade Falsa de Karakura");
      expect(sector.id).toBe("falsa-karakura");
    });

    it("identifica 'Wandenreich - Silbern'", () => {
      const sector = getSectorAt("wandenreich", 24, 24);
      expect(sector.name).toBe("Wandenreich - Silbern");
      expect(sector.id).toBe("wandenreich-silbern");
    });

    it("gera fallback elegante para mapas desconhecidos", () => {
      const sector = getSectorAt("mapa_inexistente", 5, 5);
      expect(sector.name).toBe("Mapa_inexistente");
      expect(sector.subtitle).toBe("Região Desconhecida");
    });
  });

  describe("LocationTracker (Gerenciador de Notificação)", () => {
    it("dispara notificação na primeira leitura da posição", () => {
      const res = tracker.update("karakura", 10, 8, 1000);
      expect(res).not.toBeNull();
      expect(res?.changed).toBe(true);
      expect(res?.sector.name).toBe("Karakura - Distrito Residencial");
      expect(tracker.currentSector).toBe("karakura-residential");
    });

    it("não dispara novamente enquanto o jogador permanecer no mesmo setor", () => {
      tracker.update("karakura", 10, 8, 1000);
      // Andando alguns tiles dentro do Distrito Residencial
      const res2 = tracker.update("karakura", 12, 9, 1500);
      expect(res2).toBeNull();
    });

    it("dispara nova notificação ao atravessar fronteira para o Bosque do Urahara", () => {
      tracker.update("karakura", 10, 8, 1000); // Distrito Residencial
      // Caminhando para a área comercial/Urahara
      const res = tracker.update("karakura", 35, 8, 2500);
      expect(res).not.toBeNull();
      expect(res?.changed).toBe(true);
      expect(res?.sector.name).toBe("Karakura - Bosque do Urahara");
      expect(tracker.currentSector).toBe("karakura-urahara");
    });

    it("dispara notificação ao se aproximar e entrar na margem do Rio Onagawa", () => {
      tracker.update("karakura", 10, 8, 1000); // Residencial
      // Descendo para o Rio Onagawa
      const res = tracker.update("karakura", 20, 30, 3000);
      expect(res).not.toBeNull();
      expect(res?.changed).toBe(true);
      expect(res?.sector.name).toBe("Karakura - Margem do Rio Onagawa");
      expect(tracker.currentSector).toBe("karakura-river");
    });

    it("dispara notificação ao entrar na Zona Industrial", () => {
      tracker.update("karakura", 20, 30, 1000); // Rio
      // Cruzando para a Zona Industrial
      const res = tracker.update("karakura", 50, 35, 3000);
      expect(res).not.toBeNull();
      expect(res?.changed).toBe(true);
      expect(res?.sector.name).toBe("Karakura - Zona Industrial");
      expect(tracker.currentSector).toBe("karakura-industrial");
    });

    it("dispara notificação ao viajar para outro reino", () => {
      tracker.update("karakura", 10, 8, 1000);
      // Atravessando o Senkaimon para a Soul Society
      const res = tracker.update("soul", 15, 15, 2000);
      expect(res).not.toBeNull();
      expect(res?.changed).toBe(true);
      expect(res?.sector.name).toBe("Soul Society - Seireitei");
      expect(tracker.currentMap).toBe("soul");
    });

    it("permite reset do estado", () => {
      tracker.update("karakura", 10, 8, 1000);
      tracker.reset();
      expect(tracker.currentSector).toBe("");
      expect(tracker.currentMap).toBe("");
    });
  });
});
