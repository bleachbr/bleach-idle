// Aba Diário do Livro: recompensa de entrada (sequência de 7 dias) e missões do dia. Quem decide se
// já pegou é o servidor (handler "daily" no WorldRoom); aqui só se monta o HTML. Sem DOM, para testar.
import { ITEMS } from "../../shared/src";

export type Reward = { gold: number; items?: { id: string; qty: number }[] };
export type DailyView = { claimed: boolean; streak: number; index: number; rewards: Reward[] };

/** "100 kan + 3x Poção de Cura" (texto do catálogo de shared/, seguro para innerHTML). */
export const rewardText = (r: Reward) =>
  [r.gold ? `${r.gold} kan` : "", ...(r.items ?? []).map((i) => `${i.qty}x ${ITEMS[i.id]?.name ?? i.id}`)].filter(Boolean).join(" + ");

/** Texto do botão entre o clique e a resposta do servidor. */
export const claimPendingLabel = "Pegando…";

/** Texto do botão enquanto a recompensa de hoje está disponível. */
export const claimLabel = "Pegar a recompensa de hoje";

/** Tempo sem resposta do servidor depois do qual o botão volta a ficar clicável. */
export const claimTimeoutMs = 4000;

/** Seção da recompensa de entrada, com o botão de pegar. */
export function dailyRewardHtml(d: DailyView): string {
  return `<h3>Recompensa de entrada</h3><p class="hint">Pegue uma vez por dia (o dia vira à meia-noite de Brasília). Perder um dia zera a sequência.</p>
        <div><b>Sequência: ${d.streak} ${d.streak === 1 ? "dia" : "dias"}</b></div>
        <div class="days">${d.rewards.map((r, i) => `<div class="${i < d.index || (d.claimed && i === d.index) ? "got" : ""}${i === d.index ? " today" : ""}"><b>Dia ${i + 1}</b><br>${rewardText(r)}</div>`).join("")}</div>
        <button type="button" class="claim" ${d.claimed ? `disabled title="Recompensa diária já resgatada hoje. Volte após a meia-noite de Brasília."` : ""}>${d.claimed ? "Já pegou hoje" : claimLabel}</button>`;
}

/** Aba inteira: `missionsHtml` vem pronto do main.ts (usa escHtml e a barra de progresso de lá).
 * A recompensa vem primeiro: depois das três missões, o botão ficava abaixo da área visível do
 * #book-body, que rola (#23). */
export function dailyTabHtml(d: DailyView, missionsHtml: string): string {
  return dailyRewardHtml(d) + missionsHtml;
}
