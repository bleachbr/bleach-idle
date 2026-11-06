import { describe, it, expect, vi } from "vitest";

// Mock do Phaser para teste dos emissores de partículas
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

describe("Efeito de Água Viva no Rio Onagawa (Visual & Partículas)", () => {
  it("gera as texturas de partículas water_sparkle e water_flow", () => {
    const existing = new Set<string>();
    const generateTexture = vi.fn((key: string) => {
      existing.add(key);
    });
    const graphics = {
      fillStyle: vi.fn().mockReturnThis(),
      fillCircle: vi.fn().mockReturnThis(),
      fillEllipse: vi.fn().mockReturnThis(),
      fillRect: vi.fn().mockReturnThis(),
      clear: vi.fn().mockReturnThis(),
      generateTexture,
      destroy: vi.fn(),
    };

    const scene = Object.create(GameScene.prototype);
    scene.textures = {
      exists: (key: string) => existing.has(key),
    };
    scene.make = {
      graphics: () => graphics,
    };

    const methods = GameScene.prototype as any;
    methods.makeParticleTextures.call(scene);

    expect(generateTexture).toHaveBeenCalledWith("water_sparkle", 7, 7);
    expect(generateTexture).toHaveBeenCalledWith("water_flow", 8, 4);
    expect(graphics.destroy).toHaveBeenCalled();
  });

  it("cria emissores de fluxo e brilho de superfície quando o mapa é 'karakura'", () => {
    const mockEmitter = (depthVal: number) => {
      let d = depthVal;
      const emitter: any = {
        setDepth: vi.fn((val: number) => {
          d = val;
          return emitter;
        }),
        fastForward: vi.fn(),
        destroy: vi.fn(),
      };
      return emitter;
    };

    const addParticles = vi.fn((_x, _y, tex, config) => {
      const emitter = mockEmitter(0);
      return Object.assign(emitter, { tex, config });
    });

    const scene = Object.create(GameScene.prototype);
    scene.mapId = "karakura";
    scene.riverEmitters = [];
    scene.add = { particles: addParticles };

    const methods = GameScene.prototype as any;
    methods.startRiverWaterFx.call(scene);

    expect(scene.isRiverFxActive()).toBe(true);
    expect(scene.getRiverEmitters()).toHaveLength(2);

    // Emitter 1: fluxo da água (water_flow)
    const flowCall = addParticles.mock.calls.find((c) => c[2] === "water_flow");
    expect(flowCall).toBeDefined();
    const flowConfig = flowCall[3];
    expect(flowConfig.speedX.min).toBeGreaterThan(0); // Correnteza flui suavemente para leste
    expect(flowConfig.x.max).toBe(2048); // Cobre toda a largura do Rio Onagawa
    expect(flowConfig.y.min).toBeGreaterThanOrEqual(1050); // Leito do rio
    expect(flowConfig.y.max).toBeLessThanOrEqual(1200);

    // Emitter 2: brilho de superfície / reishi shimmers (water_sparkle)
    const shimmerCall = addParticles.mock.calls.find((c) => c[2] === "water_sparkle");
    expect(shimmerCall).toBeDefined();
    const shimmerConfig = shimmerCall[3];
    expect(shimmerConfig.alpha.end).toBeGreaterThan(0.5);
    expect(shimmerConfig.blendMode).toBe("ADD");
  });

  it("não inicia os efeitos de rio em mapas sem o Rio Onagawa (ex: soul, hueco)", () => {
    const addParticles = vi.fn();
    const scene = Object.create(GameScene.prototype);
    scene.mapId = "soul";
    scene.riverEmitters = [];
    scene.add = { particles: addParticles };

    const methods = GameScene.prototype as any;
    methods.startRiverWaterFx.call(scene);

    expect(addParticles).not.toHaveBeenCalled();
    expect(scene.isRiverFxActive()).toBe(false);
  });

  it("destrói os emissores de rio ao trocar de mapa ou desligar o efeito", () => {
    const destroy1 = vi.fn();
    const destroy2 = vi.fn();
    const scene = Object.create(GameScene.prototype);
    scene.riverEmitters = [{ destroy: destroy1 }, { destroy: destroy2 }];

    const methods = GameScene.prototype as any;
    methods.stopRiverWaterFx.call(scene);

    expect(destroy1).toHaveBeenCalled();
    expect(destroy2).toHaveBeenCalled();
    expect(scene.riverEmitters).toHaveLength(0);
    expect(scene.isRiverFxActive()).toBe(false);
  });
});
