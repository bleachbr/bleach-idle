// Diálogo de Placas de Sinalização interativas estilo Pokémon ORAS.
import type { SignpostDef } from "../../shared/src";
import { getKarakuraSectorById } from "../../shared/src";
import "./exploration.css";

const CATEGORY_NAMES: Record<string, string> = {
  direction: "🧭 Direções",
  lore: "📜 Registro",
  hint: "💡 Dica",
  warning: "⚠️ Alerta",
};

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderSignpostHtml(sign: SignpostDef): string {
  const categoryLabel = CATEGORY_NAMES[sign.category] ?? "Placa";
  const sector = getKarakuraSectorById(sign.sectorId);
  const sectorLabel = sector ? `Setor ${sector.sectorNumber}: ${sector.name}` : sign.sectorId;

  return `
    <div class="signpost-card" role="dialog" aria-modal="true" aria-labelledby="signpost-title">
      <div class="signpost-header">
        <div class="signpost-meta">
          <span class="signpost-badge ${sign.category}">${categoryLabel}</span>
          <span class="signpost-sector">${escHtml(sectorLabel)}</span>
        </div>
        <button type="button" class="signpost-close-btn" data-signpost-close aria-label="Fechar placa">Fechar ✕</button>
      </div>
      <h3 id="signpost-title" class="signpost-title">${escHtml(sign.title)}</h3>
      <div class="signpost-body">${escHtml(sign.text)}</div>
      <div class="signpost-footer">
        <span>📍 Karakura (${sign.x}, ${sign.y})</span>
        <small>Pressione <kbd>E</kbd>, <kbd>Espaço</kbd> ou <kbd>Esc</kbd> para fechar</small>
      </div>
    </div>
  `;
}

let activeOverlay: HTMLElement | null = null;
let keyListenerAttached = false;

function onKeyDown(e: KeyboardEvent) {
  if (!activeOverlay) return;
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;

  if (e.code === "Escape" || e.code === "Space" || e.code === "Enter" || e.code === "KeyE") {
    e.preventDefault();
    closeSignpost();
  }
}

export function showSignpost(sign: SignpostDef, container: HTMLElement = document.body): HTMLElement {
  closeSignpost();

  const overlay = document.createElement("div");
  overlay.className = "signpost-overlay";
  overlay.id = "signpost-modal";
  overlay.innerHTML = renderSignpostHtml(sign);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || (e.target as HTMLElement).closest("[data-signpost-close]")) {
      closeSignpost();
    }
  });

  container.appendChild(overlay);
  activeOverlay = overlay;

  if (!keyListenerAttached) {
    window.addEventListener("keydown", onKeyDown);
    keyListenerAttached = true;
  }

  const closeBtn = overlay.querySelector<HTMLButtonElement>("[data-signpost-close]");
  closeBtn?.focus();

  return overlay;
}

export function closeSignpost(container: HTMLElement = document.body): void {
  const existing = container.querySelector("#signpost-modal") || activeOverlay;
  if (existing) {
    existing.remove();
  }
  activeOverlay = null;
}

export function isSignpostOpen(container: HTMLElement = document.body): boolean {
  return !!(container.querySelector("#signpost-modal") || activeOverlay);
}
