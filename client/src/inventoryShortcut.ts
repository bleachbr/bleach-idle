// Acesso direto ao inventário (issue #25): botão na barra superior e teclas I/B.
// O inventário continua sendo a seção #gear da barra lateral; aqui só a trazemos à vista
// (abre a gaveta no celular, rola até ela, destaca e põe o foco no título).
import { isInventoryKey, isTypingTarget } from "./hotkeys";

/** Rolagem suave só para quem não pediu menos movimento ao sistema (o destaque já respeita no theme.css). */
export const scrollBehavior = (reduceMotion: boolean): ScrollBehavior => (reduceMotion ? "auto" : "smooth");

export function initInventoryShortcut() {
  const side = document.querySelector<HTMLElement>("#side")!;
  const gear = document.querySelector<HTMLElement>("#gear")!;
  const title = document.querySelector<HTMLElement>("#inv-title")!;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const reveal = () => {
    side.classList.add("open"); // gaveta do celular (touch.ts); no computador a classe não muda nada
    gear.scrollIntoView({ block: "start", behavior: scrollBehavior(reduceMotion.matches) });
    // reinicia a animação de destaque mesmo com cliques seguidos
    gear.classList.remove("flash");
    void gear.offsetWidth;
    gear.classList.add("flash");
    title.focus({ preventScroll: true });
  };
  document.querySelector<HTMLButtonElement>("#inv-btn")!.onclick = reveal;
  window.addEventListener("keydown", (e) => {
    if (isTypingTarget(e.target as HTMLElement | null) || !isInventoryKey(e)) return;
    e.preventDefault();
    reveal();
  });
}
