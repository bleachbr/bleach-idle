// Janela da ficha do personagem (issue #36): abre ao clicar no nome/nível da barra lateral.
// Mesmo padrão do diálogo de Novidades (releases.ts): <dialog> nativo com foco preso e Escape,
// e as teclas do jogo ficam paradas enquanto ele estiver aberto. Texto só por textContent.
import type { Room } from "colyseus.js";
import { characterSheet, type SheetGear, type SheetPlayer } from "./characterSheet";
import "./characterSheet.css";

export function initCharacterSheet(room: Room<any>, me: () => SheetPlayer | undefined, now: () => number) {
  const dialog = document.querySelector<HTMLDialogElement>("#sheet-dialog")!;
  const body = document.querySelector<HTMLElement>("#sheet-body")!;
  let gear: SheetGear | null = null;
  let shown = "";
  const render = () => {
    const p = me();
    if (!dialog.open || !p) return;
    const sections = characterSheet(p, gear, now());
    // o estado do jogador muda várias vezes por segundo (posição): só redesenha se a ficha mudou
    const key = JSON.stringify(sections);
    if (key === shown) return;
    shown = key;
    body.replaceChildren(...sections.map((s) => {
      const section = document.createElement("section");
      const title = document.createElement("h3");
      title.textContent = s.title;
      const list = document.createElement("dl");
      for (const r of s.rows) {
        const dt = document.createElement("dt");
        dt.textContent = r.label;
        const dd = document.createElement("dd");
        dd.textContent = r.value;
        if (r.hint) {
          const hint = document.createElement("small");
          hint.textContent = r.hint;
          dd.append(hint);
        }
        list.append(dt, dd);
      }
      section.append(title, list);
      return section;
    }));
  };
  room.onMessage("inv", (m: SheetGear) => { gear = m; render(); });
  document.querySelector<HTMLButtonElement>("#sheet-btn")!.onclick = () => {
    if (!dialog.open) dialog.showModal();
    shown = "";
    render();
  };
  document.querySelector<HTMLButtonElement>("#sheet-close")!.onclick = () => dialog.close();
  window.addEventListener("keydown", (event) => {
    if (dialog.open) event.stopImmediatePropagation();
  }, { capture: true });
  return { update: render };
}
