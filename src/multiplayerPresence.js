// Client presence loop: heartbeat sync + remote shinigami visuals.
import { syncMultiplayerSession } from './telemetry.js';
import {
  buildSyncPayload,
  selectRemotePeers,
  shouldSendSync
} from './multiplayerPresenceLogic.js';
import {
  bindRemotePlayersScene,
  syncRemotePlayers,
  clearRemotePlayers,
  countRemotePlayers
} from './remotePlayers.js';

const SYNC_INTERVAL_MS = 200;
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

function applyRoomSync(err, data, camera, cameraYaw, localPlayerId) {
  if (err || !data?.room?.activePlayers) return;
  const remotes = selectRemotePeers(data.room.activePlayers, localPlayerId);
  syncRemotePlayers(remotes, camera, cameraYaw);
}

export function tickMultiplayerPresence({ player, state, camera, cameraYaw, nowMs = Date.now() }) {
  if (!presenceEnabled || !state?.active || state.inMenu) return;
  if (!shouldSendSync(nowMs, lastSyncAt, SYNC_INTERVAL_MS)) return;
  lastSyncAt = nowMs;
  const payload = buildSyncPayload(player, state);
  syncMultiplayerSession(payload, (err, data) => {
    applyRoomSync(err, data, camera, cameraYaw, state.localPlayerId);
  });
}

export function getRemotePlayerCount() {
  return countRemotePlayers();
}
