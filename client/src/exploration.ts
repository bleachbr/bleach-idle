// Controlador de Exploração de Mundo: Placas, Baús e Divisão Setorial de Karakura.
import {
  getKarakuraSector,
  type KarakuraSector,
  type SignpostDef,
  type ChestDef,
  openChestReward,
  type ChestOpenResult,
  type Slot,
} from "../../shared/src";
import { showSignpost, closeSignpost, isSignpostOpen } from "./signpostDialog";
import { showChestReward, closeChestReward, isChestOpen } from "./chestDialog";
import { sfx } from "./sfx";

let currentSectorId: string | null = null;
let bannerTimer: number | null = null;

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function showSectorBanner(sector: KarakuraSector, container: HTMLElement = document.body): HTMLElement {
  let banner = container.querySelector<HTMLElement>("#sector-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "sector-banner";
    banner.className = "sector-banner";
    container.appendChild(banner);
  }

  banner.innerHTML = `
    <span class="sector-banner-tag">Setor ${sector.sectorNumber} · Lv ${sector.minLevel}-${sector.maxLevel}</span>
    <span class="sector-banner-title">${escHtml(sector.name)}</span>
    <span class="sector-banner-sub">${escHtml(sector.subtitle)}</span>
  `;

  // Força reflow para reiniciar animação
  banner.classList.remove("active");
  void banner.offsetWidth;
  banner.classList.add("active");

  if (bannerTimer !== null) {
    window.clearTimeout(bannerTimer);
  }

  bannerTimer = window.setTimeout(() => {
    banner?.classList.remove("active");
    bannerTimer = null;
  }, 2800);

  return banner;
}

/** Monitora se o jogador mudou de setor em Karakura e exibe o banner correspondente */
export function updateSectorPresence(
  mapId: string,
  tx: number,
  ty: number,
  container: HTMLElement = document.body
): KarakuraSector | undefined {
  if (mapId !== "karakura") {
    currentSectorId = null;
    return undefined;
  }

  const sector = getKarakuraSector(tx, ty);
  if (sector && sector.id !== currentSectorId) {
    currentSectorId = sector.id;
    showSectorBanner(sector, container);
  }
  return sector;
}

export function getCurrentSectorId(): string | null {
  return currentSectorId;
}

export function resetSectorPresence(): void {
  currentSectorId = null;
}

/** Abre uma placa de sinalização */
export function interactWithSignpost(sign: SignpostDef): HTMLElement {
  sfx.chime();
  return showSignpost(sign);
}

/** Tenta abrir um baú de tesouro */
export function interactWithChest(
  chest: ChestDef,
  player: { gold: number; inv: (Slot | null)[]; openedChests?: string[] }
): ChestOpenResult {
  const result = openChestReward(chest, player);
  if (result.success) {
    sfx.loot();
  } else {
    sfx.deny();
  }
  showChestReward(result, chest);
  return result;
}

export { isSignpostOpen, closeSignpost, isChestOpen, closeChestReward };
