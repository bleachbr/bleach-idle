// Remote shinigami billboards synced from the multiplayer room.
import * as THREE from 'three';
import { loadPlayerKit, showPlayerFrame } from './playerSprite.js';
import { createPlayerNameTag, updatePlayerNameTag } from './nametag.js';
import { getSpriteDirection } from './movement.js';

const remotes = new Map();
let sceneRef = null;
let loader = null;

export function bindRemotePlayersScene(scene, textureLoader) {
  sceneRef = scene;
  loader = textureLoader;
}

function createRemoteMesh(peer) {
  const geo = new THREE.PlaneGeometry(2.35, 2.35);
  geo.translate(0, 1.175, 0);
  const mat = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geo, mat);
  const tag = createPlayerNameTag(peer.nickname || 'Shinigami', 2.50);
  mesh.add(tag);
  const kit = loadPlayerKit(loader, peer.character || 'ichigo_shikai');
  showPlayerFrame(mesh, kit, { anim: 'idle', frame: 0 }, 'back');
  sceneRef.add(mesh);
  return { mesh, tag, kit, nickname: peer.nickname, character: peer.character };
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

function updateRemoteVisual(entry, peer, camera, cameraYaw) {
  entry.mesh.position.set(peer.x || 0, peer.y || 0, peer.z || 0);
  entry.mesh.quaternion.copy(camera.quaternion);
  const anim = peer.isMoving ? 'run' : 'idle';
  const view = getSpriteDirection(peer.dirX || 0, peer.dirZ || -1, cameraYaw);
  showPlayerFrame(entry.mesh, entry.kit, { anim, frame: 0 }, view);
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

export function syncRemotePlayers(peers, camera, cameraYaw) {
  if (!sceneRef || !loader || !camera) return;
  const ids = new Set();
  for (const peer of peers) {
    ids.add(peer.id);
    const entry = ensureRemote(peer);
    updateRemoteVisual(entry, peer, camera, cameraYaw);
  }
  pruneMissing(ids);
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
