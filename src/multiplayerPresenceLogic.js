// Pure multiplayer presence helpers (no Three.js, safe for Node unit tests).

export function buildSyncPayload(player, state) {
  return {
    playerId: state.localPlayerId,
    nickname: state.playerName,
    character: state.selectedCharacter,
    x: player.x,
    y: player.y,
    z: player.z,
    hp: player.hp,
    maxHp: player.maxHp,
    dirX: player.dirX,
    dirZ: player.dirZ,
    isMoving: Boolean(player.isMoving),
    kills: state.kills,
    damageDealt: state.damageDealt
  };
}

export function selectRemotePeers(activePlayers, localPlayerId) {
  if (!Array.isArray(activePlayers)) return [];
  return activePlayers.filter((p) => p && p.id && p.id !== localPlayerId);
}

export function shouldSendSync(nowMs, lastSentMs, intervalMs = 200) {
  if (lastSentMs < 0) return true;
  return nowMs - lastSentMs >= intervalMs;
}

export function lerpAxis(current, target, alpha) {
  return current + (target - current) * alpha;
}

export function movingFromDelta(dx, dz, threshold = 0.05) {
  return (dx * dx + dz * dz) > threshold * threshold;
}

export function remoteAnimName(isMoving, speed = 0) {
  if (!isMoving && speed < 0.15) return 'idle';
  if (speed > 5.5) return 'run';
  return 'walk';
}

export function advanceAnimClock(timer, frame, dt, fps, frames) {
  const nextTimer = timer + dt;
  const interval = 1 / Math.max(1, fps || 8);
  if (nextTimer < interval) return { animTimer: nextTimer, animFrame: frame };
  const steps = Math.floor(nextTimer / interval);
  return {
    animTimer: nextTimer - steps * interval,
    animFrame: (frame + steps) % Math.max(1, frames || 1)
  };
}
