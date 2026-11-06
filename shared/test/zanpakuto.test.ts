import { describe, it, expect } from "vitest";
import {
  generateZanpakuto,
  formatZanpakutoRelease,
  zanpakutoToSkillDef,
  SPIRIT_AFFINITIES,
  type ZanpakutoSpirit,
  type SpiritAffinity,
} from "../src/zanpakuto";
import { techniques, techniqueFor, TECH_SLOTS } from "../src/evolution";

describe("JH-03: Geração Procedural de Zanpakutō e Despertar da Shikai (shared)", () => {
  describe("Geração e Estrutura da Zanpakutō", () => {
    it("generateZanpakuto retorna objeto ZanpakutoSpirit válido com todos os campos", () => {
      const z = generateZanpakuto("test_seed_alpha");

      expect(z).toBeDefined();
      expect(typeof z.shikaiName).toBe("string");
      expect(z.shikaiName.length).toBeGreaterThan(2);

      expect(typeof z.callPhrase).toBe("string");
      expect(z.callPhrase.length).toBeGreaterThan(1);

      expect(typeof z.bankaiName).toBe("string");
      expect(z.bankaiName.length).toBeGreaterThan(z.shikaiName.length);

      expect(SPIRIT_AFFINITIES).toContain(z.affinity);
      expect(typeof z.spiritLore).toBe("string");
      expect(z.spiritLore.length).toBeGreaterThan(10);

      expect(z.shikaiSkill).toBeDefined();
      expect(z.shikaiSkill.id).toMatch(/^shikai_/);
      expect(z.shikaiSkill.name).toContain(z.shikaiName);
      expect(z.shikaiSkill.element).toBe(z.affinity);
      expect(z.shikaiSkill.power).toBeGreaterThanOrEqual(3.0);
      expect(z.shikaiSkill.reiCost).toBeGreaterThan(0);
      expect(z.shikaiSkill.cooldownSec).toBeGreaterThan(0);
      expect(typeof z.shikaiSkill.desc).toBe("string");
    });

    it("geração com seed é estritamente determinística", () => {
      const z1 = generateZanpakuto("fixed_seed_42");
      const z2 = generateZanpakuto("fixed_seed_42");
      const z3 = generateZanpakuto("another_seed_99");

      expect(z1).toEqual(z2);
      expect(z1.shikaiName).toBe(z2.shikaiName);
      expect(z1.bankaiName).toBe(z2.bankaiName);
      expect(z1.callPhrase).toBe(z2.callPhrase);
      expect(z1.affinity).toBe(z2.affinity);

      // Sementes diferentes devem gerar variações
      expect(z1).not.toEqual(z3);
    });

    it("geração sem seed produz espíritos válidos usando aleatoriedade", () => {
      const z = generateZanpakuto();
      expect(z).toBeDefined();
      expect(SPIRIT_AFFINITIES).toContain(z.affinity);
      expect(z.shikaiName).toBeDefined();
      expect(z.bankaiName).toBeDefined();
    });

    it("cobre as afinidades espirituais canônicas", () => {
      const expectedAffinities: SpiritAffinity[] = [
        "fire",
        "ice",
        "lightning",
        "shadow",
        "wind",
        "kido",
        "earth",
        "poison",
      ];
      expect(SPIRIT_AFFINITIES).toEqual(expect.arrayContaining(expectedAffinities));

      // Testando múltiplas seeds para cobrir diversas afinidades
      const seenAffinities = new Set<SpiritAffinity>();
      for (let i = 0; i < 100; i++) {
        const z = generateZanpakuto(`seed_aff_${i}`);
        seenAffinities.add(z.affinity);
      }
      expect(seenAffinities.size).toBe(8);
    });

    it("inclui frases de liberação coerentes e canônicas", () => {
      const canonicalPhrases = [
        "Uive",
        "Queime até as cinzas",
        "Desperte",
        "Corte",
        "Espalhe-se",
        "Congele",
        "Devore",
        "Dance",
      ];

      const foundPhrases = new Set<string>();
      for (let i = 0; i < 200; i++) {
        const z = generateZanpakuto(`seed_phrase_${i}`);
        foundPhrases.add(z.callPhrase);
      }

      for (const phrase of canonicalPhrases) {
        expect(foundPhrases.has(phrase)).toBe(true);
      }
    });

    it("gera nomes solenes de Bankai canônicos (Daiguren, Kokujō, Guren)", () => {
      const bankaiNames: string[] = [];
      for (let i = 0; i < 150; i++) {
        const z = generateZanpakuto(`seed_bankai_${i}`);
        bankaiNames.push(z.bankaiName);
      }

      const hasDaiguren = bankaiNames.some((b) => b.startsWith("Daiguren"));
      const hasKokujo = bankaiNames.some((b) => b.startsWith("Kokujō"));
      const hasGuren = bankaiNames.some((b) => b.startsWith("Guren"));

      expect(hasDaiguren).toBe(true);
      expect(hasKokujo).toBe(true);
      expect(hasGuren).toBe(true);
    });
  });

  describe("Helper formatZanpakutoRelease", () => {
    it("formata a frase solene de liberação no padrão 'Frase, Nome!'", () => {
      const mockSpirit: ZanpakutoSpirit = {
        shikaiName: "Karyūmaru",
        callPhrase: "Uive",
        bankaiName: "Guren Karyūmaru",
        affinity: "fire",
        spiritLore: "Lore de teste",
        shikaiSkill: {
          id: "shikai_karyumaru",
          name: "Karyūmaru: Chamas Espirituais",
          element: "fire",
          power: 3.5,
          reiCost: 35,
          cooldownSec: 6,
          desc: "Desc",
        },
      };

      const release = formatZanpakutoRelease(mockSpirit);
      expect(release).toBe("Uive, Karyūmaru!");
    });
  });

  describe("Conversão e Integração de Habilidades (Slot 4 / Tecla 4)", () => {
    it("zanpakutoToSkillDef cria definição de habilidade válida para a engine", () => {
      const z = generateZanpakuto("skill_def_seed");
      const skill = zanpakutoToSkillDef(z);

      expect(skill.name).toBe(z.shikaiSkill.name);
      expect(skill.cost).toBe(z.shikaiSkill.reiCost);
      expect(skill.mult).toBe(z.shikaiSkill.power);
      expect(skill.cdMs).toBe(z.shikaiSkill.cooldownSec * 1000);
      expect(skill.range).toBe(4);
      expect(typeof skill.color).toBe("number");
      expect(skill.minLevel).toBe(1);
    });

    it("recruta sem Zanpakutō possui técnicas padrão (Hadō #4: Byakurai na tecla 4)", () => {
      const techsM = techniques("recruta_m");
      expect(TECH_SLOTS[1]).toBe(4);
      expect(techsM[1].name).toBe("Hadō #4: Byakurai");

      const tech4M = techniqueFor("recruta_m", 1, 0);
      expect(tech4M?.name).toBe("Hadō #4: Byakurai");
    });

    it("recruta com Zanpakutō atribuída substitui a tecla 4 pela técnica da Shikai", () => {
      const z = generateZanpakuto("shikai_hero_recruit");
      const techsAwakened = techniques("recruta_m", z);

      expect(TECH_SLOTS[1]).toBe(4);
      expect(techsAwakened[1].name).toBe(z.shikaiSkill.name);
      expect(techsAwakened[1].cost).toBe(z.shikaiSkill.reiCost);
      expect(techsAwakened[1].mult).toBe(z.shikaiSkill.power);

      const tech4Awakened = techniqueFor("recruta_m", 1, 0, z);
      expect(tech4Awakened?.name).toBe(z.shikaiSkill.name);
      expect(tech4Awakened?.cdMs).toBe(z.shikaiSkill.cooldownSec * 1000);
    });
  });
});
