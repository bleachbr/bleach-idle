import { describe, it, expect, vi } from "vitest";
import { fxInCurrentMap } from "../src/fxMap";

vi.mock("phaser", () => ({ default: { Scene: class {}, Math: { Between: () => 0, Angle: { Between: () => 0 } }, BlendModes: { ADD: 1 } } }));
vi.mock("../src/sfx", () => ({ sfx: new Proxy({}, { get: () => () => {} }) }));
const { GameScene } = await import("../src/GameScene");

const MAPS: Record<string, string> = { eu: "karakura", vizinho: "karakura", longe: "soul", m_longe: "soul", m_perto: "karakura" };
const mapOf = (id: string) => MAPS[id];

describe("fxInCurrentMap", () => {
  it("recusa o que acontece com entidade de outro mapa", () => {
    expect(fxInCurrentMap({ t: "dmg", id: "m_longe", from: "longe" }, "eu", "karakura", mapOf)).toBe(false);
    expect(fxInCurrentMap({ t: "form", id: "longe" }, "eu", "karakura", mapOf)).toBe(false);
  });

  it("a técnica não tem id: vale o mapa de quem a usou", () => {
    expect(fxInCurrentMap({ t: "skill", from: "longe" }, "eu", "karakura", mapOf)).toBe(false);
    expect(fxInCurrentMap({ t: "skill", from: "vizinho" }, "eu", "karakura", mapOf)).toBe(true);
  });

  it("aceita o mesmo mapa, o aviso global e a entidade que não está no estado", () => {
    expect(fxInCurrentMap({ t: "dmg", id: "m_perto" }, "eu", "karakura", mapOf)).toBe(true);
    expect(fxInCurrentMap({ t: "event" }, "eu", "karakura", mapOf)).toBe(true);
    expect(fxInCurrentMap({ t: "die", id: "sumiu" }, "eu", "karakura", mapOf)).toBe(true);
  });

  it("o próprio jogador passa mesmo com o estado à frente da cena (acabou de viajar)", () => {
    expect(fxInCurrentMap({ t: "level", id: "eu" }, "eu", "soul", mapOf)).toBe(true);
  });

  it("o tp passa: só mexe no sprite, e quem chega ainda consta no mapa anterior", () => {
    expect(fxInCurrentMap({ t: "tp", id: "longe" }, "eu", "karakura", mapOf)).toBe(true);
  });
});

describe("GameScene.onFx com a cena em Karakura", () => {
  function scene() {
    const view = (id: string, isMonster = false) => ({ id, isMonster, c: { x: 100, y: 100, visible: true }, spr: { displayHeight: 40, setTintFill: () => {}, setAlpha: () => {} } });
    const entity = (id: string) => ({ id, map: MAPS[id], maxHp: 100, charId: "ichigo", targetId: "" });
    const s = {
      myId: "eu", mapId: "karakura",
      views: new Map(Object.keys(MAPS).map((id) => [id, view(id, id.startsWith("m_"))])),
      room: { state: {
        players: new Map(["eu", "vizinho", "longe"].map((id) => [id, entity(id)])),
        monsters: new Map(["m_longe", "m_perto"].map((id) => [id, entity(id)])),
      } },
      float: vi.fn(), playFx: vi.fn(), lunge: vi.fn(), knockback: vi.fn(), restoreTint: vi.fn(),
      cameras: { main: { shake: vi.fn(), flash: vi.fn() } },
      time: { delayedCall: vi.fn() }, tweens: { add: vi.fn() }, anims: { exists: () => false },
      add: { ellipse: () => ({ setDepth: () => ({}) }) },
    };
    const fire = (fx: object) => (GameScene.prototype as any).onFx.call(s, fx);
    return { s, fire };
  }
  const effects = (s: ReturnType<typeof scene>["s"]) =>
    s.float.mock.calls.length + s.playFx.mock.calls.length + s.cameras.main.shake.mock.calls.length + s.cameras.main.flash.mock.calls.length;

  it.each([
    ["dano", { t: "dmg", id: "m_longe", v: 90, from: "longe" }],
    ["Mugetsu", { t: "form", id: "longe", v: 4 }],
    ["cura", { t: "heal", id: "longe", v: 10 }],
    ["nível", { t: "level", id: "longe", v: 10 }],
    ["saque", { t: "loot", id: "longe", v: 1 }],
    ["morte", { t: "die", id: "m_longe" }],
    ["técnica final", { t: "skill", from: "longe", to: "m_longe", name: "Mugetsu", i: 3 }],
    ["fase de chefe", { t: "event", id: "m_longe", text: "O chefe entrou em frenesi!" }],
  ])("%s em outro mapa não gera número, animação, flash nem tremor", (_nome, fx) => {
    const { s, fire } = scene();
    fire(fx);
    expect(effects(s)).toBe(0);
  });

  it("no mesmo mapa, o efeito continua", () => {
    const { s, fire } = scene();
    fire({ t: "form", id: "vizinho", v: 4 });
    expect(s.float).toHaveBeenCalledOnce();
    expect(s.cameras.main.shake).toHaveBeenCalledOnce();
  });

  it("o aviso global (invasão, chefe mundial) continua em qualquer mapa", () => {
    const { s, fire } = scene();
    fire({ t: "event", text: "Invasão de Hollows!" });
    expect(s.float).toHaveBeenCalledOnce();
    expect(s.cameras.main.shake).toHaveBeenCalledOnce();
  });

  it("o dano no próprio jogador continua", () => {
    const { s, fire } = scene();
    fire({ t: "dmg", id: "eu", v: 5, from: "m_perto" });
    expect(s.float).toHaveBeenCalledOnce();
  });
});
