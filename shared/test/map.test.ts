import { describe, it, expect } from "vitest";
import { parseMap, walkable, inPZ, nearestWalkable } from "../src/map";

describe("map", () => {
  const fakeTiledMap = {
    width: 10,
    height: 10,
    tilewidth: 32,
    tileheight: 32,
    properties: [{ name: "nome", value: "Mapa de Teste" }],
    tilesets: [
      {
        firstgid: 1,
        tiles: [{ id: 5, properties: [{ name: "solido", value: true }] }],
      },
    ],
    layers: [
      {
        type: "tilelayer",
        name: "chao",
        // gid 6 corresponde a firstgid(1) + id(5) = sólido
        data: [
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 6, 0, 0, 0, 0, 0, 0, 0, 0,
          ...Array(80).fill(0),
        ],
      },
      {
        type: "objectgroup",
        name: "logica",
        objects: [
          { type: "templo", x: 64, y: 64 }, // x=2, y=2
          { type: "pz", x: 0, y: 0, width: 96, height: 96 }, // x: 0..2, y: 0..2
          { type: "loja", name: "Kisuke", x: 128, y: 64 }, // x=4, y=2
          {
            type: "spawn",
            name: "hollow_menor",
            x: 160,
            y: 160,
            properties: [
              { name: "raio", value: 5 },
              { name: "quantidade", value: 4 },
            ],
          },
        ],
      },
    ],
  };

  it("parseia propriedades gerais e dimensões", () => {
    const map = parseMap("teste", fakeTiledMap);
    expect(map.id).toBe("teste");
    expect(map.name).toBe("Mapa de Teste");
    expect(map.w).toBe(10);
    expect(map.h).toBe(10);
  });

  it("identifica tiles sólidos e marca posição do NPC da loja como sólida", () => {
    const map = parseMap("teste", fakeTiledMap);
    // (1, 1) tem gid 6 (sólido)
    expect(map.solid[1 * 10 + 1]).toBe(1);
    // (4, 2) é onde fica a loja (marcado como sólido)
    expect(map.solid[2 * 10 + 4]).toBe(1);
    // (0, 0) é andável
    expect(map.solid[0]).toBe(0);
  });

  it("parseia objetos de lógica: templo, pz, loja e spawn", () => {
    const map = parseMap("teste", fakeTiledMap);
    expect(map.temple).toEqual({ x: 2, y: 2 });
    expect(map.shop).toEqual({ x: 4, y: 2, name: "Kisuke" });
    expect(map.pz).toHaveLength(1);
    expect(map.pz[0]).toEqual({ x0: 0, y0: 0, x1: 2, y1: 2 });

    expect(map.spawns).toHaveLength(1);
    expect(map.spawns[0]).toEqual({
      map: "teste",
      kind: "hollow_menor",
      x: 5,
      y: 5,
      radius: 5,
      count: 4,
    });
  });

  it("walkable retorna true para tile livre dentro do mapa e false para sólidos ou fora do mapa", () => {
    const map = parseMap("teste", fakeTiledMap);
    expect(walkable(map, 0, 0)).toBe(true);
    expect(walkable(map, 1, 1)).toBe(false); // sólido
    expect(walkable(map, -1, 0)).toBe(false); // fora do mapa
    expect(map.w).toBe(10);
    expect(walkable(map, 10, 0)).toBe(false); // fora do mapa
  });

  it("inPZ identifica se coordenadas estão dentro da zona de proteção", () => {
    const map = parseMap("teste", fakeTiledMap);
    expect(inPZ(map, 1, 1)).toBe(true);
    expect(inPZ(map, 2, 2)).toBe(true);
    expect(inPZ(map, 3, 3)).toBe(false);
  });

  it("nearestWalkable encontra o tile andável mais próximo de um ponto bloqueado", () => {
    const map = parseMap("teste", fakeTiledMap);
    // (1, 1) é sólido; vizinho (1, 0) ou (0, 1) deve ser encontrado
    const pt = nearestWalkable(map, 1, 1);
    expect(walkable(map, pt.x, pt.y)).toBe(true);
  });
});
