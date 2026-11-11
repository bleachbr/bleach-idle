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
