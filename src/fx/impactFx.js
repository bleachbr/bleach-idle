// =======================================================================
// EFEITOS DE IMPACTO: o estouro no ponto em que um golpe acerta o hollow
// Cada estouro toca uma vez e some. Os quadros ficam em src/assets/fx/hit_*/frame_N.png,
// achados pelo manifesto da pasta; a regra de qual golpe usa qual estouro está em impactRules.js.
// =======================================================================
import * as THREE from 'three';
import { impactFor, impactFrame, IMPACT_LIMIT } from './impactRules.js';

const MANIFESTS = Object.fromEntries(
  Object.values(import.meta.glob('../assets/fx/hit_*/manifest.json', { eager: true, import: 'default' }))
    .map((manifest) => [manifest.id, manifest])
);
const HEIGHT = 1.3; // Centro do estouro: o peito de um hollow comum

function loadFrame(loader, id, f) {
  const tex = loader.load(`/src/assets/fx/${id}/frame_${f}.png`);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function impactMaterial(map, tint) {
  // Sem teste de profundidade: o estouro fica na frente do hollow que ele acertou.
  const mat = new THREE.MeshBasicMaterial({
    map, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, depthTest: false, side: THREE.DoubleSide
  });
  if (tint) mat.color.setHex(tint);
  return mat;
}

export class ImpactFx {
  constructor(scene, loader = new THREE.TextureLoader()) {
    this.scene = scene;
    this.live = [];
    this.geo = new THREE.PlaneGeometry(1, 1);
    this.frames = {};
    for (const [id, manifest] of Object.entries(MANIFESTS)) {
      this.frames[id] = Array.from({ length: manifest.frameCount }, (_, f) => loadFrame(loader, id, f));
    }
  }

  spawn(fxKey, x, z, tint) {
    const hit = impactFor(fxKey);
    const frames = hit && this.frames[hit.id];
    if (!frames) return null;
    if (this.live.length >= IMPACT_LIMIT) this.remove(this.live.shift());
    const mesh = new THREE.Mesh(this.geo, impactMaterial(frames[0], tint));
    mesh.position.set(x, HEIGHT, z);
    // Espelhar ao acaso evita que vários acertos seguidos pareçam o mesmo carimbo.
    mesh.scale.set(Math.random() < 0.5 ? -hit.size : hit.size, hit.size, 1);
    mesh.renderOrder = 10;
    this.scene.add(mesh);
    const item = { mesh, frames, fps: MANIFESTS[hit.id].fps, t: 0 };
    this.live.push(item);
    return item;
  }

  update(dt, cameraQuaternion) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const item = this.live[i];
      item.t += dt;
      const frame = impactFrame(item.t, item.fps, item.frames.length);
      if (frame < 0) {
        this.remove(item);
        this.live.splice(i, 1);
        continue;
      }
      item.mesh.quaternion.copy(cameraQuaternion);
      item.mesh.material.map = item.frames[frame];
    }
  }

  remove(item) {
    this.scene.remove(item.mesh);
    item.mesh.material.dispose();
  }

  reset() {
    for (const item of this.live) this.remove(item);
    this.live = [];
  }
}
