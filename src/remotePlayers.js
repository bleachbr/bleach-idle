// Remote shinigami billboards synced from the multiplayer room.
import * as THREE from 'three';
import { loadPlayerKit, showPlayerFrame } from './playerSprite.js';
import { createPlayerNameTag, updatePlayerNameTag } from './nametag.js';
import { getSpriteDirection } from './movement.js';
import {
  advanceAnimClock,
  lerpAxis,
  movingFromDelta,
  remoteAnimName
} from './multiplayerPresenceLogic.js';

const remotes = new Map();
let sceneRef = null;
let loader = null;

export function bindRemotePlayersScene(scene, textureLoader) {
  sceneRef = scene;
  loader = textureLoader;
}

function buildRemoteBillboard() {
  const geo = new THREE.PlaneGeometry(2.35, 2.35);
  geo.translate(0, 1.175, 0);
  const mat = new THREE.MeshBasicMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide
  });
  return new THREE.Mesh(geo, mat);
}

function createRemoteMesh(peer) {
  const mesh = buildRemoteBillboard();
  const tag = createPlayerNameTag(peer.nickname || 'Shinigami', 2.50);
  mesh.add(tag);
  const kit = loadPlayerKit(loader, peer.character || 'ichigo_shikai');
  showPlayerFrame(mesh, kit, { anim: 'idle', frame: 0 }, 'back');
  sceneRef.add(mesh);
  const x = peer.x || 0, y = peer.y || 0, z = peer.z || 0;
  return {
    mesh, tag, kit, nickname: peer.nickname, character: peer.character,
    x, y, z, targetX: x, targetY: y, targetZ: z,
    dirX: peer.dirX || 0, dirZ: peer.dirZ || -1,
    isMoving: Boolean(peer.isMoving), animTimer: 0, animFrame: 0
  };
}

function ensureRemote(peer) {
  let entry = remotes.get(peer.id);
  if (!entry) {
    entry = createRemoteMesh(peer);
    remotes.set(peer.id, entry);
    return entry;
  }
  if (peer.nickname && peer.nickname !== entry.nickname) {
    updatePlayerNameTag(entry.tag, peer.nickname);
    entry.nickname = peer.nickname;
  }
  if (peer.character && peer.character !== entry.character) {
    entry.kit = loadPlayerKit(loader, peer.character);
    entry.character = peer.character;
  }
  return entry;
}

function applyPeerPose(entry, peer) {
  entry.targetX = Number(peer.x) || 0;
  entry.targetY = Number(peer.y) || 0;
  entry.targetZ = Number(peer.z) || 0;
  entry.dirX = Number(peer.dirX) || 0;
  entry.dirZ = Number(peer.dirZ) || -1;
  const dx = entry.targetX - entry.x;
  const dz = entry.targetZ - entry.z;
  entry.isMoving = Boolean(peer.isMoving) || movingFromDelta(dx, dz, 0.08);
}

export function applyRemoteSnapshots(peers) {
  if (!sceneRef || !loader) return;
  const ids = new Set();
  for (const peer of peers) {
    ids.add(peer.id);
    applyPeerPose(ensureRemote(peer), peer);
  }
  pruneMissing(ids);
}

function clipMeta(kit, anim) {
  return kit?.manifest?.anims?.[anim] || { fps: 8, frames: 1 };
}

function tickEntryVisual(entry, dt, camera, cameraYaw) {
  const alpha = Math.min(1, dt * 12);
  entry.x = lerpAxis(entry.x, entry.targetX, alpha);
  entry.y = lerpAxis(entry.y, entry.targetY, alpha);
  entry.z = lerpAxis(entry.z, entry.targetZ, alpha);
  const dx = entry.targetX - entry.x;
  const dz = entry.targetZ - entry.z;
  const speed = Math.hypot(dx, dz) / Math.max(dt, 1e-3);
  const moving = entry.isMoving || movingFromDelta(dx, dz, 0.04);
  const anim = remoteAnimName(moving, speed);
  const clip = clipMeta(entry.kit, anim);
  const clock = advanceAnimClock(entry.animTimer, entry.animFrame, dt, clip.fps, clip.frames);
  entry.animTimer = clock.animTimer;
  entry.animFrame = clock.animFrame;
  entry.mesh.position.set(entry.x, entry.y, entry.z);
  entry.mesh.quaternion.copy(camera.quaternion);
  const view = getSpriteDirection(entry.dirX, entry.dirZ, cameraYaw);
  showPlayerFrame(entry.mesh, entry.kit, { anim, frame: entry.animFrame }, view);
}

export function tickRemotePlayers(dt, camera, cameraYaw) {
  if (!sceneRef || !camera) return;
  for (const entry of remotes.values()) {
    tickEntryVisual(entry, dt, camera, cameraYaw);
  }
}

function pruneMissing(activeIds) {
  for (const [id, entry] of remotes.entries()) {
    if (activeIds.has(id)) continue;
    sceneRef.remove(entry.mesh);
    entry.mesh.geometry?.dispose?.();
    entry.mesh.material?.dispose?.();
    remotes.delete(id);
  }
}

export function clearRemotePlayers() {
  for (const entry of remotes.values()) {
    sceneRef?.remove(entry.mesh);
  }
  remotes.clear();
}

export function countRemotePlayers() {
  return remotes.size;
}
