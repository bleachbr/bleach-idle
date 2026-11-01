// Tela de leitura de uma crônica na Loja de Cristais (aba Crônicas).
import type { Cosmetic } from "../../shared/src";

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

/** HTML da leitura. O título usa a classe lore-title (fonte de texto, theme.css): na fonte pixel,
 * "Crônica" era lido como "Orônloa" (#24). `esc` escapa o texto (o escHtml do main.ts). */
export function loreReadingHtml(x: Cosmetic, esc: (t: string) => string): string {
  return `<h3 class="lore-title">${esc(x.name)}</h3>${(x.text ?? []).map((t) => `<p>${esc(t)}</p>`).join("")}
        <p class="hint">Título desta crônica: <b style="color:${hex(x.color)}">${esc(x.title ?? "")}</b></p><button type="button" class="claim" data-back>Voltar</button>`;
}
