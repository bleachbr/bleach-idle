import { describe, it, expect } from "vitest";
import {
  KARAKURA_SECTORS,
  KARAKURA_SECTOR_LIST,
  getKarakuraSector,
  getKarakuraSectorById,
  getKarakuraSectorByNumber,
  getRecommendedSectorForLevel,
  getHeroJourneySectorProgress,
} from "../src/sectors";

describe("Divisão Setorial de Karakura (Jornada do Herói)", () => {
  it("possui exatamente 4 setores configurados na progressão canônica", () => {
    expect(KARAKURA_SECTOR_LIST).toHaveLength(4);
    expect(KARAKURA_SECTORS.setor_1.sectorNumber).toBe(1);
    expect(KARAKURA_SECTORS.setor_2.sectorNumber).toBe(2);
    expect(KARAKURA_SECTORS.setor_3.sectorNumber).toBe(3);
    expect(KARAKURA_SECTORS.setor_4.sectorNumber).toBe(4);
  });

  it("define corretamente nomes e faixas de nível para cada setor", () => {
    // Setor 1: Distrito Residencial (Clínica Kurosaki, spawn inicial, Lv 1-10)
    expect(KARAKURA_SECTORS.setor_1.name).toBe("Distrito Residencial");
    expect(KARAKURA_SECTORS.setor_1.minLevel).toBe(1);
    expect(KARAKURA_SECTORS.setor_1.maxLevel).toBe(10);
    expect(KARAKURA_SECTORS.setor_1.landmarks).toContain("Clínica Kurosaki");
    expect(KARAKURA_SECTORS.setor_1.landmarks).toContain("Templo do Despertar (Spawn Inicial)");

    // Setor 2: Centro Comercial & Loja Urahara (campo de treinamento, Lv 10-18)
    expect(KARAKURA_SECTORS.setor_2.name).toBe("Centro Comercial & Loja Urahara");
    expect(KARAKURA_SECTORS.setor_2.minLevel).toBe(10);
    expect(KARAKURA_SECTORS.setor_2.maxLevel).toBe(18);
    expect(KARAKURA_SECTORS.setor_2.landmarks).toContain("Loja de Conveniência Urahara");
    expect(KARAKURA_SECTORS.setor_2.landmarks).toContain("Senkaimon (Portal para a Soul Society)");

    // Setor 3: Parque Beira-Rio Onagawa & Travessia da Ponte (Lv 18-25)
    expect(KARAKURA_SECTORS.setor_3.name).toBe("Parque Beira-Rio Onagawa & Travessia da Ponte");
    expect(KARAKURA_SECTORS.setor_3.minLevel).toBe(18);
    expect(KARAKURA_SECTORS.setor_3.maxLevel).toBe(25);
    expect(KARAKURA_SECTORS.setor_3.landmarks).toContain("Rio Onagawa");
    expect(KARAKURA_SECTORS.setor_3.landmarks).toContain("Ponte de Karakura");

    // Setor 4: Periferia Industrial Abandonada (Hollows ferozes, Lv 25-30 até a convocação do Seireitei)
    expect(KARAKURA_SECTORS.setor_4.name).toBe("Periferia Industrial Abandonada");
    expect(KARAKURA_SECTORS.setor_4.minLevel).toBe(25);
    expect(KARAKURA_SECTORS.setor_4.maxLevel).toBe(30);
    expect(KARAKURA_SECTORS.setor_4.landmarks).toContain("Toca do Grand Fisher");
  });

  it("cobre todos os 64x48 tiles do mapa de Karakura sem lacunas", () => {
    let missing = 0;
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 64; x++) {
        if (!getKarakuraSector(x, y)) {
          missing++;
        }
      }
    }
    expect(missing).toBe(0);
  });

  it("retorna undefined para coordenadas fora do mapa", () => {
    expect(getKarakuraSector(-1, 10)).toBeUndefined();
    expect(getKarakuraSector(64, 10)).toBeUndefined();
    expect(getKarakuraSector(10, -1)).toBeUndefined();
    expect(getKarakuraSector(10, 48)).toBeUndefined();
  });

  it("mapeia os principais pontos de interesse e spawns aos setores corretos", () => {
    // Templo / spawn inicial em (16, 14) -> Setor 1
    expect(getKarakuraSector(16, 14)?.id).toBe("setor_1");
    // Clínica Kurosaki em (24, 19) e (7, 28) -> Setor 1
    expect(getKarakuraSector(24, 19)?.id).toBe("setor_1");
    expect(getKarakuraSector(7, 28)?.id).toBe("setor_1");

    // Loja Urahara em (18, 10) -> Setor 2
    expect(getKarakuraSector(18, 10)?.id).toBe("setor_2");
    // Campo de treinamento leste em (36, 10) -> Setor 2
    expect(getKarakuraSector(36, 10)?.id).toBe("setor_2");

    // Rio Onagawa chegada em (17, 40) -> Setor 3
    expect(getKarakuraSector(17, 40)?.id).toBe("setor_3");
    // Spawn de Hollow do rio em (28, 42) -> Setor 3
    expect(getKarakuraSector(28, 42)?.id).toBe("setor_3");

    // Toca do Grand Fisher em (54, 40) -> Setor 4
    expect(getKarakuraSector(54, 40)?.id).toBe("setor_4");
    // Spawn de Hollow ácido em (57, 27) -> Setor 4
    expect(getKarakuraSector(57, 27)?.id).toBe("setor_4");
  });

  it("busca setor por id e por número", () => {
    expect(getKarakuraSectorById("setor_1")?.name).toBe("Distrito Residencial");
    expect(getKarakuraSectorById("invalido")).toBeUndefined();

    expect(getKarakuraSectorByNumber(3)?.name).toBe("Parque Beira-Rio Onagawa & Travessia da Ponte");
    expect(getKarakuraSectorByNumber(99)).toBeUndefined();
  });

  it("recomenda o setor correto com base no nível do jogador", () => {
    expect(getRecommendedSectorForLevel(1).id).toBe("setor_1");
    expect(getRecommendedSectorForLevel(9).id).toBe("setor_1");
    expect(getRecommendedSectorForLevel(10).id).toBe("setor_2");
    expect(getRecommendedSectorForLevel(17).id).toBe("setor_2");
    expect(getRecommendedSectorForLevel(18).id).toBe("setor_3");
    expect(getRecommendedSectorForLevel(24).id).toBe("setor_3");
    expect(getRecommendedSectorForLevel(25).id).toBe("setor_4");
    expect(getRecommendedSectorForLevel(30).id).toBe("setor_4");
  });

  it("calcula o progresso na Jornada do Herói e ativa a convocação do Seireitei no nível 30", () => {
    const p1 = getHeroJourneySectorProgress(1);
    expect(p1.currentSector.id).toBe("setor_1");
    expect(p1.nextSector?.id).toBe("setor_2");
    expect(p1.progressPct).toBe(0);
    expect(p1.summonReady).toBe(false);

    const p15 = getHeroJourneySectorProgress(15);
    expect(p15.currentSector.id).toBe("setor_2");
    expect(p15.nextSector?.id).toBe("setor_3");
    expect(p15.progressPct).toBeGreaterThan(40);
    expect(p15.summonReady).toBe(false);

    const p30 = getHeroJourneySectorProgress(30);
    expect(p30.currentSector.id).toBe("setor_4");
    expect(p30.nextSector).toBeUndefined();
    expect(p30.progressPct).toBe(100);
    expect(p30.summonReady).toBe(true);
  });
});
