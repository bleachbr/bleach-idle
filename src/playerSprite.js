// =======================================================================
// DESENHO DO KIT DE ANIMAÇÕES DO JOGADOR
// Cada clipe é uma tira horizontal por vista. A vista `side` espelha `side_l` pela UV,
// e o quadro é escolhido pelo offset da textura, sem trocar de arquivo a cada passo.
// Cada personagem jogável tem o seu kit em src/assets/characters/<id>/anims.
// =======================================================================
import * as THREE from 'three';
import { versionedAssetUrl } from './assetVersion.js';

// Todo loader do Three que usa o gerenciador padrão passa por aqui: personagens, hollows, FX e mapas.
// Este módulo é importado pelo main.js antes de qualquer textura ser pedida.
THREE.DefaultLoadingManager.setURLModifier(versionedAssetUrl);

const MANIFESTS = Object.fromEntries(
  Object.entries(import.meta.glob('./assets/characters/*/anims/manifest.json', { eager: true, import: 'default' }))
    .map(([path, manifest]) => [path.split('/')[3], manifest])
);
const BASE_PLANE_SIZE = 2.35; // Tamanho do plano de um quadro de 128 px, o mesmo da caminhada original
const loadedKits = {};

// Os 22 clipes têm o mesmo ritmo em todo o elenco (geradores/kit_cast.py), então a máquina de
// estados usa um catálogo só. O tamanho de quadro, que varia, fica no kit de cada personagem.
export const playerAnimCatalog = MANIFESTS.ichigo_shikai.anims;

export function hasPlayerKit(charId) {
  return Boolean(MANIFESTS[charId]);
}

function loadStrip(loader, charId, name) {
  const tex = loader.load(`/src/assets/characters/${charId}/anims/${name}.png`);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFramePlane(manifest, frameSize) {
  const size = BASE_PLANE_SIZE * (frameSize / manifest.baseFrameSize);
  const geo = new THREE.PlaneGeometry(size, size);
  geo.translate(0, size / 2, 0);
  return geo;
}

// Golpes têm quadro maior para caber a arma. Como a baseline é proporcional ao quadro,
// um plano proporcional mantém os pés e a escala do corpo no mesmo lugar em todos os clipes.
function buildPlanes(manifest) {
  const planes = {};
  for (const { frameSize } of Object.values(manifest.anims)) {
    if (!planes[frameSize]) planes[frameSize] = createFramePlane(manifest, frameSize);
  }
  return planes;
}

function buildKit(loader, charId) {
  const manifest = MANIFESTS[charId];
  const strips = {};
  for (const anim of Object.keys(manifest.anims)) {
    for (const view of ['front', 'side_l', 'back']) {
      strips[`${anim}_${view}`] = loadStrip(loader, charId, `${anim}_${view}`);
    }
    strips[`${anim}_side`] = strips[`${anim}_side_l`].clone();
  }
  return { manifest, strips, planes: buildPlanes(manifest) };
}

// Personagem sem kit cai no Ichigo, para a partida nunca começar sem sprite.
export function loadPlayerKit(loader, charId = 'ichigo_shikai') {
  const id = hasPlayerKit(charId) ? charId : 'ichigo_shikai';
  if (!loadedKits[id]) loadedKits[id] = buildKit(loader, id);
  return loadedKits[id];
}

function selectFrame(tex, frame, frames, mirrored) {
  tex.repeat.x = (mirrored ? -1 : 1) / frames;
  tex.offset.x = (mirrored ? frame + 1 : frame) / frames;
}

export function showPlayerFrame(mesh, kit, { anim, frame }, view) {
  const clip = kit?.manifest.anims[anim];
  const tex = kit?.strips[`${anim}_${view}`];
  if (!clip || !tex) return;
  selectFrame(tex, frame, clip.frames, view === 'side');
  if (mesh.material.map !== tex) {
    mesh.material.map = tex;
    mesh.material.needsUpdate = true;
  }
  mesh.geometry = kit.planes[clip.frameSize];
}

export function updatePlayerShadow(shadowMesh, playerY, terrainY) {
  if (!shadowMesh) return;
  const jumpOffset = playerY - terrainY;
  shadowMesh.position.set(0, -jumpOffset + 0.02, 0);
  const factor = Math.max(0.35, 1.0 - (jumpOffset / 2.5) * 0.5);
  shadowMesh.scale.set(factor, factor, 1.0);
  if (shadowMesh.material) {
    shadowMesh.material.opacity = Math.max(0.12, 0.45 - (jumpOffset / 2.5) * 0.3);
  }
}
