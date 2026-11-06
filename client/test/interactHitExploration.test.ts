import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseMap, TILE, type GameMap } from "../../shared/src";
import {
  interactAt,
  interactNear,
  interactHint,
  pickClick,
  signpostAtPixel,
  chestAtPixel,
  signpostNearPlayer,
  chestNearPlayer,
} from "../src/interactHit";

const karakura = parseMap(
  "karakura",
  JSON.parse(readFileSync(new URL("../public/maps/karakura.tmj", import.meta.url), "utf8"))
);
const center = (x: number, y: number) => [x * TILE + TILE / 2, y * TILE + TILE / 2] as const;

describe("interactHit com Placas e Baús de Karakura", () => {
  it("reconhece placa ao clicar sobre o tile dela", () => {
    // Placa do spawn em (15, 15)
    expect(interactAt(karakura, ...center(15, 15))).toBe("signpost");

    // Placa da clínica em (23, 19)
    expect(interactAt(karakura, ...center(23, 19))).toBe("signpost");

    const sign = signpostAtPixel(karakura, ...center(15, 15));
    expect(sign?.id).toBe("sign_spawn_crossroad");
    expect(sign?.title).toBe("Encruzilhada do Despertar");
  });

  it("reconhece baú ao clicar sobre o tile dele", () => {
    // Baú do beco residencial em (7, 29)
    expect(interactAt(karakura, ...center(7, 29))).toBe("chest");

    // Baú da zelkova em (39, 5)
    expect(interactAt(karakura, ...center(39, 5))).toBe("chest");

    const chest = chestAtPixel(karakura, ...center(7, 29));
    expect(chest?.id).toBe("chest_residential_alley");
    expect(chest?.name).toBe("Baú do Beco Residencial");
  });

  it("interactNear detecta placa e baú ao alcance do jogador", () => {
    // Perto da placa em (15, 15): jogador em (15, 16) [dist 1]
    expect(interactNear(karakura, 15, 16)).toBe("signpost");
    expect(signpostNearPlayer(karakura, 15, 16)?.id).toBe("sign_spawn_crossroad");

    // Perto do baú em (7, 29): jogador em (8, 29) [dist 1]
    expect(interactNear(karakura, 8, 29)).toBe("chest");
    expect(chestNearPlayer(karakura, 8, 29)?.id).toBe("chest_residential_alley");
  });

  it("interactHint produz rótulos de interação claros para placa e baú", () => {
    const signHint = interactHint(karakura, 15, 16);
    expect(signHint?.kind).toBe("signpost");
    expect(signHint?.text).toContain("Encruzilhada do Despertar");
    expect(signHint?.text).toContain("E / Espaço / clique");

    const chestHint = interactHint(karakura, 8, 29);
    expect(chestHint?.kind).toBe("chest");
    expect(chestHint?.text).toContain("Baú do Beco Residencial");
    expect(chestHint?.text).toContain("E / Espaço / clique");
  });

  it("pickClick retorna sign ou chest quando clicado", () => {
    const nobody = () => undefined;

    const pickSign = pickClick(karakura, ...center(15, 15), nobody);
    expect(pickSign).toMatchObject({
      interact: "signpost",
      id: "sign_spawn_crossroad",
    });

    const pickChest = pickClick(karakura, ...center(7, 29), nobody);
    expect(pickChest).toMatchObject({
      interact: "chest",
      id: "chest_residential_alley",
    });
  });

  it("outro jogador clicado no mesmo ponto continua tendo prioridade sobre placa e baú", () => {
    const playerAt = () => "rukia";
    const pick = pickClick(karakura, ...center(15, 15), playerAt);
    expect(pick).toEqual({ player: "rukia" });
  });
});
