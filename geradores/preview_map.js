import * as THREE from 'three';
import { createHuecoMundoMap, MAP_CONFIG, PROPS_INSTANCES } from '/src/maps/hueco_mundo.js';

let scene, camera, renderer;
let mapHandle = null;
let colliderHelpers = [];
let sunlight = null;

const cameraState = {
  yaw: 45 * (Math.PI / 180),
  pitch: 35 * (Math.PI / 180),
  dist: 65,
  target: new THREE.Vector3(0, 2, 0),
  autoRotate: true
};

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

window.addEventListener('DOMContentLoaded', init);

function init() {
  const canvas = document.getElementById('preview-canvas');

  // 1. Cena
  scene = new THREE.Scene();
  scene.background = new THREE.Color(MAP_CONFIG.atmosphere.sky_color || 0x070b14);

  // Fog
  scene.fog = new THREE.Fog(
    MAP_CONFIG.atmosphere.fog_color || 0x0a0f1d,
    MAP_CONFIG.atmosphere.fog_near || 40.0,
    MAP_CONFIG.atmosphere.fog_far || 115.0
  );

  // 2. Câmera
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 500);
  updateCamera();

  // 3. Renderizador WebGL
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 4. Carregar Mapa do Hueco Mundo
  const textureLoader = new THREE.TextureLoader();
  mapHandle = createHuecoMundoMap(scene, textureLoader);

  // Luz de Inspeção Extra (desativada por padrão)
  sunlight = new THREE.DirectionalLight(0xffffff, 1.2);
  sunlight.position.set(0, 100, 0);
  sunlight.visible = false;
  scene.add(sunlight);

  // Criar Gizmos de Colisão (cilindros vermelhos sutis)
  createColliderGizmos();

  // 5. Configurar UI & Eventos
  setupControls(canvas);

  // 6. Loop de Renderização
  let lastTime = performance.now();
  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (cameraState.autoRotate && !isDragging) {
      cameraState.yaw += 0.12 * dt;
      syncSliders();
    }

    // Fazer props billboards encararem a câmera
    if (mapHandle && mapHandle.propGroup) {
      for (const child of mapHandle.propGroup.children) {
        if (child.isMesh && child.geometry.type === 'PlaneGeometry') {
          child.quaternion.copy(camera.quaternion);
        }
      }
    }

    updateCamera();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}

function createColliderGizmos() {
  const colGeo = new THREE.CylinderGeometry(1.0, 1.0, 4.0, 16);
  colGeo.translate(0, 2.0, 0);
  const colMat = new THREE.MeshBasicMaterial({
    color: 0xff3344,
    wireframe: true,
    transparent: true,
    opacity: 0.6
  });

  for (const p of PROPS_INSTANCES) {
    const mesh = new THREE.Mesh(colGeo, colMat);
    mesh.scale.set(p.colliderRadius, 1.0, p.colliderRadius);
    mesh.position.set(p.x, p.y, p.z);
    mesh.visible = false;
    scene.add(mesh);
    colliderHelpers.push(mesh);
  }
}

function updateCamera() {
  const cp = Math.cos(cameraState.pitch);
  const sp = Math.sin(cameraState.pitch);
  const sy = Math.sin(cameraState.yaw);
  const cy = Math.cos(cameraState.yaw);

  const cx = cameraState.target.x + sy * cp * cameraState.dist;
  const cy_pos = cameraState.target.y + sp * cameraState.dist;
  const cz = cameraState.target.z + cy * cp * cameraState.dist;

  camera.position.set(cx, cy_pos, cz);
  camera.lookAt(cameraState.target);
}

function syncSliders() {
  const degYaw = Math.round(((cameraState.yaw * 180) / Math.PI) % 360);
  const degPitch = Math.round((cameraState.pitch * 180) / Math.PI);
  const dist = Math.round(cameraState.dist);

  const sYaw = document.getElementById('slider-yaw');
  const sPitch = document.getElementById('slider-pitch');
  const sDist = document.getElementById('slider-dist');

  if (sYaw) sYaw.value = (degYaw + 360) % 360;
  if (sPitch) sPitch.value = degPitch;
  if (sDist) sDist.value = dist;

  const lYaw = document.getElementById('label-yaw');
  const lPitch = document.getElementById('label-pitch');
  const lDist = document.getElementById('label-dist');

  if (lYaw) lYaw.innerText = `${(degYaw + 360) % 360}°`;
  if (lPitch) lPitch.innerText = `${degPitch}°`;
  if (lDist) lDist.innerText = `${dist}m`;
}

function setupControls(canvas) {
  // Sliders
  document.getElementById('slider-yaw')?.addEventListener('input', (e) => {
    cameraState.yaw = (parseFloat(e.target.value) * Math.PI) / 180;
    cameraState.autoRotate = false;
    const chk = document.getElementById('toggle-autorotate');
    if (chk) chk.checked = false;
    syncSliders();
  });

  document.getElementById('slider-pitch')?.addEventListener('input', (e) => {
    cameraState.pitch = (parseFloat(e.target.value) * Math.PI) / 180;
    syncSliders();
  });

  document.getElementById('slider-dist')?.addEventListener('input', (e) => {
    cameraState.dist = parseFloat(e.target.value);
    syncSliders();
  });

  // Toggles
  document.getElementById('toggle-wireframe')?.addEventListener('change', (e) => {
    if (mapHandle && mapHandle.terrainMesh) {
      mapHandle.terrainMesh.material.wireframe = e.target.checked;
    }
  });

  document.getElementById('toggle-props')?.addEventListener('change', (e) => {
    if (mapHandle && mapHandle.propGroup) {
      mapHandle.propGroup.visible = e.target.checked;
    }
  });

  document.getElementById('toggle-colliders')?.addEventListener('change', (e) => {
    const show = e.target.checked;
    colliderHelpers.forEach(m => m.visible = show);
  });

  document.getElementById('toggle-sunlight')?.addEventListener('change', (e) => {
    if (sunlight) sunlight.visible = e.target.checked;
    scene.fog.color.setHex(e.target.checked ? 0x223344 : 0x0a0f1d);
  });

  document.getElementById('toggle-autorotate')?.addEventListener('change', (e) => {
    cameraState.autoRotate = e.target.checked;
  });

  // Mouse Drag Orbital
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    cameraState.autoRotate = false;
    const chk = document.getElementById('toggle-autorotate');
    if (chk) chk.checked = false;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    cameraState.yaw -= dx * 0.007;
    cameraState.pitch += dy * 0.007;
    cameraState.pitch = Math.max(0.12, Math.min(1.4, cameraState.pitch));
    syncSliders();
  });

  // Zoom com Scroll
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cameraState.dist = Math.max(15, Math.min(180, cameraState.dist + e.deltaY * 0.06));
    syncSliders();
  }, { passive: false });

  // Resize
  window.addEventListener('resize', () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}
