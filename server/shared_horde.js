// =======================================================================
// HORDA COMPARTILHADA AUTORITATIVA (MULTIPLAYER)
// Mantém hollows, contribuições de dano e drops de Reishi por maior dano.
// =======================================================================

const MAX_SHARED_HOLLOWS = 24;
const SPAWN_INTERVAL_MS = 1800;
const ARENA_SPAWN_RADIUS = 26;

const HOLLOW_SPECS = [
  { type: 'fishbone', hp: 50, speed: 2.8, isElite: false, amount: 1 },
  { type: 'shrieker', hp: 65, speed: 3.4, isElite: false, amount: 1 },
  { type: 'acidwire', hp: 80, speed: 2.5, isElite: false, amount: 1 },
  { type: 'elite', hp: 200, speed: 3.1, isElite: true, amount: 6 }
];

export function createSharedHordeState() {
  return {
    activeCount: 0,
    totalPurified: 0,
    bossSpawned: false,
    bossDefeated: false,
    damageLeaderboard: {},
    hollows: [],
    reishiDrops: [],
    nextHollowId: 1,
    nextReishiId: 1,
    lastTickAt: 0,
    lastSpawnAt: 0
  };
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

function pickNearestPlayer(hollow, players) {
  let best = null;
  let bestD2 = Infinity;
  for (const p of players) {
    const dx = p.x - hollow.x;
    const dz = p.z - hollow.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = p;
    }
  }
  return best;
}

function spawnSharedHollow(horde, players, now) {
  if (horde.hollows.length >= MAX_SHARED_HOLLOWS || players.length === 0) return;
  const anchor = players[horde.nextHollowId % players.length];
  const angle = ((horde.nextHollowId * 137.5) % 360) * (Math.PI / 180);
  const isElite = horde.nextHollowId % 10 === 0;
  const spec = isElite ? HOLLOW_SPECS[3] : HOLLOW_SPECS[(horde.nextHollowId - 1) % 3];
  horde.hollows.push({
    id: `sh_${horde.nextHollowId++}`,
    type: spec.type,
    x: Number((anchor.x + Math.cos(angle) * ARENA_SPAWN_RADIUS).toFixed(2)),
    z: Number((anchor.z + Math.sin(angle) * ARENA_SPAWN_RADIUS).toFixed(2)),
    hp: spec.hp,
    maxHp: spec.hp,
    speed: spec.speed,
    isElite: spec.isElite,
    isBoss: false,
    amount: spec.amount,
    damageContributions: {}
  });
  horde.lastSpawnAt = now;
}

function moveSharedHollows(horde, players, dtSec) {
  for (const h of horde.hollows) {
    const target = pickNearestPlayer(h, players);
    if (!target) continue;
    const dx = target.x - h.x;
    const dz = target.z - h.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.9) {
      h.x = Number((h.x + (dx / dist) * h.speed * dtSec).toFixed(2));
      h.z = Number((h.z + (dz / dist) * h.speed * dtSec).toFixed(2));
    }
  }
}

function applyDamageEvent(horde, playerId, ev) {
  const dmg = Number(ev?.dmg) || 0;
  if (!ev?.hollowId || dmg <= 0) return;
  const idx = horde.hollows.findIndex((h) => h.id === ev.hollowId);
  if (idx < 0) return;
  const hollow = horde.hollows[idx];
  hollow.hp -= dmg;
  hollow.damageContributions[playerId] = (hollow.damageContributions[playerId] || 0) + dmg;
  horde.damageLeaderboard[playerId] = (horde.damageLeaderboard[playerId] || 0) + dmg;
  if (hollow.hp > 0) return;

  const ownerPlayerId = getTopDamagePlayer(hollow.damageContributions, playerId);
  horde.reishiDrops.push({
    id: `sr_${horde.nextReishiId++}`,
    x: hollow.x,
    z: hollow.z,
    amount: hollow.amount || 1,
    ownerPlayerId
  });
  horde.hollows.splice(idx, 1);
  horde.totalPurified += 1;
}

function applyReishiClaim(horde, playerId, reishiId) {
  const idx = horde.reishiDrops.findIndex((r) => r.id === reishiId);
  if (idx < 0) return;
  const drop = horde.reishiDrops[idx];
  if (drop.ownerPlayerId && drop.ownerPlayerId !== playerId) return;
  horde.reishiDrops.splice(idx, 1);
}

export function stepSharedHorde(horde, playersMap, playerId, data, now = Date.now()) {
  const players = Array.from(playersMap.values());
  if (players.length >= 2) {
    const dtSec = horde.lastTickAt > 0 ? Math.min(0.5, Math.max(0, (now - horde.lastTickAt) / 1000)) : 0;
    if (dtSec > 0) moveSharedHollows(horde, players, dtSec);
    if (now - horde.lastSpawnAt >= SPAWN_INTERVAL_MS) spawnSharedHollow(horde, players, now);
    horde.lastTickAt = now;
  } else {
    horde.hollows = [];
    horde.reishiDrops = [];
    horde.lastTickAt = now;
  }

  for (const ev of Array.isArray(data?.damageEvents) ? data.damageEvents : []) {
    applyDamageEvent(horde, playerId, ev);
  }
  for (const rid of Array.isArray(data?.reishiClaims) ? data.reishiClaims : []) {
    applyReishiClaim(horde, playerId, rid);
  }
  horde.activeCount = horde.hollows.length;
  return horde;
}
