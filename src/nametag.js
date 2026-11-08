// =======================================================================
// FLOATING NAMETAG BILLBOARD: BLEACH SOUL SURVIVOR
// Placa flutuante com nickname do Shinigami renderizada acima do personagem
// =======================================================================

import * as THREE from 'three';

const CANVAS_WIDTH = 256;
const CANVAS_HEIGHT = 64;

function drawPillBackground(ctx, w, h, radius) {
  ctx.beginPath();
  ctx.roundRect(4, 4, w - 8, h - 8, radius);
  ctx.fillStyle = 'rgba(10, 14, 26, 0.85)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#00f0ff';
  ctx.stroke();
}

function drawNicknameText(ctx, name, w, h) {
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 240, 255, 0.8)';
  ctx.shadowBlur = 8;
  ctx.fillText(name, w / 2, h / 2);
}

function renderNameToCanvas(canvas, name) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawPillBackground(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, 14);
  drawNicknameText(ctx, name, CANVAS_WIDTH, CANVAS_HEIGHT);
}

export function createPlayerNameTag(initialName = 'Shinigami') {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  renderNameToCanvas(canvas, initialName);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const geo = new THREE.PlaneGeometry(1.6, 0.4);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, 2.25, 0);
  mesh.userData.canvas = canvas;
  mesh.userData.texture = texture;
  return mesh;
}

export function updatePlayerNameTag(tagMesh, newName) {
  if (!tagMesh || !tagMesh.userData || !tagMesh.userData.canvas) return;
  const canvas = tagMesh.userData.canvas;
  const texture = tagMesh.userData.texture;
  renderNameToCanvas(canvas, newName || 'Shinigami');
  texture.needsUpdate = true;
}
