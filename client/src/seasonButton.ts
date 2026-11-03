// Botão de acesso direto ao Passe de Temporada (★) no HUD.
// Permite abrir/fechar o painel de recompensas diretamente pela barra superior (.who-icons).

export const SEASON_BTN_DEFAULTS = {
  id: "season-btn",
  label: "Passe de Temporada (★)",
  tooltip: "Passe de Temporada (★, grátis)",
  icon: "★",
} as const;

/**
 * Alterna a visibilidade da janela do Passe de Temporada (#pass).
 * Se o painel já estiver visível, fecha localmente.
 * Se estiver oculto, envia a solicitação "seasonOpen" ao servidor para atualizar dados e abrir.
 */
export function toggleSeasonPass(
  panel: Pick<HTMLElement, "hidden">,
  sendRoomMessage: (action: string) => void,
) {
  if (!panel.hidden) {
    panel.hidden = true;
  } else {
    sendRoomMessage("seasonOpen");
  }
}
