import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  KARAKURA_CHESTS,
  chestById,
  chestAt,
  chestsInSector,
  chestNear,
  canOpenChest,
  openChestReward,
  parseMap,
  INV_SIZE,
  type Slot,
} from "../src";

describe("Baús de Tesouro Secretos (Chests em Karakura)", () => {
  it("possui catálogo de baús escondidos em pontos secretos específicos", () => {
    expect(KARAKURA_CHESTS.length).toBeGreaterThanOrEqual(5);

    const spots = new Set(KARAKURA_CHESTS.map((c) => c.secretSpot));
    expect(spots.has("zelkova")).toBe(true);
    expect(spots.has("river")).toBe(true);
    expect(spots.has("alley")).toBe(true);
    expect(spots.has("industrial")).toBe(true);
  });

  it("cada baú entrega ouro e consumíveis úteis", () => {
    for (const chest of KARAKURA_CHESTS) {
      expect(chest.rewards.gold).toBeGreaterThan(0);
      expect(chest.rewards.items.length).toBeGreaterThan(0);
      for (const item of chest.rewards.items) {
        expect(item.id).toBeTruthy();
        expect(item.qty).toBeGreaterThan(0);
      }
    }
  });

  it("verifica regras de proximidade e estado com canOpenChest", () => {
    const chest = chestById("chest_residential_alley")!;
    expect(chest).toBeDefined();

    // Aberto pela primeira vez e perto: permitido
    expect(canOpenChest(chest, [], { map: "karakura", x: 7, y: 29 })).toEqual({ canOpen: true });
    expect(canOpenChest(chest, [], { map: "karakura", x: 8, y: 30 })).toEqual({ canOpen: true }); // Chebyshev 1 <= 2

    // Já aberto anteriormente
    expect(canOpenChest(chest, [chest.id], { map: "karakura", x: 7, y: 29 }).canOpen).toBe(false);
    expect(canOpenChest(chest, new Set([chest.id]), { map: "karakura", x: 7, y: 29 }).canOpen).toBe(false);

    // Longe demais
    expect(canOpenChest(chest, [], { map: "karakura", x: 20, y: 20 }).canOpen).toBe(false);

    // Em outro mapa
    expect(canOpenChest(chest, [], { map: "soul", x: 7, y: 29 }).canOpen).toBe(false);
  });

  it("openChestReward entrega ouro, itens e previne abertura duplicada", () => {
    const chest = chestById("chest_zelkova_grove")!;
    const inv: (Slot | null)[] = Array(INV_SIZE).fill(null);
    const player = { gold: 100, inv, openedChests: [] };

    const res = openChestReward(chest, player);
    expect(res.success).toBe(true);
    expect(res.goldAwarded).toBe(chest.rewards.gold);
    expect(player.gold).toBe(100 + chest.rewards.gold);
    expect(res.itemsAwarded.length).toBe(chest.rewards.items.length);
    expect(player.openedChests).toContain(chest.id);

    // Segunda tentativa falha
    const res2 = openChestReward(chest, player);
    expect(res2.success).toBe(false);
    expect(res2.alreadyOpened).toBe(true);
    expect(res2.goldAwarded).toBe(0);
    expect(player.gold).toBe(100 + chest.rewards.gold); // ouro inalterado
  });

  it("permite busca por id, posição e setor", () => {
    const c1 = chestById("chest_onagawa_river");
    expect(c1?.secretSpot).toBe("river");
    expect(c1?.sectorId).toBe("setor_3");

    expect(chestAt("karakura", 7, 42)?.id).toBe("chest_onagawa_river");
    expect(chestAt("karakura", 0, 0)).toBeUndefined();

    const sector4Chests = chestsInSector("setor_4");
    expect(sector4Chests.some((c) => c.id === "chest_industrial_scrapyard")).toBe(true);
  });

  it("detecta baú próximo com chestNear", () => {
    expect(chestNear("karakura", 7, 29)?.id).toBe("chest_residential_alley");
    expect(chestNear("karakura", 6, 28)?.id).toBe("chest_residential_alley");
    expect(chestNear("karakura", 20, 20)).toBeUndefined();
  });

  it("integração com parseMap: o mapa de Karakura carrega automaticamente seus baús secretos", () => {
    const tmj = JSON.parse(readFileSync(new URL("../../client/public/maps/karakura.tmj", import.meta.url), "utf8"));
    const map = parseMap("karakura", tmj);
    expect(map.chests).toBeDefined();
    expect(map.chests?.length).toBeGreaterThanOrEqual(5);
    expect(map.chests?.some((c) => c.id === "chest_zelkova_grove")).toBe(true);
  });
});
