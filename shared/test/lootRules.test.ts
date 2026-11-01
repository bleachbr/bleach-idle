import { describe, it, expect } from "vitest";
import { ITEMS, applyLootRules, parseLootRules, collectItems, seenLoot } from "../src";

// M3-03 (ADR-003 do Social avançado): filtro de loot do Auto Helper
describe("parseLootRules", () => {
  it("aceita vender e ignorar por item do catálogo; pegar apaga a regra", () => {
    expect(parseLootRules({ fragmento: "sell", garra: "ignore", pocao_vida: "take" })).toEqual({ fragmento: "sell", garra: "ignore" });
  });

  it("descarta item que não existe, chave do protótipo e valor fora da lista", () => {
    const raw = JSON.parse('{"__proto__": "sell", "constructor": "ignore", "nao_existe": "sell", "fragmento": "vender", "garra": 1}');
    expect(parseLootRules(raw)).toEqual({});
  });

  it("recusa o que não é objeto e objeto com mais chaves que o catálogo", () => {
    expect(parseLootRules("sell")).toBeNull();
    expect(parseLootRules(null)).toBeNull();
    expect(parseLootRules(["sell"])).toBeNull();
    const big = Object.fromEntries(Array.from({ length: Object.keys(ITEMS).length + 1 }, (_, i) => [`x${i}`, "sell"]));
    expect(parseLootRules(big)).toBeNull();
  });
});

describe("applyLootRules", () => {
  const drop = [{ id: "fragmento", qty: 2 }, { id: "garra", qty: 1 }, { id: "pocao_vida", qty: 1 }];

  it("separa pegar, vender e ignorar, e calcula o kan da venda pelo preço da loja", () => {
    const r = applyLootRules(drop, { fragmento: "sell", garra: "ignore" }, new Set());
    expect(r.take).toEqual([{ id: "pocao_vida", qty: 1 }]);
    expect(r.sell).toEqual([{ id: "fragmento", qty: 2 }]);
    expect(r.ignored).toEqual([{ id: "garra", qty: 1 }]);
    expect(r.gold).toBe(ITEMS.fragmento.sell * 2);
  });

  it("sem regra, pega tudo", () => {
    expect(applyLootRules(drop, {}, new Set()).take).toEqual(drop);
  });

  it("item de missão de coleta ativa é sempre pego, mesmo com regra de vender ou ignorar", () => {
    const r = applyLootRules(drop, { fragmento: "sell", garra: "ignore" }, new Set(["fragmento", "garra"]));
    expect(r.take.map((s) => s.id)).toEqual(["fragmento", "garra", "pocao_vida"]);
    expect(r.gold).toBe(0);
  });
});

describe("itens de missão e itens já vistos", () => {
  it("missões de coleta ativas e ainda abertas pedem o item delas", () => {
    // fragmentos: coleta de 15 fragmentos; patrulha é de caça
    expect([...collectItems({ fragmentos: 0, patrulha: 0 })]).toEqual(["fragmento"]);
    expect(collectItems(JSON.parse('{"__proto__": 0, "nao_existe": 0}')).size).toBe(0);
  });

  it("itens já vistos: o loot das espécies que o personagem já abateu", () => {
    const seen = seenLoot({ hollow_menor: 3 });
    expect(seen).toContain("fragmento");
    expect(seenLoot({}).length).toBe(0);
    expect(seenLoot(JSON.parse('{"__proto__": 9}')).length).toBe(0);
  });
});
