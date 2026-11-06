import { describe, it, expect } from "vitest";
import { CHARS, isRecruit, ITEMS, SPRITES } from "../src";

describe("JH-01: Arquétipos de Recruta Shinigami", () => {
  it("catálogo CHARS contém os arquétipos recruta_m e recruta_f", () => {
    expect(CHARS.recruta_m).toBeDefined();
    expect(CHARS.recruta_f).toBeDefined();
    expect(CHARS.recruta_m.id).toBe("recruta_m");
    expect(CHARS.recruta_f.id).toBe("recruta_f");
  });

  it("isRecruit identifica corretamente recrutas masculinos e femininos e rejeita veteranos", () => {
    expect(isRecruit("recruta_m")).toBe(true);
    expect(isRecruit("recruta_f")).toBe(true);
    expect(isRecruit("recruta_outro")).toBe(true);
    expect(isRecruit("ichigo")).toBe(false);
    expect(isRecruit("rukia")).toBe(false);
    expect(isRecruit("renji")).toBe(false);
  });

  it("recrutas possuem sprite base e folhas registradas no SPRITES", () => {
    expect(CHARS.recruta_m.forms[0].sprite).toBe("recruta_m");
    expect(CHARS.recruta_f.forms[0].sprite).toBe("recruta_f");
    expect(SPRITES.recruta_m).toEqual({ frame: 48, cols: 8 });
    expect(SPRITES.recruta_f).toEqual({ frame: 48, cols: 8 });
  });

  it("recrutas iniciam com Shihakusho básico e espada Asauchi", () => {
    expect(ITEMS.asauchi).toBeDefined();
    expect(ITEMS.asauchi.slot).toBe("weapon");
    expect(ITEMS.asauchi.atk).toBeGreaterThan(0);
    expect(ITEMS.shihakusho).toBeDefined();
    expect(ITEMS.shihakusho.slot).toBe("armor");

    expect(CHARS.recruta_m.initialEquip?.weapon).toBe("asauchi");
    expect(CHARS.recruta_m.initialEquip?.armor).toBe("shihakusho");
    expect(CHARS.recruta_f.initialEquip?.weapon).toBe("asauchi");
    expect(CHARS.recruta_f.initialEquip?.armor).toBe("shihakusho");
  });

  it("habilidades e técnicas iniciais dos recrutas estão configuradas", () => {
    for (const id of ["recruta_m", "recruta_f"] as const) {
      const ch = CHARS[id];
      expect(ch.skill.name).toBe("Golpe de Asauchi");
      expect(ch.skill.range).toBe(2);
      expect(ch.techs.length).toBe(3);
      expect(ch.techs[0].minLevel).toBe(25);
    }
  });
});
