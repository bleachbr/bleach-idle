import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MAP_IDS } from "../../shared/src/map";

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

  // A revisão de composição autorizou novos caminhos e footprints. O contrato
  // atual de lógica, escala e navegação dos sete mapas está em worldScenes.test.ts.
});
