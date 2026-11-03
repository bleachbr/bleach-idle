// Aba Diário do Livro: recompensa de entrada (sequência de 7 dias) e missões do dia. Quem decide se
// já pegou é o servidor (handler "daily" no WorldRoom); aqui só se monta o HTML. Sem DOM, para testar.
import { ITEMS, dailyResetRemainingMs } from "../../shared/src";

export type Reward = { gold: number; items?: { id: string; qty: number }[] };
export type DailyView = { claimed: boolean; streak: number; index: number; rewards: Reward[]; nowMs?: number };

/** "100 kan + 3x Poção de Cura" (texto do catálogo de shared/, seguro para innerHTML). */
export const rewardText = (r: Reward) =>
  [r.gold ? `${r.gold} kan` : "", ...(r.items ?? []).map((i) => `${i.qty}x ${ITEMS[i.id]?.name ?? i.id}`)].filter(Boolean).join(" + ");

/** Texto do botão entre o clique e a resposta do servidor. */
export const claimPendingLabel = "Pegando…";

/** Texto do botão enquanto a recompensa de hoje está disponível. */
export const claimLabel = "Pegar a recompensa de hoje";

/** Tempo sem resposta do servidor depois do qual o botão volta a ficar clicável. */
export const claimTimeoutMs = 4000;

/**
 * Formata o tempo restante até o próximo reset em horas e minutos ("Xh Ym" ou "Ym").
 * Ex.: "8h 30m", "45m", "5h".
 */
export function formatDailyResetRemaining(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

/** Seção da recompensa de entrada, com o botão de pegar e indicação do próximo reset quando já resgatado. */
export function dailyRewardHtml(d: DailyView): string {
  const remaining = d.claimed ? formatDailyResetRemaining(dailyResetRemainingMs(d.nowMs ?? Date.now())) : "";
  const titleAttr = d.claimed
    ? `disabled title="Recompensa diária já resgatada hoje. Próximo resgate em ${remaining} (meia-noite de Brasília)."`
    : "";
  const resetHint = d.claimed
    ? `<div class="hint daily-reset-hint">Próximo resgate em ${remaining} (meia-noite de Brasília)</div>`
    : "";
  return `<h3>Recompensa de entrada</h3><p class="hint">Pegue uma vez por dia (o dia vira à meia-noite de Brasília). Perder um dia zera a sequência.</p>
        <div><b>Sequência: ${d.streak} ${d.streak === 1 ? "dia" : "dias"}</b></div>
        <div class="days">${d.rewards.map((r, i) => `<div class="${i < d.index || (d.claimed && i === d.index) ? "got" : ""}${i === d.index ? " today" : ""}"><b>Dia ${i + 1}</b><br>${rewardText(r)}</div>`).join("")}</div>
        <button type="button" class="claim" ${titleAttr}>${d.claimed ? "Já pegou hoje" : claimLabel}</button>${resetHint}`;
}

/** Aba inteira: `missionsHtml` vem pronto do main.ts (usa escHtml e a barra de progresso de lá).
 * A recompensa vem primeiro: depois das três missões, o botão ficava abaixo da área visível do
 * #book-body, que rola (#23). */
export function dailyTabHtml(d: DailyView, missionsHtml: string): string {
  return dailyRewardHtml(d) + missionsHtml;
}
