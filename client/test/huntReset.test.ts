import { describe, it, expect } from "vitest";
import { huntResetButton, isHuntEmpty, type HuntView } from "../src/huntReset";

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
    expect(huntResetButton(hunt())).toMatch(/<button type="button" class="claim" disabled[^>]*>✔ Contagem zerada<\/button>/);
  });

  it("com algo contado, o botão fica habilitado para zerar", () => {
    expect(huntResetButton(hunt({ kills: 3, exp: 100 }))).toBe(`<button type="button" class="claim">Zerar contagem</button>`);
  });
});
