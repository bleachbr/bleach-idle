// =======================================================================
// BLEACH: SOUL SURVIVOR - FICHA DO SHINIGAMI & DETALHES DE PAUSA (ESC)
// Painel detalhado de atributos, armas aprimoradas, itens e sinergias
// =======================================================================

import {
  WEAPON_DEFINITIONS,
  PASSIVE_DEFINITIONS,
  calculateEffectiveStats,
  getEffectiveCooldown,
  detectActiveSynergies,
  determineBuildOrientation
} from './stats.js';

function renderStatsColumn(stats, player) {
  return `
    <div class="pause-stats-col">
      <div class="pause-section-title">📊 ATRIBUTOS DO SHINIGAMI</div>
      <div class="pause-stat-row"><span>Vida / Vitalidade:</span> <b>${Math.ceil(player.hp)} / ${player.maxHp} HP</b></div>
      <div class="pause-stat-row"><span>Dano Espiritual (ATK):</span> <b class="highlight-stat">+${Math.round((stats.atkMult - 1) * 100)}%</b></div>
      <div class="pause-stat-row"><span>Velocidade Shunpo:</span> <b>${stats.speed.toFixed(1)} m/s</b></div>
      <div class="pause-stat-row"><span>Aceleração / CDR:</span> <b class="highlight-stat">${stats.cdrPercent}% (Cap 65%)</b></div>
      <div class="pause-stat-row"><span>Armadura Hierro (DEF):</span> <b class="highlight-stat">${stats.defMitigation}% mitigação</b></div>
      <div class="pause-stat-row"><span>Regeneração Kaidō:</span> <b class="highlight-stat">+${stats.regenHpSec.toFixed(1)} HP/s</b></div>
      <div class="pause-stat-row"><span>Vórtice Magnético:</span> <b>${stats.magnetRadius.toFixed(1)}m alcance</b></div>
    </div>
  `;
}

function renderWeaponCard(key, w, stats) {
  const def = WEAPON_DEFINITIONS[key] || { name: key, icon: '⚔️', baseDamage: 30, baseCd: 1.0 };
  const effectiveDmg = Math.round((def.baseDamage + (w.level - 1) * (def.dmgPerLevel || 10)) * stats.atkMult);
  const effectiveCd = getEffectiveCooldown(def.baseCd, stats.haste).toFixed(2);
  return `
    <div class="pause-arsenal-item">
      <div class="pause-item-header">
        <span class="pause-item-name">${def.icon} ${def.name}</span>
        <span class="pause-item-lvl">Nv. ${w.level}</span>
      </div>
      <div class="pause-item-detail">Dano: <b>${effectiveDmg}</b> | Recarga: <b>${effectiveCd}s</b> | Total: <b>${Math.round(w.totalDamage).toLocaleString('pt-BR')}</b></div>
    </div>
  `;
}

function renderWeaponsSection(weaponsState, stats) {
  const activeList = Object.entries(weaponsState).filter(([_, w]) => w.level > 0);
  const itemsHtml = activeList.map(([key, w]) => renderWeaponCard(key, w, stats)).join('');
  return `
    <div class="pause-arsenal-col">
      <div class="pause-section-title">⚔️ ARSENAL ATIVO (${activeList.length}/3)</div>
      <div class="pause-items-list">${itemsHtml || '<div class="empty-hint">Nenhum poder ativo</div>'}</div>
    </div>
  `;
}

function renderPassivesSection(passivesState) {
  const activePassives = Object.entries(passivesState).filter(([_, lvl]) => lvl > 0);
  const itemsHtml = activePassives.map(([key, lvl]) => {
    const def = PASSIVE_DEFINITIONS[key] || { name: key, icon: '💎', desc: '' };
    return `
      <div class="pause-passive-item">
        <span class="passive-icon">${def.icon}</span>
        <div class="passive-info">
          <div class="passive-title">${def.name} <b>Nv. ${lvl}</b></div>
          <div class="passive-desc">${def.desc}</div>
        </div>
      </div>
    `;
  }).join('');
  return `
    <div class="pause-passives-col">
      <div class="pause-section-title">💎 ITENS PASSIVOS (${activePassives.length}/4)</div>
      <div class="pause-passives-list">${itemsHtml || '<div class="empty-hint">Nenhum item equipado</div>'}</div>
    </div>
  `;
}

function renderSynergiesSection(synergies) {
  if (synergies.length === 0) {
    return `<div class="pause-synergies-box"><div class="empty-hint">Nenhuma sinergia ativa ainda. Evolua armas e itens complementares!</div></div>`;
  }
  const items = synergies.map(syn => `
    <div class="pause-synergy-badge">
      <span class="syn-badge-title">${syn.icon} ${syn.name}</span>
      <span class="syn-badge-desc">${syn.desc}</span>
    </div>
  `).join('');
  return `<div class="pause-synergies-box"><div class="pause-section-title">✨ SINERGIAS ATIVADAS</div><div class="synergies-grid">${items}</div></div>`;
}

export function updatePauseDetails(player, state) {
  const container = document.getElementById('pause-details-container');
  if (!container) return;
  const stats = calculateEffectiveStats(player, state.passives);
  const orientation = determineBuildOrientation(state.weapons, state.passives);
  const synergies = detectActiveSynergies(state.weapons, state.passives);

  container.innerHTML = `
    <div class="pause-header-badge">
      <span class="orientation-tag ${orientation.class}">${orientation.name}</span>
      <span class="orientation-desc">${orientation.desc}</span>
    </div>
    <div class="pause-grid-layout">
      ${renderStatsColumn(stats, player)}
      ${renderWeaponsSection(state.weapons, stats)}
      ${renderPassivesSection(state.passives)}
    </div>
    ${renderSynergiesSection(synergies)}
  `;
}
