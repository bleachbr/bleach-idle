// =======================================================================
// CUSPE ÁCIDO DO ACIDWIRE: projétil inimigo em arco contra o jogador
// Desenha e move os tiros; o dano volta por retorno e quem aplica é o main.
// =======================================================================
import * as THREE from 'three';
import { FX_BEHAVIORS } from './fxConfig.js';

const CFG = FX_BEHAVIORS.hollow_acid_spit;

function paintGlob(ctx, size) {
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(240,255,190,1)');
  g.addColorStop(0.35, 'rgba(170,255,60,0.95)');
  g.addColorStop(0.7, 'rgba(70,190,20,0.55)');
  g.addColorStop(1, 'rgba(30,90,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
}

function createGlobTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  paintGlob(canvas.getContext('2d'), 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createAcidSpitPool(scene) {
  const geo = new THREE.PlaneGeometry(1, 1);
  return { scene, geo, tex: createGlobTexture(), shots: [] };
}

// Mira o ponto onde o jogador está agora: quem se move desvia.
export function spawnAcidSpit(pool, from, target, damage) {
  const dist = Math.hypot(target.x - from.x, target.z - from.z) || 1;
  const mat = new THREE.MeshBasicMaterial({
    map: pool.tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const mesh = new THREE.Mesh(pool.geo, mat);
  mesh.scale.setScalar(CFG.scale);
  pool.scene.add(mesh);
  pool.shots.push({
    mesh, damage, x: from.x, z: from.z, travelled: 0, pop: -1,
    dirX: (target.x - from.x) / dist, dirZ: (target.z - from.z) / dist, range: Math.min(dist + 3, CFG.maxDistance)
  });
}

function removeShot(pool, i) {
  const shot = pool.shots[i];
  pool.scene.remove(shot.mesh);
  shot.mesh.material.dispose();
  pool.shots.splice(i, 1);
}

function popShot(shot, dt) {
  shot.pop += dt;
  const k = Math.min(1, shot.pop / CFG.popDuration);
  shot.mesh.scale.setScalar(CFG.scale + (CFG.popScale - CFG.scale) * k);
  shot.mesh.material.opacity = 1 - k;
  return k >= 1;
}

function flyShot(shot, dt, heightAt) {
  const step = CFG.speed * dt;
  shot.x += shot.dirX * step;
  shot.z += shot.dirZ * step;
  shot.travelled += step;
  const arc = Math.sin(Math.PI * Math.min(1, shot.travelled / shot.range)) * CFG.arcHeight;
  shot.y = heightAt(shot.x, shot.z) + CFG.startHeight * (1 - shot.travelled / shot.range) + arc;
  shot.mesh.position.set(shot.x, shot.y, shot.z);
  if (shot.travelled >= shot.range) shot.pop = 0;
}

function hitsTarget(shot, target) {
  const near = Math.hypot(shot.x - target.x, shot.z - target.z) <= CFG.hitRadius;
  return near && Math.abs(shot.y - (target.y + 0.9)) < 1.4;
}

// Devolve o dano que acertou o alvo neste quadro.
export function updateAcidSpit(pool, dt, target, cameraQuaternion, heightAt) {
  let damage = 0;
  for (let i = pool.shots.length - 1; i >= 0; i--) {
    const shot = pool.shots[i];
    shot.mesh.quaternion.copy(cameraQuaternion);
    if (shot.pop >= 0) {
      if (popShot(shot, dt)) removeShot(pool, i);
      continue;
    }
    flyShot(shot, dt, heightAt);
    if (shot.pop < 0 && hitsTarget(shot, target)) {
      damage += shot.damage;
      shot.pop = 0;
    }
  }
  return damage;
}

export function clearAcidSpit(pool) {
  for (let i = pool.shots.length - 1; i >= 0; i--) removeShot(pool, i);
}
