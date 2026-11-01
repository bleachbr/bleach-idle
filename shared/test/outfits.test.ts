import { describe, it, expect } from "vitest";
import { CHARS, COSMETICS, COS_KINDS, COS_LOOK_BASES, SPRITES, outfitFits, spriteKey } from "../src";

// R-13: trajes da Loja de Cristais. Uma folha por combinação <base>__<look>, só na forma base.
const outfits = COSMETICS.filter((c) => c.kind === "outfit");
const CAPTAINS = ["hitsugaya", "byakuya", "kenpachi", "ukitake", "shunsui"];

describe("trajes da Loja de Cristais", () => {
  it("cada traje é vendido, tem um visual e aparece numa aba", () => {
    expect(outfits.map((c) => c.look).sort()).toEqual(["capitao", "karakura", "vizard"]);
    for (const c of outfits) expect(c.price > 0 && !c.season).toBe(true);
    expect(COS_KINDS.some((k) => k.kind === "outfit")).toBe(true);
  });

  it("vale para a forma base de todos os personagens", () => {
    expect([...COS_LOOK_BASES].sort()).toEqual(Object.values(CHARS).map((c) => c.forms[0].sprite).sort());
  });

  it("uniforme e máscara em todos; haori de capitão só em quem ainda não é capitão", () => {
    for (const b of COS_LOOK_BASES) {
      expect(spriteKey(b, "karakura")).toBe(`${b}__karakura`);
      expect(spriteKey(b, "vizard")).toBe(`${b}__vizard`);
      expect(spriteKey(b, "capitao")).toBe(CAPTAINS.includes(b) ? b : `${b}__capitao`);
    }
  });

  it("outfitFits diz se o traje muda o personagem (servidor e loja usam a mesma regra)", () => {
    expect(outfitFits("ichigo", "capitao")).toBe(true);
    expect(outfitFits("hitsugaya", "capitao")).toBe(false);
    expect(outfitFits("hitsugaya", "karakura")).toBe(true);
    expect(outfitFits("constructor", "karakura")).toBe(false);
    expect(outfitFits("", "karakura")).toBe(false);
  });

  it("forma liberada não veste o traje", () => {
    expect(spriteKey("ichigo_bankai", "karakura")).toBe("ichigo_bankai");
    expect(spriteKey("hitsugaya_bankai", "vizard")).toBe("hitsugaya_bankai");
  });

  it("não muda a regra do equipamento: haori e máscara equipados seguem só onde já valiam", () => {
    expect(spriteKey("sado", "haori")).toBe("sado");
    expect(spriteKey("rukia", "mask")).toBe("rukia");
    expect(spriteKey("ichigo_shikai", "mask")).toBe("ichigo_shikai__mask");
  });

  it("as folhas dos trajes ficam fora do preload, com 8 quadros", () => {
    const lazy = Object.entries(SPRITES).filter(([, d]) => d.lazy);
    expect(lazy.length).toBe(COS_LOOK_BASES.length * 3 - CAPTAINS.length);
    for (const [k, d] of lazy) expect([k, d.frame, d.cols]).toEqual([k, 48, 8]);
  });
});
