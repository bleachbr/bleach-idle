import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { rankingEmptyText } from "../src/rankingEmpty";

// abas do painel #ranking, lidas do próprio index.html para não esquecer aba nova
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const panel = html.slice(html.indexOf('<div id="ranking"'), html.indexOf('<div id="ranking-body"'));
const TABS = [...panel.matchAll(/data-tab="([a-z]+)"/g)].map((m) => m[1]);

describe("ranking vazio explica como pontuar (#37)", () => {
  it("lê as abas do painel", () => {
    expect(TABS).toEqual(expect.arrayContaining(["nivel", "poder", "abates", "guildas", "conquistas", "bestiario", "dangai"]));
  });

  it("aba que filtra por pontuação tem explicação própria, não a mensagem genérica", () => {
    for (const tab of ["abates", "guildas", "conquistas", "bestiario", "dangai"]) {
      expect(rankingEmptyText(tab), tab).not.toBe("Ninguém aqui ainda.");
    }
  });

  it("Dangai pontua pelo andar mais fundo (dgBest), não por velocidade, e se chega pelo Viajar", () => {
    const t = rankingEmptyText("dangai");
    expect(t).toMatch(/andar mais fundo/);
    expect(t).not.toMatch(/rápid/);
    expect(t).toMatch(/Viajar/);
    expect(t).toMatch(/nível 20/); // TRAVEL dangai.minLevel
    expect(t).toMatch(/3 min/); // DANGAI.timeMs
  });

  it("Abates conta só PvP no mundo aberto: duelo da Arena não soma frags", () => {
    const t = rankingEmptyText("abates");
    expect(t).toMatch(/PvP/);
    expect(t).toMatch(/nível 10/); // PVP_MIN_LEVEL
    expect(t).toMatch(/Arena não/);
  });

  it("Guildas soma os abates dos membros e ensina a fundar", () => {
    const t = rankingEmptyText("guildas");
    expect(t).toMatch(/abates/);
    expect(t).not.toMatch(/prestígio/);
    expect(t).toMatch(/\/guilda criar Nome \(500 kan, nível 10\+\)/);
  });

  it("Bestiário diz quantos abates liberam um estágio", () => {
    const t = rankingEmptyText("bestiario");
    expect(t).toMatch(/25, 150 e 500/);
    expect(t).toMatch(/chefes: 1, 5 e 15/);
  });

  it("aba sem regra especial e aba desconhecida caem no texto genérico", () => {
    expect(rankingEmptyText("nivel")).toBe("Ninguém aqui ainda.");
    expect(rankingEmptyText("constructor")).toBe("Ninguém aqui ainda.");
  });
});
