import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MAP_IDS, parseMap, walkable } from "../../shared/src/map";

const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, root)));

describe("renovação da arte dos mapas", () => {
  it("entrega arte nova nos sete mapas com hashes dos Tiled revisados", () => {
    const catalog = JSON.parse(read("art/maps/renewal/catalog.json").toString());
    const manifest = JSON.parse(read("art/maps/renewal/manifest.json").toString());
    expect(Object.keys(manifest.maps).sort()).toEqual([...MAP_IDS].sort());
    for (const id of MAP_IDS) {
      const mapBytes = read(`client/public/maps/${id}.tmj`);
      expect(createHash("sha256").update(mapBytes).digest("hex")).toBe(catalog[id].mapSha256);
      const map = JSON.parse(mapBytes.toString());
      const atlas = read(`client/public/maps/${id}_tiles.png`);
      expect(atlas.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(atlas.readUInt32BE(16)).toBe(map.tilesets[0].imagewidth);
      expect(atlas.readUInt32BE(20)).toBe(map.tilesets[0].imageheight);
      expect(createHash("sha256").update(atlas).digest("hex")).toBe(manifest.maps[id].sha256);
      expect(manifest.maps[id].sha256).not.toBe(manifest.maps[id].previousSha256);
    }
    expect(manifest.sources.length).toBe(15);
    for (const source of manifest.sources) {
      expect(read(`art/maps/renewal/${source.image}`).length).toBeGreaterThan(0);
      expect(read(`art/maps/renewal/${source.prompt}`).toString().trim().length).toBeGreaterThan(40);
    }
    expect(manifest.props.length).toBeGreaterThan(40);
    for (const prop of manifest.props) {
      const png = read(`art/maps/renewal/${prop.file}`);
      expect(png.readUInt32BE(16)).toBe(prop.width);
      expect(png.readUInt32BE(20)).toBe(prop.height);
      expect(png[25]).toBe(6); // PNG RGBA: objetos separados preservam alpha.
    }
  });

  it.each(["karakura", "falsa"])("%s: libera somente os quatro cantos vazios da casa nova", (id) => {
    const original = JSON.parse(read(`art/maps/renewal/retained/maps/${id}.tmj`).toString());
    const current = JSON.parse(read(`client/public/maps/${id}.tmj`).toString());
    const expected = structuredClone(original);
    const cornerIds = [198, 203, 222, 227];
    for (const tile of expected.tilesets[0].tiles) {
      if (cornerIds.includes(tile.id)) tile.properties.find((p: { name: string }) => p.name === "solido").value = false;
    }
    // Toda a estrutura, inclusive camadas, lógica e propriedades restantes, deve ser igual.
    expect(current).toEqual(expected);
    const before = parseMap(id, original), after = parseMap(id, current);
    const changed = [...before.solid.keys()].filter((i) => before.solid[i] !== after.solid[i]);
    const corners = [[20, 18], [25, 18], [20, 22], [25, 22]];
    expect(changed).toEqual(corners.map(([x, y]) => y * after.w + x));
    for (const [x, y] of corners) expect(walkable(after, x, y)).toBe(true);
    expect(walkable(after, 21, 20)).toBe(false); // corpo da casa continua sólido
  });
});
