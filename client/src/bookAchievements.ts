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

export interface BookAchievementsDom {
  panel?: { querySelector: (sel: string) => { textContent: string | null } | null } | null;
  body?: { innerHTML: string } | null;
}

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

/**
 * Monta o HTML completo do corpo da aba Conquistas (cabeçalho em destaque + lista de conquistas).
 */
export function achievementsBodyHtml(achievements: AchievementItem[], listHtml: string = ""): string {
  return achievementsHeaderHtml(achievements) + listHtml;
}

/**
 * Atualiza o rótulo da aba Conquistas no painel do Livro.
 */
export function updateBookAchievementsTab(
  panel: { querySelector: (sel: string) => { textContent: string | null } | null } | null | undefined,
  achievements?: AchievementItem[] | null
): void {
  const btn = panel?.querySelector?.('.tabs button[data-tab="conquistas"]');
  if (btn) {
    btn.textContent = achievementsTabLabel(achievements);
  }
}

/**
 * Atualiza a visualização de conquistas no Livro:
 * - Mantém o botão `data-tab="conquistas"` com o rótulo `Conquistas (X/Y)`.
 * - Caso a aba ativa seja "conquistas", monta o cabeçalho e a lista no corpo (`body`).
 */
export function updateBookAchievements(
  activeTab: string,
  achievements: AchievementItem[] | null | undefined,
  dom: BookAchievementsDom,
  listHtml: string = ""
): void {
  updateBookAchievementsTab(dom.panel, achievements);
  if (activeTab === "conquistas" && dom.body && achievements) {
    dom.body.innerHTML = achievementsBodyHtml(achievements, listHtml);
  }
}
