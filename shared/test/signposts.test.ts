import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  KARAKURA_SIGNPOSTS,
  signpostById,
  signpostAt,
  signpostsInSector,
  signpostNear,
  parseMap,
} from "../src";

describe("Placas de Sinalização Interativas (Signposts estilo Pokémon ORAS)", () => {
  it("possui catálogo com placas canônicas espalhadas por Karakura", () => {
    expect(KARAKURA_SIGNPOSTS.length).toBeGreaterThanOrEqual(8);
    for (const sign of KARAKURA_SIGNPOSTS) {
      expect(sign.id).toBeTruthy();
      expect(sign.map).toBe("karakura");
      expect(typeof sign.x).toBe("number");
      expect(typeof sign.y).toBe("number");
      expect(sign.title).toBeTruthy();
      expect(sign.text).toBeTruthy();
      expect(["direction", "lore", "hint", "warning"]).toContain(sign.category);
      expect(["setor_1", "setor_2", "setor_3", "setor_4"]).toContain(sign.sectorId);
    }
  });

  it("inclui direções para locais chave como Senkaimon, Loja Urahara e Clínica Kurosaki", () => {
    const directions = KARAKURA_SIGNPOSTS.filter((s) => s.category === "direction");
    expect(directions.length).toBeGreaterThanOrEqual(3);

    const hasSenkaimon = KARAKURA_SIGNPOSTS.some((s) => s.text.includes("SENKAIMON") || s.text.includes("Senkaimon"));
    expect(hasSenkaimon).toBe(true);

    const hasUrahara = KARAKURA_SIGNPOSTS.some((s) => s.text.includes("Urahara") || s.title.includes("Urahara"));
    expect(hasUrahara).toBe(true);

    const hasClinic = KARAKURA_SIGNPOSTS.some((s) => s.text.includes("Clínica Kurosaki") || s.title.includes("Kurosaki"));
    expect(hasClinic).toBe(true);
  });

  it("inclui lore de Bleach e memórias do rio Onagawa", () => {
    const memorial = signpostById("sign_river_memorial");
    expect(memorial).toBeDefined();
    expect(memorial?.category).toBe("lore");
    expect(memorial?.text).toContain("Grand Fisher");
    expect(memorial?.text).toContain("chuva torrencial");

    const clinic = signpostById("sign_clinic_kurosaki");
    expect(clinic?.category).toBe("lore");
    expect(clinic?.text).toContain("ruivos");
  });

  it("inclui alertas e dicas de exploração sobre árvores zelkova e perigos industriais", () => {
    const training = signpostById("sign_training_grove");
    expect(training?.category).toBe("hint");
    expect(training?.text).toContain("zelkova");

    const industrial = signpostById("sign_industrial_warning");
    expect(industrial?.category).toBe("warning");
    expect(industrial?.text).toContain("Convocação Oficial do Seireitei");
  });

  it("permite busca por id, coordenadas e setor", () => {
    const s1 = signpostById("sign_spawn_crossroad");
    expect(s1?.x).toBe(15);
    expect(s1?.y).toBe(15);

    expect(signpostAt("karakura", 15, 15)?.id).toBe("sign_spawn_crossroad");
    expect(signpostAt("karakura", 0, 0)).toBeUndefined();
    expect(signpostAt("outro_mapa", 15, 15)).toBeUndefined();

    const sector2Signs = signpostsInSector("setor_2");
    expect(sector2Signs.length).toBeGreaterThan(0);
    expect(sector2Signs.every((s) => s.sectorId === "setor_2")).toBe(true);
  });

  it("detecta placas ao alcance do jogador com signpostNear", () => {
    // Placa em (15, 15). Distância de Chebyshev <= 2 (INTERACT_RANGE = 2)
    expect(signpostNear("karakura", 15, 15)?.id).toBe("sign_spawn_crossroad");
    expect(signpostNear("karakura", 16, 16)?.id).toBe("sign_spawn_crossroad");
    expect(signpostNear("karakura", 14, 13)?.id).toBe("sign_spawn_crossroad");

    // Fora do alcance
    expect(signpostNear("karakura", 20, 20)).toBeUndefined();
    expect(signpostNear("outro_mapa", 15, 15)).toBeUndefined();
  });

  it("integração com parseMap: o mapa de Karakura carrega automaticamente suas placas de sinalização", () => {
    const tmj = JSON.parse(readFileSync(new URL("../../client/public/maps/karakura.tmj", import.meta.url), "utf8"));
    const map = parseMap("karakura", tmj);
    expect(map.signposts).toBeDefined();
    expect(map.signposts?.length).toBeGreaterThanOrEqual(8);
    expect(map.signposts?.some((s) => s.id === "sign_urahara_senkaimon")).toBe(true);
  });
});
