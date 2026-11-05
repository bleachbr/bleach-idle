import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { MAP_IDS, parseMap, walkable, inPZ } from "../../shared/src/map";

const root = new URL("../../", import.meta.url);
const read = (path: string) => JSON.parse(readFileSync(new URL(path, root), "utf8"));

describe("cenários contínuos", () => {
  it("Karakura usa chão único e objetos completos com ordenação pela base", () => {
    const data = read("client/src/worldSceneData.json").karakura;
    const map = read("client/public/maps/karakura.tmj");
    expect([data.width, data.height]).toEqual([map.width * 32, map.height * 32]);
    expect(existsSync(new URL(`client/public${data.ground}`, root))).toBe(true);
    expect(data.props.length).toBeGreaterThan(35);
    expect(new Set(data.props.map((p: { image: string }) => p.image)).size).toBeGreaterThan(6);
    for (const p of data.props) {
      expect(existsSync(new URL(`client/public${p.image}`, root))).toBe(true);
      expect(p.sortY).toBe(p.y); // atores e props compartilham profundidade no mundo
      expect(p.width).toBeGreaterThan(0);
      expect(p.height).toBeGreaterThan(0);
    }
    // Copas maiores que uma célula: o renderer não deve voltar a fragmentá-las em quadrados.
    expect(data.props.some((p: { kind: string; width: number }) => p.kind === "tree" && p.width >= 64)).toBe(true);
  });

  it.each(MAP_IDS)("%s: preserva lógica, escala e navegação dos pontos de jogo", (id) => {
    const scene = read("client/src/worldSceneData.json")[id];
    expect(scene).toBeDefined();
    const current = read(`client/public/maps/${id}.tmj`);
    const before = read(`art/maps/scenes/baseline/${id}.tmj`);
    expect(current.layers.filter((l: { name: string }) => l.name === "logica"))
      .toEqual(before.layers.filter((l: { name: string }) => l.name === "logica"));
    const map = parseMap(id, current, { strictNpcs: true });
    expect([scene.width, scene.height]).toEqual([map.w*32, map.h*32]);
    expect(existsSync(new URL(`client/public${scene.ground}`, root))).toBe(true);
    for (const prop of scene.props) {
      expect(existsSync(new URL(`client/public${prop.image}`, root))).toBe(true);
      expect(prop.sortY).toBe(prop.y);
      expect(Number.isFinite(prop.x) && Number.isFinite(prop.y)).toBe(true);
    }
    // Editor e runtime devem expor os mesmos objetos inteiros, sem duas composições divergentes.
    const visual = current.layers.find((l: { name: string }) => l.name === "cenario");
    expect(visual.objects.length).toBe(scene.props.length);
    for (const prop of scene.props) {
      const object = visual.objects.find((o: { name: string }) => o.name === prop.id);
      expect([object.x, object.y, object.width, object.height])
        .toEqual([prop.x - prop.width / 2, prop.y, prop.width, prop.height]);
      const tileset = [...current.tilesets].reverse().find((ts: { firstgid: number }) => ts.firstgid <= object.gid);
      expect(`/maps/${tileset.tiles[object.gid - tileset.firstgid].image}`).toBe(prop.image);
    }
    const start = map.temple ?? Object.values(map.arrivals)[0];
    expect(walkable(map, start.x, start.y)).toBe(true);
    const queue = [start], seen = new Set([start.y * map.w + start.x]);
    for (let i = 0; i < queue.length; i++) {
      const q = queue[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = q.x + dx, y = q.y + dy, key = y * map.w + x;
        if (walkable(map, x, y) && !seen.has(key)) { seen.add(key); queue.push({ x, y }); }
      }
    }
    for (const point of [start, ...Object.values(map.arrivals)]) expect(seen.has(point.y * map.w + point.x)).toBe(true);
    for (const point of map.spawns) {
      expect(seen.has(point.y*map.w+point.x)).toBe(true);
      // Cada grupo precisa de espaço conectado suficiente no próprio raio de spawn.
      let available = 0;
      for (let y = point.y - point.radius; y <= point.y + point.radius; y++)
        for (let x = point.x - point.radius; x <= point.x + point.radius; x++)
          if (walkable(map, x, y) && !inPZ(map, x, y) && seen.has(y * map.w + x)) available++;
      expect(available, `${id}/${point.kind}: espaço para ${point.count} mobs`).toBeGreaterThanOrEqual(point.count);
    }
    for (const point of [map.shop, map.gate, map.depot, ...map.npcs].filter((p) => !!p))
      expect([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((point.y + dy) * map.w + point.x + dx))).toBe(true);
  });
});
