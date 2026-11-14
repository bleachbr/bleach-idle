// Pure multiplayer shared-horde helpers (no Three.js, safe for Node unit tests).

let pendingDamage = [];
let pendingReishiClaims = [];

export function shouldUseSharedHorde(remotePlayerCount) {
  return Number(remotePlayerCount) > 0;
}

export function getTopDamagePlayer(contribs, fallbackId) {
  let maxDmg = -1;
  let topId = fallbackId;
  for (const [pid, d] of Object.entries(contribs || {})) {
    if (d > maxDmg) {
      maxDmg = d;
      topId = pid;
    }
  }
  return topId;
}

export function queueSharedDamage(hollowId, dmg, weaponKey = '') {
  if (!hollowId || !(dmg > 0)) return;
  pendingDamage.push({ hollowId, dmg, weaponKey });
}

export function queueSharedReishiClaim(reishiId) {
  if (!reishiId) return;
  if (!pendingReishiClaims.includes(reishiId)) pendingReishiClaims.push(reishiId);
}

export function drainSharedHordeEvents() {
  const events = {
    damageEvents: pendingDamage,
    reishiClaims: pendingReishiClaims
  };
  pendingDamage = [];
  pendingReishiClaims = [];
  return events;
}

export function clearSharedHordeQueues() {
  pendingDamage = [];
  pendingReishiClaims = [];
}

export function reconcileSharedHollows(enemyPool, snapshots, hooks) {
  if (!Array.isArray(enemyPool) || !Array.isArray(snapshots)) return;
  const byServerId = new Map();
  for (const snap of snapshots) {
    if (snap?.id) byServerId.set(snap.id, snap);
  }
  for (const en of enemyPool) {
    if (!en.active || !en.serverId) continue;
    const snap = byServerId.get(en.serverId);
    if (!snap) {
      hooks.onDespawn(en);
      continue;
    }
    hooks.onUpdate(en, snap);
    byServerId.delete(snap.id);
  }
  for (const snap of byServerId.values()) hooks.onSpawn(snap);
}

export function reconcileSharedReishi(reishiDrops, serverDrops, hooks) {
  if (!Array.isArray(reishiDrops) || !Array.isArray(serverDrops)) return;
  const serverIds = new Set(serverDrops.map((d) => d.id).filter(Boolean));
  for (let i = reishiDrops.length - 1; i >= 0; i--) {
    const drop = reishiDrops[i];
    if (drop.serverId && !serverIds.has(drop.serverId)) hooks.onRemove(i);
  }
  const existingIds = new Set(reishiDrops.map((d) => d.serverId).filter(Boolean));
  for (const drop of serverDrops) {
    if (drop?.id && !existingIds.has(drop.id)) hooks.onSpawn(drop);
  }
}
