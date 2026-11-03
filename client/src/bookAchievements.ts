// Aba Conquistas do Livro: cabeçalho com contador de progresso e rótulo dinâmico da aba (#item-6).
// Permite ao jogador saber quantas conquistas faltam sem rolar toda a lista.

export type AchievementItem = {
  id?: string;
  name?: string;
  desc?: string;
  done: boolean;
  have?: number;
  need?: number;
  reward?: any;
};

/**
 * Rótulo para o botão da aba no cabeçalho do Livro.
 * Exibe "Conquistas (X/Y)" quando há conquistas conhecidas, ou "Conquistas" se vazio.
 */
export function achievementsTabLabel(achievements?: AchievementItem[] | null): string {
  if (!achievements || achievements.length === 0) return "Conquistas";
  const done = achievements.filter((a) => a.done).length;
  return `Conquistas (${done}/${achievements.length})`;
}

/**
 * Cabeçalho exibido no topo da aba Conquistas com o contador numérico em destaque.
 */
export function achievementsHeaderHtml(achievements: AchievementItem[]): string {
  const done = achievements.filter((a) => a.done).length;
  const total = achievements.length;
  return `<h3>Conquistas (${done}/${total})</h3><p class="hint">${done}/${total} conquistas. A recompensa chega sozinha.</p>`;
}
