// =======================================================================
// CLIPES DE ATAQUE, DANO E MORTE DOS HOLLOWS (Fishbone, Shrieker, Acidwire, Elite, Encouraçado, Sombrio e Menos Grande)
// Cada clipe é uma tira de 12 quadros por vista; `side` espelha `side_l`.
// Cada quadro vira uma textura própria (clone com a mesma imagem), porque
// centenas de hollows dividem a tira e cada um está num quadro diferente.
// =======================================================================
import * as THREE from 'three';
import { startHollowHurt } from './hollowTypes.js';

// Clipes por pasta de src/assets/monsters. Hollow sem pasta clips/ só anda.
const FOLDER_MANIFESTS = Object.fromEntries(
  Object.entries(import.meta.glob('./assets/monsters/*/clips/manifest.json', { eager: true, import: 'default' }))
    .map(([path, manifest]) => [path.split('/')[3], manifest])
);
// en.type -> pasta. O elite tem desenho próprio (atributos de Fishbone reforçado) e o chefe 'menos' mora em menos_grande.
const CLIP_FOLDER = {
  fishbone: 'fishbone', elite: 'elite', shrieker: 'shrieker', acidwire: 'acidwire',
  ironhide: 'ironhide', wraith: 'wraith', menos: 'menos_grande',
};
const MANIFESTS = Object.fromEntries(
  Object.entries(CLIP_FOLDER).filter(([, folder]) => FOLDER_MANIFESTS[folder]).map(([type, folder]) => [type, FOLDER_MANIFESTS[folder]])
);
const WALK_PLANE = 2.2; // Plano do walk8 (quadro de 128 px) em initEnemyPool
const DEATH_FADE = 0.5;

function sliceFrames(tex, count, mirrored) {
  const frames = [];
  for (let i = 0; i < count; i++) {
    const f = tex.clone();
    f.repeat.x = (mirrored ? -1 : 1) / count;
    f.offset.x = (mirrored ? i + 1 : i) / count;
    f.needsUpdate = true;
    frames.push(f);
  }
  return frames;
}

// Os clones só são criados quando a imagem chega: um clone feito antes nunca sobe para a GPU.
function loadStrip(loader, store, folder, clipId, view) {
  const count = FOLDER_MANIFESTS[folder].anims[clipId].frames;
  loader.load(`/src/assets/monsters/${folder}/clips/${clipId}_${view}.png`, (tex) => {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    store.frames[`${folder}_${clipId}_${view}`] = sliceFrames(tex, count, false);
    if (view === 'side_l') store.frames[`${folder}_${clipId}_side`] = sliceFrames(tex, count, true);
  });
}

function planeFor(store, frameSize) {
  if (!store.planes[frameSize]) {
    const size = WALK_PLANE * frameSize / 128;
    store.planes[frameSize] = new THREE.PlaneGeometry(size, size).translate(0, size / 2, 0);
  }
  return store.planes[frameSize];
}

export function loadHollowClips(loader) {
  const store = { frames: {}, planes: {} };
  for (const [folder, manifest] of Object.entries(FOLDER_MANIFESTS)) {
    for (const clipId of Object.keys(manifest.anims)) {
      for (const view of ['front', 'side_l', 'back']) loadStrip(loader, store, folder, clipId, view);
    }
  }
  return store;
}

function restoreWalkPlane(en) {
  if (en.walkGeometry) en.mesh.geometry = en.walkGeometry;
}

function setMap(mesh, tex) {
  if (mesh.material.map === tex) return;
  mesh.material.map = tex;
  mesh.material.needsUpdate = true;
}

// Mostra o quadro do clipe em curso. Devolve false quando o hollow está só andando.
export function applyHollowClip(en, view, store) {
  const spec = en.clip && MANIFESTS[en.type]?.anims[en.clip.id];
  const frames = spec && store.frames[`${CLIP_FOLDER[en.type]}_${en.clip.id}_${view}`];
  if (!frames) {
    restoreWalkPlane(en);
    return false;
  }
  en.walkGeometry = en.walkGeometry || en.mesh.geometry;
  en.mesh.geometry = planeFor(store, spec.frameSize);
  setMap(en.mesh, frames[Math.min(frames.length - 1, Math.floor(en.clip.t * spec.fps))]);
  return true;
}

export function hideHollow(en) {
  en.dying = false;
  en.clip = null;
  restoreWalkPlane(en);
  en.mesh.material.opacity = 1;
  en.mesh.visible = false;
  en.mesh.position.set(0, -999, 0);
}

// Ao levar golpe: o lampejo branco de sempre e, se o tipo tem o clipe 'hurt', o tranco.
export function flinchHollow(en) {
  en.flashTimer = 0.12;
  en.mesh.material.color.setHex(0xffffff);
  startHollowHurt(en, Boolean(MANIFESTS[en.type]?.anims.hurt));
}

// Hollow sem clipe de morte some na hora, como antes.
export function startHollowDeath(en) {
  en.active = false;
  if (!MANIFESTS[en.type]?.anims.death) {
    hideHollow(en);
    return;
  }
  en.dying = true;
  en.clip = { id: 'death', t: 0 };
}

function tickDeath(en, dt) {
  const spec = MANIFESTS[en.type].anims.death;
  en.clip.t += dt;
  const fade = en.clip.t - spec.frames / spec.fps;
  if (fade > 0) en.mesh.material.opacity = Math.max(0, 1 - fade / DEATH_FADE);
  if (fade >= DEATH_FADE) hideHollow(en);
}

export function updateDyingHollows(enemies, dt) {
  for (const en of enemies) {
    if (en.dying) tickDeath(en, dt);
  }
}
