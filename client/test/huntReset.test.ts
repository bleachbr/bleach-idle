import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { huntResetButton, isHuntEmpty, huntResetDoneLabel, type HuntView } from "../src/huntReset";

const hunt = (over: Partial<HuntView> = {}): HuntView => ({ exp: 0, gold: 0, kills: 0, items: [], ...over });

// #40: o clique trocava o texto para "✔ Contagem zerada", mas o "book" que o servidor devolve logo
// em seguida redesenhava a aba com "Zerar contagem" de novo, e o retorno sumia na hora
describe("botão Zerar contagem da Caçada (#40)", () => {
  it("contagem vazia: só zeros e nenhum loot", () => {
    expect(isHuntEmpty(hunt())).toBe(true);
    expect(isHuntEmpty(hunt({ kills: 1 }))).toBe(false);
    expect(isHuntEmpty(hunt({ exp: 10 }))).toBe(false);
    expect(isHuntEmpty(hunt({ gold: 5 }))).toBe(false);
    expect(isHuntEmpty(hunt({ items: [{ n: 1 }] }))).toBe(false);
  });

  it("depois de zerar (resposta do servidor), o botão continua dizendo que zerou e fica desabilitado", () => {
    expect(huntResetButton(hunt(), true)).toMatch(/<button type="button" class="claim" disabled[^>]*>✔ Contagem zerada<\/button>/);
  });

  it("vazio sem o jogador ter zerado: rótulo neutro, sem dizer que zerou", () => {
    const html = huntResetButton(hunt(), false);
    expect(html).toMatch(/<button type="button" class="claim" disabled[^>]*>Nada para zerar<\/button>/);
    expect(html).not.toContain(huntResetDoneLabel);
  });

  it("com algo contado, o botão fica habilitado para zerar (mesmo logo depois de um zerar)", () => {
    const expected = `<button type="button" class="claim">Zerar contagem</button>`;
    expect(huntResetButton(hunt({ kills: 3, exp: 100 }), false)).toBe(expected);
    expect(huntResetButton(hunt({ kills: 1 }), true)).toBe(expected);
  });
});

// Os testes acima só valem se a aba Caçada do main.ts usar o helper. main.ts mexe no DOM e não
// importa em teste, então a ligação é conferida no código-fonte da aba.
describe("aba Caçada do main.ts usa o helper do botão (#40)", () => {
  const main = readFileSync(fileURLToPath(new URL("../src/main.ts", import.meta.url)), "utf8");
  const start = main.indexOf(`tab === "cacada"`);
  const block = main.slice(start, main.indexOf("} else {", start));

  it("o botão vem de huntResetButton, sem HTML fixo de Zerar contagem", () => {
    expect(start).toBeGreaterThanOrEqual(0);
    expect(block).toMatch(/huntResetButton\(h, huntJustReset\)/);
    expect(block).not.toMatch(/>Zerar contagem</);
  });

  it("o clique marca que o jogador zerou, para o redesenho manter o retorno", () => {
    expect(block).toMatch(/onclick[\s\S]*huntJustReset = true[\s\S]*room\.send\("huntReset"\)/);
  });
});
