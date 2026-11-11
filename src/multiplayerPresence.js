// Client presence loop: heartbeat sync + remote shinigami visuals.
import { syncMultiplayerSession } from './telemetry.js';
import {
  buildSyncPayload,
  selectRemotePeers,
  shouldSendSync
} from './multiplayerPresenceLogic.js';
import {
  bindRemotePlayersScene,
  applyRemoteSnapshots,
  tickRemotePlayers,
  clearRemotePlayers,
  countRemotePlayers
} from './remotePlayers.js';

const SYNC_INTERVAL_MS = 100;
let lastSyncAt = -1;
let presenceEnabled = false;

export function initMultiplayerPresence(scene, textureLoader) {
  bindRemotePlayersScene(scene, textureLoader);
}

export function enableMultiplayerPresence() {
  presenceEnabled = true;
  lastSyncAt = -1;
}

export function disableMultiplayerPresence() {
  presenceEnabled = false;
  clearRemotePlayers();
}

function applyRoomSync(err, data, localPlayerId) {
  if (err || !data?.room?.activePlayers) return;
  applyRemoteSnapshots(selectRemotePeers(data.room.activePlayers, localPlayerId));
}

export function tickMultiplayerPresence({ player, state, camera, cameraYaw, dt = 0, nowMs = Date.now() }) {
  if (!presenceEnabled || !state?.active || state.inMenu) return;
  tickRemotePlayers(dt, camera, cameraYaw);
  if (!shouldSendSync(nowMs, lastSyncAt, SYNC_INTERVAL_MS)) return;
  lastSyncAt = nowMs;
  const payload = buildSyncPayload(player, state);
  syncMultiplayerSession(payload, (err, data) => {
    applyRoomSync(err, data, state.localPlayerId);
  });
}

export function getRemotePlayerCount() {
  return countRemotePlayers();
}
