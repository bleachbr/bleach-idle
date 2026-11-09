// =======================================================================
// DESENHO DO KIT DE ANIMAÇÕES DO JOGADOR
// Cada clipe é uma tira horizontal por vista. A vista `side` espelha `side_l` pela UV,
// e o quadro é escolhido pelo offset da textura, sem trocar de arquivo a cada passo.
// =======================================================================
import * as THREE from 'three';
import manifest from './assets/characters/ichigo_shikai/anims/manifest.json';

const BASE_DIR = '/src/assets/characters/ichigo_shikai/anims/';
const BASE_PLANE_SIZE = 2.35; // Tamanho do plano de um quadro de 128 px, o mesmo da caminhada original

export const playerAnimCatalog = manifest.anims;

function loadStrip(loader, name) {
  const tex = loader.load(`${BASE_DIR}${name}.png`);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFramePlane(frameSize) {
  const size = BASE_PLANE_SIZE * (frameSize / manifest.baseFrameSize);
  const geo = new THREE.PlaneGeometry(size, size);
  geo.translate(0, size / 2, 0);
  return geo;
}

// Golpes têm quadro maior para caber a espada. Como a baseline é proporcional ao quadro,
// um plano proporcional mantém os pés e a escala do corpo no mesmo lugar em todos os clipes.
function buildPlanes() {
  const planes = {};
  for (const { frameSize } of Object.values(manifest.anims)) {
    if (!planes[frameSize]) planes[frameSize] = createFramePlane(frameSize);
  }
  return planes;
}

export function loadPlayerKit(loader) {
  const strips = {};
  for (const anim of Object.keys(manifest.anims)) {
    for (const view of ['front', 'side_l', 'back']) {
      strips[`${anim}_${view}`] = loadStrip(loader, `${anim}_${view}`);
    }
    strips[`${anim}_side`] = strips[`${anim}_side_l`].clone();
  }
  return { strips, planes: buildPlanes() };
}

function selectFrame(tex, frame, frames, mirrored) {
  tex.repeat.x = (mirrored ? -1 : 1) / frames;
  tex.offset.x = (mirrored ? frame + 1 : frame) / frames;
}

export function showPlayerFrame(mesh, kit, { anim, frame }, view) {
  const clip = manifest.anims[anim];
  const tex = kit.strips[`${anim}_${view}`];
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
