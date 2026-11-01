// Botão "Zerar contagem" da aba Caçada do Livro. Quem zera é o servidor (handler "huntReset" no
// WorldRoom, que devolve o "book" já zerado); aqui só se decide o estado do botão. Sem DOM, para testar.

export type HuntView = { exp: number; gold: number; kills: number; items: unknown[] };

/** Retorno do clique: o jogador acabou de zerar. */
export const huntResetDoneLabel = "✔ Contagem zerada";

/** Nada contado desde o último zerar (ou desde a entrada). */
export const isHuntEmpty = (h: HuntView) => !h.exp && !h.gold && !h.kills && !h.items.length;

/** Vazio, o botão fica desabilitado. Se foi o jogador que zerou (`justReset`), diz isso: o retorno
 * do clique sobrevive ao redesenho com o "book" que o servidor devolve logo depois (#40). Vazio sem
 * ter zerado (acabou de entrar, ainda não caçou), o rótulo é neutro, para não dizer que zerou. */
export function huntResetButton(h: HuntView, justReset: boolean): string {
  if (!isHuntEmpty(h)) return `<button type="button" class="claim">Zerar contagem</button>`;
  return justReset
    ? `<button type="button" class="claim" disabled title="Nada contado desde que zerou. Volte a caçar.">${huntResetDoneLabel}</button>`
    : `<button type="button" class="claim" disabled title="Nada contado ainda. Volte a caçar.">Nada para zerar</button>`;
}
