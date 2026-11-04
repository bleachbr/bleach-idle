import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { parseMap } from "../../shared/src/map";

vi.mock("phaser", () => ({ default: { Scene: class {} } }));
vi.mock("../src/sfx", () => ({}));
import { GameScene } from "../src/GameScene";

describe("transições dos cenários", () => {
  it("atualiza a profundidade no teleporte antes de qualquer novo passo", () => {
    const container = { setPosition: vi.fn(), setDepth: vi.fn() };
    const view = { id: "outro", tx: 10, ty: 30, c: container };
    const methods = GameScene.prototype as unknown as { moveView(v: unknown, x: number, y: number, dir: number): void };
    methods.moveView.call({ myId: "eu", time: { now: 10 } }, view, 6, 6, 0);
    expect(container.setPosition).toHaveBeenCalledWith(208, 224);
    expect(container.setDepth).toHaveBeenCalledWith(224);
  });

  it("usa o chão contínuo no minimapa, sem pintar tiles ocultos de colisão", () => {
    const data = JSON.parse(readFileSync(new URL("../public/maps/karakura.tmj", import.meta.url), "utf8"));
    const map = parseMap("karakura", data);
    const ground = { width: 2048, height: 1536 };
    const atlas = { width: 256, height: 1024 };
    const drawImage = vi.fn();
    const context = { drawImage, putImageData: vi.fn(), getImageData: () => ({ data: new Uint8ClampedArray(4096) }) };
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => context }) });
    vi.stubGlobal("ImageData", class { data: Uint8ClampedArray; constructor(w: number, h: number) { this.data = new Uint8ClampedArray(w*h*4); } });
    try {
      const scene = {
        minimap: {}, maps: { karakura: map }, cache: { tilemap: { get: () => ({ data }) } },
        textures: { exists: () => true, get: (key: string) => ({ getSourceImage: () => key.includes("karakura-ground") ? ground : atlas }) },
      };
      const methods = GameScene.prototype as unknown as { buildMinimap(id: string): void };
      methods.buildMinimap.call(scene, "karakura");
      expect(drawImage).toHaveBeenCalledWith(ground, 0, 0, 64, 48);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
