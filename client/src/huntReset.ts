// Botão "Zerar contagem" da aba Caçada do Livro. Quem zera é o servidor (handler "huntReset" no
// WorldRoom, que devolve o "book" já zerado); aqui só se decide o estado do botão. Sem DOM, para testar.

export type HuntView = { exp: number; gold: number; kills: number; items: unknown[] };

/** Nada contado desde o último zerar (ou desde a entrada). */
export const isHuntEmpty = (h: HuntView) => !h.exp && !h.gold && !h.kills && !h.items.length;

/** Zerado, o botão fica desabilitado e diz isso: o retorno do clique sobrevive ao redesenho com o
 * "book" que o servidor devolve logo depois (#40), e não há o que zerar até o próximo abate. */
export function huntResetButton(h: HuntView): string {
  return isHuntEmpty(h)
    ? `<button type="button" class="claim" disabled title="Nada contado desde que zerou. Volte a caçar.">✔ Contagem zerada</button>`
    : `<button type="button" class="claim">Zerar contagem</button>`;
}
