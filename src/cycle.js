// =======================================================================
// BLEACH: SOUL SURVIVOR - CICLO INFINITO DE SOBREVIVÊNCIA (ENDLESS CYCLE)
// Gerenciamento de ondas escalonadas, atributos e progressão de chefes
// =======================================================================

export function createCycleState() {
  return {
    currentCycle: 1,
    timeInCycle: 0,
    killsInCycle: 0,
    bossSpawned: false,
    bossActive: false,
    highestCycle: 1
  };
}

export function getCycleMultipliers(cycleState) {
  const c = Math.max(1, cycleState ? cycleState.currentCycle : 1);
  const hpMult = 1.0 + 0.35 * (c - 1);
  const speedMult = Math.min(1.45, 1.0 + 0.08 * (c - 1));
  const damageMult = 1.0 + 0.20 * (c - 1);
  return {
    hp: hpMult,
    hpMult,
    bossHpMult: 1.0 + 0.45 * (c - 1),
    speed: speedMult,
    speedMult,
    damage: damageMult,
    damageMult,
    reishiBonus: Math.min(3, 1 + Math.floor((c - 1) * 0.5))
  };
}

export function shouldSpawnCycleBoss(cycleState, matchTime, totalKills) {
  if (!cycleState || cycleState.bossSpawned || cycleState.bossActive) return false;
  const mTime = matchTime ?? cycleState.matchTime ?? 0;
  const tKills = totalKills ?? cycleState.totalKills ?? 0;
  if (cycleState.currentCycle === 1) return mTime >= 120 || tKills >= 60;
  const killThreshold = 45 + (cycleState.currentCycle - 1) * 15;
  return cycleState.killsInCycle >= killThreshold || cycleState.timeInCycle >= 80;
}

export function markBossSpawned(cycleState) {
  if (!cycleState) return;
  cycleState.bossSpawned = true;
  cycleState.bossActive = true;
}

function showCycleAnnouncement(cycleNumber) {
  if (typeof document === 'undefined') return;
  let banner = document.getElementById('cycle-announcement');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'cycle-announcement';
    banner.className = 'cycle-announcement';
    document.body.appendChild(banner);
  }
  banner.innerHTML = `
    <div class="cycle-title">⚔️ CICLO ${cycleNumber} INICIADO!</div>
    <div class="cycle-subtitle">A NOITE DO HUECO MUNDO SE INTENSIFICA — HORDA ESCALONADA</div>
  `;
  banner.classList.remove('active');
  void banner.offsetWidth;
  banner.classList.add('active');
  setTimeout(() => banner.classList.remove('active'), 3200);
}

export function advanceToNextCycle(cycleState, bossX, bossZ, spawnReishiFn) {
  if (!cycleState) return { newCycle: 1, reishiShowerCount: 0 };
  cycleState.currentCycle += 1;
  cycleState.highestCycle = Math.max(cycleState.highestCycle, cycleState.currentCycle);
  cycleState.timeInCycle = 0;
  cycleState.killsInCycle = 0;
  cycleState.bossSpawned = false;
  cycleState.bossActive = false;

  const count = 14 + cycleState.currentCycle * 2;
  if (spawnReishiFn) spawnReishiFn(bossX, bossZ, count);
  showCycleAnnouncement(cycleState.currentCycle);
  return { newCycle: cycleState.currentCycle, reishiShowerCount: count };
}

export function updateCycleProgress(cycleState, dt, matchTime, totalKills) {
  if (!cycleState) return;
  cycleState.timeInCycle += dt;
  if (matchTime !== undefined) cycleState.matchTime = matchTime;
  if (totalKills !== undefined) cycleState.totalKills = totalKills;
}

export function registerKillInCycle(cycleState) {
  if (!cycleState) return;
  cycleState.killsInCycle += 1;
}

export function resetCycleState(cycleState) {
  if (!cycleState) return;
  cycleState.currentCycle = 1;
  cycleState.timeInCycle = 0;
  cycleState.killsInCycle = 0;
  cycleState.bossSpawned = false;
  cycleState.bossActive = false;
  cycleState.highestCycle = 1;
}
