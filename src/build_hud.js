// =======================================================================
// BLEACH: SOUL SURVIVOR - MINIATURAS DE BUILD NO HUD (CANTO SUPERIOR DIREITO)
// Exibe slots ativos de armas (até 3) e itens passivos (até 4) + estratégia
// =======================================================================

import {
  MAX_WEAPONS_SLOTS,
  MAX_PASSIVES_SLOTS,
  WEAPON_DEFINITIONS,
  PASSIVE_DEFINITIONS,
  determineBuildOrientation,
  detectActiveSynergies
} from './stats.js';

function getRomanLevel(lvl) {
  const romans = ['', 'I', 'II', 'III', 'IV', 'V'];
  return romans[lvl] || `${lvl}`;
}

function createWeaponSlotNode(wDef, level) {
  const slot = document.createElement('div');
  slot.className = `build-slot weapon-slot ${level > 0 ? 'equipped' : 'empty'}`;
  if (level > 0) {
    slot.innerHTML = `
      <div class="slot-icon">${wDef.icon}</div>
      <div class="slot-lvl">${getRomanLevel(level)}</div>
      <div class="slot-tooltip">${wDef.name} (Nv. ${level})</div>
    `;
  } else {
    slot.innerHTML = `<span class="slot-empty-icon">+</span>`;
    slot.title = 'Slot de Arma Livre';
  }
  return slot;
}

function createPassiveSlotNode(pDef, level) {
  const slot = document.createElement('div');
  slot.className = `build-slot passive-slot ${level > 0 ? 'equipped' : 'empty'}`;
  if (level > 0) {
    slot.innerHTML = `
      <div class="slot-icon">${pDef.icon}</div>
      <div class="slot-stat-tag">${pDef.stat}</div>
      <div class="slot-lvl">${getRomanLevel(level)}</div>
      <div class="slot-tooltip">${pDef.name} (Nv. ${level})</div>
    `;
  } else {
    slot.innerHTML = `<span class="slot-empty-icon">+</span>`;
    slot.title = 'Slot de Item Passivo Livre';
  }
  return slot;
}

function renderWeaponsRow(weaponsState, container) {
  container.innerHTML = '';
  const equippedWeapons = Object.entries(weaponsState).filter(([_, w]) => w.level > 0);
  for (let i = 0; i < MAX_WEAPONS_SLOTS; i++) {
    if (i < equippedWeapons.length) {
      const [key, w] = equippedWeapons[i];
      const def = WEAPON_DEFINITIONS[key] || { name: key, icon: '⚔️' };
      container.appendChild(createWeaponSlotNode(def, w.level));
    } else {
      container.appendChild(createWeaponSlotNode(null, 0));
    }
  }
}

function renderPassivesRow(passivesState, container) {
  container.innerHTML = '';
  const equippedPassives = Object.entries(passivesState).filter(([_, lvl]) => lvl > 0);
  for (let i = 0; i < MAX_PASSIVES_SLOTS; i++) {
    if (i < equippedPassives.length) {
      const [key, lvl] = equippedPassives[i];
      const def = PASSIVE_DEFINITIONS[key] || { name: key, icon: '📦', stat: 'ITEM' };
      container.appendChild(createPassiveSlotNode(def, lvl));
    } else {
      container.appendChild(createPassiveSlotNode(null, 0));
    }
  }
}

function updateStrategyBadge(orientation, synergiesCount, badgeEl) {
  if (!badgeEl) return;
  badgeEl.className = `build-strategy-badge ${orientation.class}`;
  const synTag = synergiesCount > 0 ? ` <span class="syn-counter" title="${synergiesCount} sinergia(s) ativa(s)">✨${synergiesCount}</span>` : '';
  badgeEl.innerHTML = `${orientation.name}${synTag}`;
  badgeEl.title = orientation.desc;
}

export function updateBuildHUD(weaponsState, passivesState) {
  const panel = document.getElementById('build-hud-panel');
  if (!panel) return;
  const orientation = determineBuildOrientation(weaponsState, passivesState);
  const synergies = detectActiveSynergies(weaponsState, passivesState);
  const badgeEl = document.getElementById('build-strategy-badge');
  updateStrategyBadge(orientation, synergies.length, badgeEl);
  const weaponsRow = document.getElementById('build-weapons-row');
  if (weaponsRow) renderWeaponsRow(weaponsState, weaponsRow);
  const passivesRow = document.getElementById('build-passives-row');
  if (passivesRow) renderPassivesRow(passivesState, passivesRow);
}
