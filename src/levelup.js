// =======================================================================
// BLEACH: SOUL SURVIVOR - SISTEMA DE LEVEL-UP COM AUTO-SELECT EM 10s
// Escolha dinâmica de 3 armas ativas e 4 passivas com temporizador
// =======================================================================

import {
  MAX_WEAPONS_SLOTS,
  MAX_PASSIVES_SLOTS,
  MAX_ITEM_LEVEL,
  WEAPON_DEFINITIONS,
  PASSIVE_DEFINITIONS,
  getEquippedWeaponsCount,
  getEquippedPassivesCount
} from './stats.js';

export const LEVELUP_TIMEOUT_SECONDS = 10.0;
let levelUpOpen = false;
let currentOptions = [];
let autoTimerId = null;
let remainingSeconds = LEVELUP_TIMEOUT_SECONDS;
let onSelectCallback = null;
let onSkipCallback = null;

export function isLevelUpBannerOpen() {
  return levelUpOpen;
}

export function getCurrentBannerOptions() {
  return currentOptions;
}

function updateTimerDisplay(seconds) {
  const timerEl = document.getElementById('levelup-timer-badge');
  if (timerEl) {
    timerEl.textContent = `⏱️ Auto-escolha em ${Math.ceil(seconds)}s`;
  }
}

function stopAutoTimer() {
  if (autoTimerId) {
    clearInterval(autoTimerId);
    autoTimerId = null;
  }
}

function triggerAutoRandomSelection() {
  if (!levelUpOpen || currentOptions.length === 0) return;
  const randomIdx = Math.floor(Math.random() * currentOptions.length);
  stopAutoTimer();
  if (onSelectCallback) {
    onSelectCallback(randomIdx, currentOptions[randomIdx]);
  }
}

function startAutoTimer() {
  stopAutoTimer();
  remainingSeconds = 10.0;
  updateTimerDisplay(remainingSeconds);
  autoTimerId = setInterval(() => {
    remainingSeconds -= 0.5;
    updateTimerDisplay(remainingSeconds);
    if (remainingSeconds <= 0) {
      triggerAutoRandomSelection();
    }
  }, 500);
}

function buildWeaponOffering(key, w, equippedCount) {
  const def = WEAPON_DEFINITIONS[key];
  if (!def) return null;
  const currentLvl = w?.level || 0;
  if (currentLvl >= MAX_ITEM_LEVEL) return null;
  if (currentLvl === 0 && equippedCount >= MAX_WEAPONS_SLOTS) return null;
  const targetLvl = currentLvl + 1;
  const isNew = currentLvl === 0;
  return {
    key, type: 'weapon', targetLevel: targetLvl, icon: def.icon,
    name: `${def.name} ${isNew ? '(Novo)' : `Nv. ${targetLvl}`}`,
    desc: isNew ? `Equipa poder ativo: ${def.baseDamage} dano base, recarga ${def.baseCd}s.` : `Aprimora poder: +${def.dmgPerLevel} dano e ${Math.abs(def.cdPerLevel)}s recarga mais rápida.`,
    subtag: isNew ? '✨ Ocupa 1 slot de arma (máx 3)' : '⬆️ Aprimora arma existente'
  };
}

function buildPassiveOffering(key, currentLvl, equippedCount) {
  const def = PASSIVE_DEFINITIONS[key];
  if (!def) return null;
  if (currentLvl >= MAX_ITEM_LEVEL) return null;
  if (currentLvl === 0 && equippedCount >= MAX_PASSIVES_SLOTS) return null;
  const targetLvl = currentLvl + 1;
  const isNew = currentLvl === 0;
  return {
    key, type: 'passive', targetLevel: targetLvl, icon: def.icon,
    name: `${def.name} ${isNew ? '(Novo)' : `Nv. ${targetLvl}`}`,
    desc: isNew ? `Item passivo [${def.stat}]: ${def.desc}.` : `Aumenta efeito [${def.stat}]: tier ${targetLvl} de 5.`,
    subtag: isNew ? '📦 Ocupa 1 slot passivo (máx 4)' : '⬆️ Aprimora atributo acumulável'
  };
}

