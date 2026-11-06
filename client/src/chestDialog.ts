// Diálogo de descoberta e abertura de Baús de Tesouro em Karakura.
import { ITEMS, own, type ChestDef, type ChestOpenResult } from "../../shared/src";
import "./exploration.css";

const SPOT_LABELS: Record<string, string> = {
  zelkova: "🌿 Árvore Zelkova Ancestral",
  river: "🌊 Margem do Rio Onagawa",
  alley: "🧱 Beco Residencial Silencioso",
  industrial: "⚙️ Sucata Industrial Abandonada",
};

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderChestRewardHtml(result: ChestOpenResult, chest?: ChestDef): string {
  const spotLabel = chest ? SPOT_LABELS[chest.secretSpot] ?? "Ponto Secreto" : "Ponto Secreto";
  const hintHtml = chest?.hint ? `<p class="chest-hint-text">"${escHtml(chest.hint)}"</p>` : "";

  let rewardsHtml = "";
  if (result.success) {
    const rewards: string[] = [];
    if (result.goldAwarded > 0) {
      rewards.push(`<div class="reward-pill gold"><span>🪙</span> +${result.goldAwarded} Kan</div>`);
    }
    for (const item of result.itemsAwarded) {
      const def = own(ITEMS, item.id);
      const name = def?.name ?? item.id;
      rewards.push(`<div class="reward-pill"><span>🎁</span> ${item.qty}x ${escHtml(name)}</div>`);
    }
    rewardsHtml = `<div class="chest-rewards-grid">${rewards.join("")}</div>`;
  } else {
    rewardsHtml = `<p class="chest-hint-text">${escHtml(result.message)}</p>`;
  }

  return `
    <div class="chest-card" role="dialog" aria-modal="true" aria-labelledby="chest-title">
      <div class="chest-icon-glow">${result.success ? "🎉" : "📦"}</div>
      <span class="chest-spot-tag">${escHtml(spotLabel)}</span>
      <h3 id="chest-title">${escHtml(result.name)}</h3>
      ${hintHtml}
      ${rewardsHtml}
      <button type="button" class="chest-close-btn" data-chest-close>Coletar & Fechar</button>
    </div>
  `;
}

let activeChestOverlay: HTMLElement | null = null;
let keyListenerAttached = false;

function onKeyDown(e: KeyboardEvent) {
  if (!activeChestOverlay) return;
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;

  if (e.code === "Escape" || e.code === "Space" || e.code === "Enter" || e.code === "KeyE") {
    e.preventDefault();
    closeChestReward();
  }
}

export function showChestReward(
  result: ChestOpenResult,
  chest?: ChestDef,
  container: HTMLElement = document.body
): HTMLElement {
  closeChestReward();

  const overlay = document.createElement("div");
  overlay.className = "chest-overlay";
  overlay.id = "chest-modal";
  overlay.innerHTML = renderChestRewardHtml(result, chest);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || (e.target as HTMLElement).closest("[data-chest-close]")) {
      closeChestReward();
    }
  });

  container.appendChild(overlay);
  activeChestOverlay = overlay;

  if (!keyListenerAttached) {
    window.addEventListener("keydown", onKeyDown);
    keyListenerAttached = true;
  }

  const closeBtn = overlay.querySelector<HTMLButtonElement>("[data-chest-close]");
  closeBtn?.focus();

  return overlay;
}

export function closeChestReward(container: HTMLElement = document.body): void {
  const existing = container.querySelector("#chest-modal") || activeChestOverlay;
  if (existing) {
    existing.remove();
  }
  activeChestOverlay = null;
}

export function isChestOpen(container: HTMLElement = document.body): boolean {
  return !!(container.querySelector("#chest-modal") || activeChestOverlay);
}
