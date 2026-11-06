import { describe, it, expect, vi } from "vitest";
import { VIEW_W, VIEW_H, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM, gameConfig } from "../src/GameScene";

// Mock do Phaser para teste de unidade dos métodos da cena
vi.mock("phaser", () => {
  class MockScene {}
  return {
    default: {
      Scene: MockScene,
      AUTO: "AUTO",
      Scale: { FIT: "FIT", CENTER_BOTH: "CENTER_BOTH" },
      BlendModes: { ADD: "ADD", NORMAL: "NORMAL" },
    },
  };
});
vi.mock("../src/sfx", () => ({ sfx: {} }));

import { GameScene } from "../src/GameScene";

describe("Câmera 2.5D & Viewport Expandido", () => {
  it("utiliza viewport panorâmico expandido (20x13 tiles) para ampla visão do mundo", () => {
    // Antes 15x11 (480x352) -> agora 20x13 (640x416), +57% de área visível
    expect(VIEW_W).toBe(20);
    expect(VIEW_H).toBe(13);
    expect(VIEW_W * 32).toBe(640);
    expect(VIEW_H * 32).toBe(416);
  });

  it("configura resolução de renderização padrão no gameConfig", () => {
    const config = gameConfig("game-container");
    expect(config.width).toBe(640);
    expect(config.height).toBe(416);
    expect(config.pixelArt).toBe(true);
  });

  it("define limites de zoom dinâmico confortáveis para visão tática e close-up", () => {
    expect(MIN_ZOOM).toBe(0.5); // Ampla visão tática de Karakura e outros reinos
    expect(MAX_ZOOM).toBe(1.8); // Foco detalhado nos sprites e combate
    expect(DEFAULT_ZOOM).toBe(1.0);
  });

  it("permite ajuste dinâmico de zoom com setCameraZoom respeitando limites", () => {
    const setZoom = vi.fn();
    const camera = { setZoom };
    const scene = Object.create(GameScene.prototype);
    scene.cameras = { main: camera };
    scene.userZoom = DEFAULT_ZOOM;
    scene.hd = false;

    // Zoom normal
    scene.setCameraZoom(1.2);
    expect(scene.getZoom()).toBe(1.2);
    expect(setZoom).toHaveBeenCalledWith(1.2);

    // Zoom além do limite superior (clamped a MAX_ZOOM)
    scene.setCameraZoom(2.5);
    expect(scene.getZoom()).toBe(MAX_ZOOM);
    expect(setZoom).toHaveBeenCalledWith(MAX_ZOOM);

    // Zoom além do limite inferior (clamped a MIN_ZOOM)
    scene.setCameraZoom(0.2);
    expect(scene.getZoom()).toBe(MIN_ZOOM);
    expect(setZoom).toHaveBeenCalledWith(MIN_ZOOM);
  });

  it("incorpora multiplicador HD_K=3 quando o modo HD está ativo", () => {
    const setZoom = vi.fn();
    const camera = { setZoom };
    const scene = Object.create(GameScene.prototype);
    scene.cameras = { main: camera };
    scene.userZoom = DEFAULT_ZOOM;
    scene.hd = true;

    scene.setCameraZoom(1.0);
    // HD_K (3) * 1.0 = 3.0
    expect(setZoom).toHaveBeenCalledWith(3.0);

    scene.setCameraZoom(0.8);
    // HD_K (3) * 0.8 = 2.4
    expect(setZoom).toHaveBeenCalledWith(2.4);
  });

  it("executa zoomIn, zoomOut e resetZoom progressivamente", () => {
    const scene = Object.create(GameScene.prototype);
    scene.cameras = { main: { setZoom: vi.fn() } };
    scene.tweens = { add: vi.fn() };
    scene.userZoom = 1.0;
    scene.hd = false;

    // Zoom In
    scene.zoomIn(0.1);
    expect(scene.getZoom()).toBeCloseTo(1.1);

    // Zoom Out
    scene.zoomOut(0.2);
    expect(scene.getZoom()).toBeCloseTo(0.9);

    // Reset Zoom
    scene.resetZoom();
    expect(scene.getZoom()).toBe(DEFAULT_ZOOM);
  });
});
