import { describe, it, expect } from "vitest";
import { passTierCards } from "../src/passTiers";

// #34: os cards do passe pareciam botões e não faziam nada. O card pronto resgata (a mesma
// mensagem seasonClaim do botão de cima, que pega todos os liberados); o bloqueado diz o que falta.
const st = { pts: 250, perTier: 100, tiers: 5, claimed: 1 }; // nível 2, prêmio 1 já pego

describe("cards do passe de temporada (#34)", () => {
  it("um card por nível e mais o card dos níveis além do último", () => {
    const cards = passTierCards(st);
    expect(cards.map((c) => c.label)).toEqual(["1", "2", "3", "4", "5", "5+"]);
  });

  it("já pego, pronto para pegar e bloqueado", () => {
    const [got, ready, locked, far] = passTierCards(st);
    expect(got).toMatchObject({ cls: "got", claimable: false });
    expect(got.hint).toMatch(/já pego/);
    expect(ready).toMatchObject({ cls: "ready", claimable: true });
    expect(ready.hint).toMatch(/Clique para pegar/);
    expect(locked).toMatchObject({ cls: "", claimable: false });
    expect(locked.hint).toBe("Libera no nível 3 do passe: faltam 50 pontos");
    expect(far.hint).toBe("Libera no nível 4 do passe: faltam 150 pontos");
  });

  it("o que falta e a ação aparecem no card, não só no tooltip (toque, teclado e leitor de tela)", () => {
    const [got, ready, locked, far] = passTierCards(st);
    expect(locked.note).toBe("faltam 50 pts");
    expect(far.note).toBe("faltam 150 pts");
    expect(ready.note).toBe("toque para pegar");
    expect(got.note).toBe("");
    expect(passTierCards(st).at(-1)!.note).toBe("faltam 350 pts");
    // nome acessível: nível e estado por extenso
    expect(locked.aria).toBe("Nível 3, bloqueado. Libera no nível 3 do passe: faltam 50 pontos");
    expect(ready.aria).toBe("Nível 2, pronto. Clique para pegar o prêmio liberado");
    expect(got.aria).toBe("Nível 1, já pego");
  });

  it("o card pronto avisa que pega todos os liberados de uma vez", () => {
    const cards = passTierCards({ ...st, pts: 400, claimed: 1 }); // níveis 2, 3 e 4 liberados
    expect(cards.filter((c) => c.claimable).map((c) => c.label)).toEqual(["2", "3", "4"]);
    expect(cards[1].hint).toMatch(/os 3 prêmios liberados/);
  });

  it("card dos níveis além do último: bloqueado até passar dele, pronto só se houver o que pegar", () => {
    const plus = (s: typeof st) => passTierCards(s).at(-1)!;
    expect(plus(st)).toMatchObject({ cls: "", claimable: false, hint: "Libera no nível 6 do passe: faltam 350 pontos" });
    expect(plus({ ...st, pts: 700, claimed: 5 })).toMatchObject({ cls: "ready", claimable: true });
    // já pegou tudo até o nível 7: não fica aceso como se houvesse prêmio
    expect(plus({ ...st, pts: 700, claimed: 7 })).toMatchObject({ cls: "", claimable: false });
  });
});
