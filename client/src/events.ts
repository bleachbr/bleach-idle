// Banner dos eventos narrados (R-12) no topo da tela. O servidor manda a fase e quanto tempo ela ainda vale
// (mensagem `event`); aqui só se mostra o título, o subtítulo e o tempo que falta.
// A conta usa `left` e o relógio do aparelho: quem entra no meio recebe o banner antes de o relógio
// sincronizar com o servidor (clock.ts), e um aparelho adiantado apagaria o banner na hora.
import type { Room } from "colyseus.js";
import { EVENT_BANNER, own, type EventKind } from "../../shared/src";

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function bindEvents(room: Room<any>) {
  // O contêiner (aria-live) fica sempre na página, vazio quando não há evento: leitores de tela costumam
  // ignorar o que entra junto com uma região que acabou de aparecer.
  const box = document.getElementById("event-banner");
  if (!box) return;
  // uma linha por tipo (a invasão e o chefe mundial podem acontecer juntos); trocar uma não mexe na outra,
  // e a contagem só muda o texto de um span escondido do leitor de tela
  const active = new Map<EventKind, { row: HTMLElement; end: number; clock?: HTMLElement; label?: string }>();
  const tick = () => {
    const now = Date.now();
    for (const [k, b] of active) {
      if (b.end <= now) { b.row.remove(); active.delete(k); }
      else if (b.clock) b.clock.textContent = `${b.label} ${mmss(b.end - now)}`;
    }
  };
  room.onMessage("event", (m: { phase?: unknown; left?: unknown }) => {
    const def = own(EVENT_BANNER, m?.phase);
    const left = typeof m?.left === "number" && Number.isFinite(m.left) ? m.left : 0;
    if (!def || left <= 0) return;
    const row = document.createElement("div");
    row.className = def.kind;
    const title = document.createElement("b");
    title.textContent = def.title;
    const text = document.createElement("span");
    text.textContent = def.text;
    row.append(title, text);
    let clock: HTMLElement | undefined;
    if (def.clock) {
      clock = document.createElement("span");
      clock.setAttribute("aria-hidden", "true");
      text.append(" · ", clock);
    }
    const old = active.get(def.kind);
    if (old) old.row.replaceWith(row);
    else box.append(row);
    active.set(def.kind, { row, end: Date.now() + left, clock, label: def.clock });
    tick();
  });
  const timer = window.setInterval(() => { if (active.size) tick(); }, 1000);
  room.onLeave(() => window.clearInterval(timer));
}