export function generateAvailableOfferings(weaponsState = {}, passivesState = {}) {
  const pool = [];
  const wCount = getEquippedWeaponsCount(weaponsState);
  const pCount = getEquippedPassivesCount(passivesState);
  for (const k of Object.keys(WEAPON_DEFINITIONS)) {
    const item = buildWeaponOffering(k, weaponsState[k], wCount);
    if (item) pool.push(item);
  }
  for (const k of Object.keys(PASSIVE_DEFINITIONS)) {
    const item = buildPassiveOffering(k, passivesState[k] || 0, pCount);
    if (item) pool.push(item);
  }
  return pool;
}

function createCardNode(opt, idx, onSelect) {
  const card = document.createElement('div');
  card.className = 'banner-card';
  const isWeapon = opt.type === 'weapon';
  const typeLabel = isWeapon ? 'Arsenal Ativo' : 'Item Passivo';
  const typeClass = isWeapon ? 'weapon' : 'passive';
  card.innerHTML = `
    <div class="banner-card-top">
      <span class="card-num-badge">[${idx + 1}]</span>
      <span class="card-type-tag ${typeClass}">${typeLabel}</span>
    </div>
    <div class="banner-card-body">
      <div class="banner-card-icon">${opt.icon}</div>
      <div>
        <div class="banner-card-title">${opt.name}</div>
        <div class="banner-card-desc">${opt.desc}</div>
        <div class="banner-card-subtag">${opt.subtag}</div>
      </div>
    </div>
  `;
  card.onclick = (e) => { e.stopPropagation(); onSelect(idx); };
  return card;
}

function setupBannerHeaderAndSkip(onSkip) {
  let timerBadge = document.getElementById('levelup-timer-badge');
  if (!timerBadge) {
    timerBadge = document.createElement('span');
    timerBadge.id = 'levelup-timer-badge';
    timerBadge.className = 'levelup-timer-badge';
    const header = document.querySelector('.banner-top-row') || document.querySelector('.levelup-banner-header');
    if (header) {
      const skipBtn = document.getElementById('btn-skip-levelup');
      if (skipBtn) header.insertBefore(timerBadge, skipBtn);
      else header.appendChild(timerBadge);
    }
  }
  const skipBtn = document.getElementById('btn-skip-levelup');
  if (skipBtn) {
    skipBtn.onclick = (e) => { e.stopPropagation(); stopAutoTimer(); closeLevelUpDialog(); onSkip(); };
  }
}

export function openLevelUpDialog({ weaponsState = {}, passivesState = {}, onSelect, onSkip }) {
  levelUpOpen = true;
  onSelectCallback = onSelect;
  onSkipCallback = onSkip;
  const banner = document.getElementById('levelup-banner');
  const container = document.getElementById('banner-cards-container');
  if (!banner || !container) return;

  container.innerHTML = '';
  const pool = generateAvailableOfferings(weaponsState, passivesState);
  currentOptions = pool.slice().sort(() => 0.5 - Math.random()).slice(0, 3);
  currentOptions.forEach((opt, idx) => {
    container.appendChild(createCardNode(opt, idx, selectOptionIndex));
  });

  setupBannerHeaderAndSkip(onSkip);
  banner.classList.remove('hidden');
  startAutoTimer();
}

export function selectOptionIndex(index) {
  if (!levelUpOpen || !currentOptions[index]) return;
  const chosen = currentOptions[index];
  stopAutoTimer();
  closeLevelUpDialog();
  if (onSelectCallback) onSelectCallback(index, chosen);
}

export function handleLevelUpKeyInput(key) {
  if (!levelUpOpen) return false;
  if (key === '1' || key === '2' || key === '3') {
    selectOptionIndex(parseInt(key, 10) - 1);
    return true;
  }
  if (key === '0' || key === 'p') {
    stopAutoTimer();
    closeLevelUpDialog();
    if (onSkipCallback) onSkipCallback();
    return true;
  }
  return false;
}

export function closeLevelUpDialog() {
  levelUpOpen = false;
  stopAutoTimer();
  const banner = document.getElementById('levelup-banner');
  if (banner) banner.classList.add('hidden');
  currentOptions = [];
}
