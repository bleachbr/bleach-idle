import { describe, it, expect } from "vitest";
import {
  generateZanpakuto,
  buildDefaultBankaiSkill,
  getBankaiSkill,
  zanpakutoToBankaiSkillDef,
  formatBankaiRelease,
  canAwakenBankai,
  canTakeCaptainExam,
  getMilitaryRank,
  hasDimensionalTravelPermission,
  SPIRIT_AFFINITIES,
  type SpiritAffinity,
  type ZanpakutoSpirit,
} from "../src/zanpakuto";
import { techniques, techniqueFor, maxForm, TECH_SLOTS } from "../src/evolution";
import { ITEMS, SHOP } from "../src/items";
import { TRAVEL } from "../src/social";

describe("JH-06: Desafio do Tenshintai, Despertar da Bankai e Exame de Capitão (shared)", () => {
  describe("Geração da Técnica Suprema de Bankai e Afinidades Elementais", () => {
    it("generateZanpakuto gera bankaiSkill válida com multiplicador épico e atributos canônicos", () => {
      const z = generateZanpakuto("tenshintai_seed_100");

      expect(z.bankaiSkill).toBeDefined();
      expect(z.bankaiSkill?.id).toMatch(/^bankai_/);
      expect(z.bankaiSkill?.name).toContain(z.bankaiName);
      expect(z.bankaiSkill?.element).toBe(z.affinity);
      expect(z.bankaiSkill?.power).toBeGreaterThanOrEqual(8.5);
      expect(z.bankaiSkill?.reiCost).toBeGreaterThanOrEqual(70);
      expect(z.bankaiSkill?.cooldownSec).toBeGreaterThan(15);
      expect(typeof z.bankaiSkill?.desc).toBe("string");
      expect(z.bankaiSkill?.area).toBeGreaterThanOrEqual(2);
    });

    it("geração de bankaiSkill com seed é estritamente determinística", () => {
      const z1 = generateZanpakuto("fixed_bankai_seed_42");
      const z2 = generateZanpakuto("fixed_bankai_seed_42");
      const z3 = generateZanpakuto("another_bankai_seed_99");

      expect(z1.bankaiSkill).toEqual(z2.bankaiSkill);
      expect(z1.bankaiSkill?.name).toBe(z2.bankaiSkill?.name);
      expect(z1.bankaiSkill?.power).toBe(z2.bankaiSkill?.power);
      expect(z1.bankaiSkill?.status).toEqual(z2.bankaiSkill?.status);
      expect(z1.bankaiSkill).not.toEqual(z3.bankaiSkill);
    });

    it("cobre todas as 8 afinidades elementais com efeitos temáticos coerentes", () => {
      for (const affinity of SPIRIT_AFFINITIES) {
        const skill = buildDefaultBankaiSkill(`Bankai ${affinity}`, affinity);
        expect(skill.element).toBe(affinity);
        expect(skill.power).toBeGreaterThanOrEqual(8.5);
        expect(skill.status).toBeDefined();

        if (affinity === "fire" || affinity === "poison") {
          expect(skill.status?.kind).toBe("dot");
          expect(skill.status?.dotRatio).toBeGreaterThan(0.2);
        } else if (affinity === "ice") {
          expect(skill.status?.kind).toBe("freeze");
          expect(skill.status?.durationMs).toBeGreaterThanOrEqual(3000);
        } else if (affinity === "lightning" || affinity === "earth" || affinity === "kido") {
          expect(skill.status?.kind).toBe("stun");
          expect(skill.status?.durationMs).toBeGreaterThanOrEqual(2500);
        } else if (affinity === "shadow" || affinity === "wind") {
          expect(skill.status?.kind).toBe("slow");
          expect(skill.status?.slowMult).toBeGreaterThan(1.0);
        }
      }
    });

    it("getBankaiSkill e zanpakutoToBankaiSkillDef garantem retrocompatibilidade", () => {
      const oldSpirit: ZanpakutoSpirit = {
        shikaiName: "Hyōringetsu",
        callPhrase: "Congele",
        bankaiName: "Daiguren Hyōringetsu",
        affinity: "ice",
        spiritLore: "Dragão de gelo",
        shikaiSkill: {
          id: "shikai_hyoringetsu",
          name: "Hyōringetsu: Lâmina Congelante",
          element: "ice",
          power: 3.5,
          reiCost: 35,
          cooldownSec: 6,
          desc: "Gelo",
        },
      };

      const bSkill = getBankaiSkill(oldSpirit);
      expect(bSkill).toBeDefined();
      expect(bSkill.element).toBe("ice");
      expect(bSkill.status?.kind).toBe("freeze");

      const skillDef = zanpakutoToBankaiSkillDef(oldSpirit);
      expect(skillDef.name).toBe(bSkill.name);
      expect(skillDef.minLevel).toBe(100);
      expect(skillDef.mult).toBe(bSkill.power);
      expect(skillDef.status?.kind).toBe("freeze");
      expect(skillDef.range).toBe(6);
      expect(skillDef.area).toBe(3);
    });
  });

  describe("Integração de Técnicas e Evolução de Formas (Slot 6 e Bankai)", () => {
    it("sem despertar da Bankai, o slot 6 mantém a técnica básica de nível 100", () => {
      const z = generateZanpakuto("test_slot6_seed");
      const techsLocked = techniques("recruta_m", z, false);
      // Slot 6 é o índice 3 de TECH_SLOTS ([1, 4, 5, 6])
      expect(techsLocked[3].name).toBe("Hadō #33: Sōkatsui");

      const tech4Locked = techniqueFor("recruta_m", 3, 0, z, false);
      expect(tech4Locked?.name).toBe("Hadō #33: Sōkatsui");
    });

    it("com despertar da Bankai (bankaiAwakened = true), o slot 6 ganha a técnica suprema da Bankai", () => {
      const z = generateZanpakuto("test_slot6_bankai_seed");
      const techsAwakened = techniques("recruta_m", z, true);

      expect(techsAwakened[3].name).toBe(z.bankaiSkill?.name);
      expect(techsAwakened[3].mult).toBe(z.bankaiSkill?.power);
      expect(techsAwakened[3].cost).toBe(z.bankaiSkill?.reiCost);
      expect(techsAwakened[3].status).toEqual(z.bankaiSkill?.status);

      const tech6 = techniqueFor("recruta_m", 3, 1, z, true);
      expect(tech6?.name).toBe(z.bankaiSkill?.name);
    });

    it("maxForm libera a forma Bankai (1) no nível 100 apenas se bankaiAwakened = true para recrutas", () => {
      expect(maxForm("recruta_m", 99, false)).toBe(0);
      expect(maxForm("recruta_m", 100, false)).toBe(0);
      expect(maxForm("recruta_m", 100, true)).toBe(1);

      expect(maxForm("recruta_f", 99, false)).toBe(0);
      expect(maxForm("recruta_f", 100, false)).toBe(0);
      expect(maxForm("recruta_f", 100, true)).toBe(1);
    });
  });

  describe("Validação de Requisitos do Tenshintai e Exame de Capitão", () => {
    it("canAwakenBankai exige nível 100 e promoção a oficial", () => {
      expect(canAwakenBankai({ level: 99, prog: { promotedRank: true } }).ok).toBe(false);
      expect(canAwakenBankai({ level: 100, prog: { promotedRank: false } }).ok).toBe(false);
      expect(canAwakenBankai({ level: 100, prog: { promotedRank: true, bankaiAwakened: true } }).ok).toBe(false);
      expect(canAwakenBankai({ level: 100, prog: { promotedRank: true, bankaiAwakened: false } }).ok).toBe(true);
    });

    it("canTakeCaptainExam exige nível 100 e comprovação da Bankai despertada", () => {
      expect(canTakeCaptainExam({ level: 99, prog: { bankaiAwakened: true } }).ok).toBe(false);
      expect(canTakeCaptainExam({ level: 100, prog: { bankaiAwakened: false } }).ok).toBe(false);
      expect(canTakeCaptainExam({ level: 100, prog: { bankaiAwakened: true, captainRank: true } }).ok).toBe(false);
      expect(canTakeCaptainExam({ level: 100, prog: { bankaiAwakened: true, captainRank: false } }).ok).toBe(true);
    });

    it("getMilitaryRank retorna 'Recruta', 'Oficial' ou 'Capitão' corretamente", () => {
      expect(getMilitaryRank({})).toBe("Recruta");
      expect(getMilitaryRank({ prog: {} })).toBe("Recruta");
      expect(getMilitaryRank({ prog: { promotedRank: true } })).toBe("Oficial");
      expect(getMilitaryRank({ prog: { promotedRank: true, captainRank: true } })).toBe("Capitão");
      expect(getMilitaryRank({ captainRank: true })).toBe("Capitão");
      expect(getMilitaryRank({ promotedRank: true })).toBe("Oficial");
    });

    it("hasDimensionalTravelPermission concede acesso dimensional para o Palácio Real apenas a Capitães", () => {
      expect(hasDimensionalTravelPermission({})).toBe(false);
      expect(hasDimensionalTravelPermission({ captainRank: false })).toBe(false);
      expect(hasDimensionalTravelPermission({ captainRank: true })).toBe(true);
    });

    it("formatBankaiRelease gera mensagem solene canônica", () => {
      const z = generateZanpakuto("lore_msg_seed");
      const msg = formatBankaiRelease(z, "Renato");
      expect(msg).toBe(`Renato liberou sua Bankai: "${z.bankaiName}"!`);
    });
  });

  describe("Artefato Ancestral Tenshintai e Viagem Dimensional ao Palácio Real", () => {
    it("Tenshintai está registrado em ITEMS e disponível na loja de Kisuke Urahara", () => {
      expect(ITEMS.tenshintai).toBeDefined();
      expect(ITEMS.tenshintai.name).toBe("Tenshintai");
      expect(ITEMS.tenshintai.buy).toBeGreaterThan(0);
      expect(SHOP).toContain("tenshintai");
    });

    it("Palácio Real (Reiōkyū) está presente em TRAVEL com exigência de patente de Capitão", () => {
      const reiokyu = TRAVEL.find((t) => t.id === "reiokyu");
      expect(reiokyu).toBeDefined();
      expect(reiokyu?.name).toContain("Palácio Real");
      expect(reiokyu?.minLevel).toBe(100);
      expect(reiokyu?.requiresCaptain).toBe(true);
    });
  });
});
