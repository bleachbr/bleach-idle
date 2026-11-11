// =======================================================================
// BLEACH: SOUL SURVIVOR - GERENCIADOR DE HUD E TELAS DE RESULTADO
// =======================================================================

export function updateBossBar(state, enemyMeshes = []) {
  const isSpawned = state?.cycleState ? state.cycleState.bossSpawned : state?.bossSpawned;
  const isDefeated = state?.cycleState ? !state.cycleState.bossActive : state?.bossDefeated;
  if (!isSpawned || isDefeated) {
    const container = typeof document !== 'undefined' ? document.getElementById('boss-bar-container') : null;
    if (container && !container.classList.contains('hidden')) container.classList.add('hidden');
    return;
  }
  const boss = enemyMeshes.find(e => e.active && e.isBoss);
  if (boss && typeof document !== 'undefined') {
    const bossHpPercent = (boss.hp / boss.maxHp) * 100;
    const bar = document.getElementById('boss-hp-fill');
    if (bar) bar.style.width = Math.max(0, bossHpPercent) + '%';
  }
}

export function updateHUD(player, state, enemyMeshes = []) {
  const hpPercent = (player.hp / player.maxHp) * 100;
  document.getElementById('hp-bar-fill').style.width = hpPercent + '%';
  document.getElementById('hp-text').innerText = `${Math.ceil(player.hp)} / ${player.maxHp}`;

  const xpPercent = (state.xp / state.xpNext) * 100;
  document.getElementById('xp-bar-fill').style.width = xpPercent + '%';
  const cNum = state.cycleState?.currentCycle || 1;
  document.getElementById('level-badge').innerText = `Nv. ${state.level} · C${cNum}`;

  const mins = String(Math.floor(state.time / 60)).padStart(2, '0');
  const secs = String(Math.floor(state.time % 60)).padStart(2, '0');
  document.getElementById('timer-box').innerText = `${mins}:${secs}`;
  document.getElementById('kills-count').innerText = state.kills;

  updateBossBar(state, enemyMeshes);
}

function renderGameOverCensus(state) {
  const censusList = document.getElementById('enemies-census');
  if (censusList) {
    const menosText = `${state.census.menos || 0} (PURIFICADOS)`;
    censusList.innerHTML = `<li><span>Hollow (Fishbone D):</span> <b>${state.census.fishbone || 0}</b></li>` +
      `<li><span>Hollow Alado (Shrieker):</span> <b>${state.census.shrieker || 0}</b></li>` +
      `<li><span>Hollow Ácido (Acidwire):</span> <b>${state.census.acidwire || 0}</b></li>` +
      `<li><span>Hollow Mutante (Elite):</span> <b>${state.census.elite || 0}</b></li>` +
      `<li><span>Menos Grande (Gillian):</span> <b>${menosText}</b></li>`;
  }
  const weaponsList = document.getElementById('weapons-census');
  if (weaponsList) {
    weaponsList.innerHTML = Object.values(state.weapons)
      .filter(w => w.level > 0)
      .map(w => `<li><span>${w.name} (Nv. ${w.level}):</span> <b>${Math.round(w.totalDamage).toLocaleString('pt-BR')} dano</b></li>`)
      .join('');
  }
}

function populateGameOverStats(victory, state) {
  const title = document.getElementById('report-title');
  const subtitle = document.getElementById('report-subtitle');
  if (title) {
    title.innerText = victory ? 'MISSÃO CUMPRIDA!' : 'VOCÊ CAIU EM COMBATE';
    title.style.color = victory ? '#48bb78' : '#f56565';
  }
  if (subtitle) {
    const c = state.cycleState?.currentCycle || 1;
    subtitle.innerText = `Sua alma sucumbiu às hordas do Hueco Mundo após alcançar o Ciclo ${c}.`;
  }
  const mins = String(Math.floor(state.time / 60)).padStart(2, '0');
  const secs = String(Math.floor(state.time % 60)).padStart(2, '0');
  document.getElementById('stat-time').innerText = `${mins}:${secs}`;
  document.getElementById('stat-level').innerText = `Nv. ${state.level}`;
  document.getElementById('stat-kills').innerText = state.kills;
  document.getElementById('stat-damage').innerText = Math.round(state.damageDealt).toLocaleString('pt-BR');
  renderGameOverCensus(state);
}

export function showGameOver(victory, state, submitMatchScore, hideVirtualJoystick) {
  state.active = false;
  state.gameOver = true;
  if (document.pointerLockElement) document.exitPointerLock();

  const modal = document.getElementById('gameover-modal');
  populateGameOverStats(victory, state);

  if (submitMatchScore) {
    submitMatchScore({
      nickname: state.playerName,
      kills: state.kills,
      timeSeconds: state.time,
      damageDealt: state.damageDealt,
      level: state.level,
      cycle: state.cycleState?.currentCycle || 1,
      reiatsu: state.peakReiatsu || 0
    });
  }
  if (hideVirtualJoystick) hideVirtualJoystick();
  if (modal) modal.classList.remove('hidden');
}
