// Janela do renascimento (issue #35), no lugar do window.confirm(): o diálogo nativo bloqueava
// o jogo, some em alguns navegadores de celular/PWA e o Jogador-IA não conseguia responder.
// Mesmo padrão do diálogo de Novidades (releases.ts): <dialog> com foco preso e Escape, e as
// teclas do jogo paradas enquanto estiver aberto. Texto só por textContent. Quem valida é o servidor.
import type { Room } from "colyseus.js";
import { rebirthPrompt } from "./rebirthPrompt";
import "./rebirthDialog.css";

export function initRebirthDialog(room: Room<any>, me: () => { level: number; rebirths: number } | undefined) {
  const dialog = document.querySelector<HTMLDialogElement>("#rebirth-dialog")!;
  const confirmBtn = document.querySelector<HTMLButtonElement>("#rebirth-confirm")!;
  const text = (sel: string, value: string) => (document.querySelector<HTMLElement>(sel)!.textContent = value);
  const list = (sel: string, items: { text: string; ok?: boolean }[]) =>
    document.querySelector<HTMLElement>(sel)!.replaceChildren(...items.map((i) => {
      const li = document.createElement("li");
      li.textContent = i.ok === undefined ? i.text : `${i.ok ? "✔" : "✖"} ${i.text}`;
      if (i.ok === false) li.className = "missing";
      return li;
    }));
  let shown = "";
  /** preenche a janela com o nível e os renascimentos atuais */
  const render = (p: { level: number; rebirths: number }) => {
    shown = `${p.level}/${p.rebirths}`;
    const r = rebirthPrompt(p);
    text("#rebirth-title", r.title);
    text("#rebirth-reset", r.reset);
    text("#rebirth-keeps", r.keeps);
    list("#rebirth-bonus", r.bonus.map((b) => ({ text: b })));
    list("#rebirth-reqs", r.requirements);
    text("#rebirth-note", `${r.note} ${r.next}`);
    confirmBtn.disabled = !r.ready;
  };
  const open = () => {
    const p = me();
    if (!p) return;
    render(p);
    if (!dialog.open) dialog.showModal();
  };
  // com a janela aberta o nível ainda pode mudar (ex.: morrer no Auto Hunt e perder XP): o Confirmar acompanha
  room.onStateChange(() => {
    const p = dialog.open ? me() : undefined;
    if (p && `${p.level}/${p.rebirths}` !== shown) render(p);
  });
  confirmBtn.onclick = () => {
    room.send("rebirth");
    dialog.close();
  };
  document.querySelector<HTMLButtonElement>("#rebirth-cancel")!.onclick = () => dialog.close();
  window.addEventListener("keydown", (event) => {
    if (dialog.open) event.stopImmediatePropagation();
  }, { capture: true });
  return { open };
}
