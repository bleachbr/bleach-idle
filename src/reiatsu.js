// =======================================================================
// BLEACH: SOUL SURVIVOR - SISTEMA DE PRESSÃO ESPIRITUAL (REIATSU) E AFK
// Cálculo de agro dinâmico, camuflagem espiritual e escalonamento de horda
// =======================================================================

export function calculateReiatsuScore(playerOrData, maybeState) {
  const data = maybeState || playerOrData || {};
  const lvl = Math.max(1, data.level || 1);
  const pReiatsu = data.passives?.reiatsu || 0;
  const cyc = Math.max(1, data.cycleState?.currentCycle || data.cycle || 1);
  const k = Math.max(0, data.kills || 0);
  return Math.floor((lvl * 12) + (pReiatsu * 30) + ((cyc - 1) * 50) + (k * 0.4));
}

export function getReiatsuAgroRadius(reiatsuScore) {
  const score = Math.max(0, reiatsuScore || 0);
  return Math.min(65.0, 16.0 * (1.0 + score / 240.0));
}

export function getReiatsuSpawnBonus(reiatsuScore) {
  const score = Math.max(0, reiatsuScore || 0);
  return Math.min(4, Math.floor(score / 160));
}

export function setPlayerCamouflage(player, playerMeshOrAfk, isAFK) {
  if (!player) return;
  const afk = typeof playerMeshOrAfk === 'boolean' ? playerMeshOrAfk : isAFK;
  player.isAFK = afk;
  const mesh = (typeof playerMeshOrAfk === 'object' ? playerMeshOrAfk : null) || player.mesh;
  if (mesh?.material) {
    mesh.material.opacity = afk ? 0.35 : 1.0;
    mesh.material.transparent = true;
  }
}

export function updateEnemyWandering(en, dt) {
  if (!en.active) return;
  en.wanderTimer = (en.wanderTimer || 0) - dt;
  if (en.wanderTimer <= 0) {
    en.wanderAngle = Math.random() * Math.PI * 2;
    en.wanderTimer = 2.0 + Math.random() * 2.5;
  }
  const wanderSpeed = (en.speed || 3.0) * 0.35;
  en.dirX = Math.cos(en.wanderAngle);
  en.dirZ = Math.sin(en.wanderAngle);
  en.x += en.dirX * wanderSpeed * dt;
  en.z += en.dirZ * wanderSpeed * dt;
}

export function getReiatsuRankTitle(reiatsuScore) {
  if (reiatsuScore < 70) return 'Shinigami Raso';
  if (reiatsuScore < 160) return 'Oficial Sentinela';
  if (reiatsuScore < 300) return 'Tenente Interino';
  if (reiatsuScore < 500) return 'Capitão do Gotei 13';
  return 'Mestre da Bankai';
}
