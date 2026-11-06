// Controles de toque (celular/tablet): joystick à esquerda e botões de ação à direita.
// Aparecem em telas de toque (ou com ?toque na URL, para testar no computador).
import type { Room } from "colyseus.js";

export function initTouch(room: Room<any>, setDir: (dir: number | null) => void) {
  const touch = matchMedia("(pointer: coarse)").matches || new URLSearchParams(location.search).has("toque");
  const box = document.querySelector<HTMLElement>("#touch")!;
  box.hidden = !touch;
  document.body.classList.toggle("touch", touch);

  // menu lateral recolhível em tela estreita
  const side = document.querySelector<HTMLElement>("#side")!;
  document.querySelector<HTMLElement>("#menu-btn")!.onclick = () => side.classList.toggle("open");

  if (!touch) return;
  const stick = document.querySelector<HTMLElement>("#stick")!;
  const knob = document.querySelector<HTMLElement>("#knob")!;
  let active: number | null = null;
  let current: number | null = null;
  const move = (e: PointerEvent) => {
    const r = stick.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - 14;
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, max / len);
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    // zona morta no centro; fora dela, a direção dominante (0 baixo, 1 esq., 2 dir., 3 cima)
    const dir = len < 16 ? null : Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : dy > 0 ? 0 : 3;
    if (dir !== current) { current = dir; setDir(dir); }
  };
  const end = () => {
    active = null;
    current = null;
    knob.style.transform = "";
    setDir(null);
  };
  stick.addEventListener("pointerdown", (e) => {
    active = e.pointerId;
    try { stick.setPointerCapture(e.pointerId); } catch {} // alguns navegadores recusam; o joystick segue funcionando
    move(e);
  });
  stick.addEventListener("pointermove", (e) => { if (e.pointerId === active) move(e); });
  stick.addEventListener("pointerup", end);
  stick.addEventListener("pointercancel", end);

  const acts: Record<string, () => void> = {
    target: () => room.send("nextTarget"),
    skill: () => room.send("skill", { slot: 0 }),
    hp: () => room.send("skill", { slot: 2 }),
    rei: () => room.send("skill", { slot: 3 }),
    form: () => room.send("transform"),
    recall: () => room.send("recall"),
  };
  box.querySelectorAll<HTMLButtonElement>("#actions button").forEach((b) => {
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); acts[b.dataset.act!]?.(); });
  });
}

/** App instalável: registra o service worker só no build de produção; no dev, limpa caches legados para sempre carregar o asset fresco. */
export function registerPWA() {
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  } else if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) reg.unregister();
    }).catch(() => {});
    if ("caches" in window) {
      caches.keys().then((keys) => {
        for (const key of keys) caches.delete(key);
      }).catch(() => {});
    }
  }
}
