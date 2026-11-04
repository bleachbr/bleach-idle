import { describe, expect, it, vi } from "vitest";
import type Phaser from "phaser";
import { drawWorldScene } from "../src/worldScenes";
import scenes from "../src/worldSceneData.json";

function renderer(loaded: boolean) {
  const image = vi.fn(() => {
    const object = { setOrigin: vi.fn(), setDisplaySize: vi.fn(), setDepth: vi.fn() };
    for (const method of Object.values(object)) method.mockReturnValue(object);
    return object;
  });
  const scene = { textures: { exists: vi.fn(() => loaded) }, add: { image } };
  return { scene: scene as unknown as Phaser.Scene, image };
}

describe("renderização dos cenários contínuos", () => {
  it("permite fallback sem criar objetos quando o chão não carregou", () => {
    const { scene, image } = renderer(false);
    expect(drawWorldScene(scene, "karakura")).toBeUndefined();
    expect(image).not.toHaveBeenCalled();
  });

  it("cria o chão e cada prop dos sete mapas com a escala e profundidade previstas", () => {
    for (const [id, map] of Object.entries(scenes)) {
      const { scene, image } = renderer(true);
      expect(drawWorldScene(scene, id)).toHaveLength(map.props.length + 1);
      expect(image).toHaveBeenNthCalledWith(1, 0, 0, `world-scene:${map.ground}`);
      expect(image.mock.results[0].value.setDisplaySize).toHaveBeenCalledWith(map.width, map.height);
      expect(image.mock.results[0].value.setDepth).toHaveBeenCalledWith(-10);
      for (const [index, prop] of map.props.entries()) {
        expect(image).toHaveBeenNthCalledWith(index + 2, prop.x, prop.y, `world-scene:${prop.image}`);
        const object = image.mock.results[index + 1].value;
        expect(object.setOrigin).toHaveBeenCalledWith(.5, 1);
        expect(object.setDisplaySize).toHaveBeenCalledWith(prop.width, prop.height);
        expect(object.setDepth).toHaveBeenCalledWith(prop.sortY);
      }
    }
  });
});
