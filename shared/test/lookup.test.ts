import { describe, it, expect } from "vitest";
import { own, isOwnKey } from "../src/lookup";
import { CHARS, ITEMS, QUEST_BY_ID, COSMETIC } from "../src";

describe("own: busca em tabela com chave vinda da rede", () => {
  it("devolve a entrada de uma chave própria", () => {
    expect(own(CHARS, "ichigo")?.id).toBe("ichigo");
    expect(own(ITEMS, "onigiri")?.name).toBeTruthy();
  });

  it.each(["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf", "isPrototypeOf"])(
    "recusa a chave de protótipo %s em todas as tabelas de dados",
    (chave) => {
      for (const tabela of [CHARS, ITEMS, QUEST_BY_ID, COSMETIC]) expect(own(tabela, chave)).toBeUndefined();
    },
  );

  it("recusa chave que não é texto", () => {
    for (const chave of [undefined, null, 0, 1, {}, [], ["ichigo"], true]) expect(own(CHARS, chave)).toBeUndefined();
  });

  it("recusa chave inexistente", () => {
    expect(own(CHARS, "naoexiste")).toBeUndefined();
  });

  it("o problema que ela resolve existe: o acesso direto devolve algo para chaves de protótipo", () => {
    expect((CHARS as Record<string, unknown>)["constructor"]).toBeDefined();
  });
});

describe("isOwnKey: substitui `chave in objeto`", () => {
  it("só aceita propriedade própria", () => {
    const ativas = { patrulha: 3 };
    expect(isOwnKey(ativas, "patrulha")).toBe(true);
    expect(isOwnKey(ativas, "constructor")).toBe(false);
    expect(isOwnKey(ativas, "__proto__")).toBe(false);
    expect(isOwnKey(ativas, undefined)).toBe(false);
    expect("constructor" in ativas).toBe(true); // o operador `in` enxerga o protótipo
  });
});
