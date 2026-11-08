// =======================================================================
// BLEACH: SOUL SURVIVOR - PRÓLOGO E BRIEFING NO DANGAI (DG)
// Encontro tático com Rukia Kuchiki antes da travessia para o Hueco Mundo
// =======================================================================

import * as THREE from 'three';
import { createPlayerNameTag } from './nametag.js';

const DIALOGUE_PAGES = [
  {
    speaker: 'Kuchiki Rukia',
    rank: 'Tenente da 13ª Divisão',
    avatar: '/src/assets/characters/rukia/front_0.png',
    text: 'Atenção, Shinigami! Fomos interceptados aqui no Dangai. Nossos instrumentos no Departamento de Pesquisa e Desenvolvimento detectaram uma ruptura crítica de Reiatsu!',
    btnText: '❯ Próximo [Espaço]'
  },
  {
    speaker: 'Kuchiki Rukia',
    rank: 'Tenente da 13ª Divisão',
    avatar: '/src/assets/characters/rukia/front_0.png',
    text: 'Uma invasão massiva de Hollows rompeu as fronteiras do Hueco Mundo. Se não contivermos a horda imediatamente, a fenda consumirá o Mundo dos Vivos e o Seireitei!',
    btnText: '❯ Próximo [Espaço]'
  },
  {
    speaker: 'Kuchiki Rukia',
    rank: 'Tenente da 13ª Divisão',
    avatar: '/src/assets/characters/rukia/front_0.png',
    text: 'Sua missão é direta: atravesse o Senkaimon imediatamente até as dunas brancas do Hueco Mundo, contenha o avanço Hollow e sobreviva ao ataque.',
    btnText: '❯ Próximo [Espaço]'
  },
  {
    speaker: 'Kuchiki Rukia',
    rank: 'Tenente da 13ª Divisão',
    avatar: '/src/assets/characters/rukia/front_0.png',
    text: 'Seu objetivo supremo é aniquilar o Menos Grande (Gillian) que comanda a investida e retornar vivo ao Seireitei! Empunhe sua Zanpakutō. Vá agora!',
    btnText: '⛩️ Atravessar Senkaimon [Espaço]'
  }
];

let prologueActive = false;
let isCinematicTransition = false;
let cinematicClock = 0;
let portalMesh = null;
const CINEMATIC_DURATION = 1.4;
let currentStep = 0;
let typewriterTimer = null;
let rukiaNPC = null;
let sceneRef = null;
let onCompleteCb = null;
let dangaiMapRef = null;
let animClock = 0;
let isTyping = false;
const RUKIA_FRAMES = [];

function preloadRukiaTextures(loader) {
  if (RUKIA_FRAMES.length === 8) return;
  for (let i = 0; i < 8; i++) {
    const tex = loader.load(`/src/assets/characters/rukia/back_${i}.png`);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    RUKIA_FRAMES.push(tex);
  }
}

function buildRukiaMesh(loader, baseY) {
  preloadRukiaTextures(loader);
  const mat = new THREE.MeshStandardMaterial({
    map: RUKIA_FRAMES[0] || loader.load('/src/assets/characters/rukia/back_0.png'),
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide
  });
  const geo = new THREE.PlaneGeometry(2.35, 2.35);
  geo.translate(0, 1.175, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(-0.85, baseY, 0);
  return mesh;
}

function buildRukiaShadow(baseY) {
  const sGeo = new THREE.CircleGeometry(0.75, 16);
  sGeo.rotateX(-Math.PI / 2);
  const sMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 });
  const shadow = new THREE.Mesh(sGeo, sMat);
  shadow.position.set(-0.85, baseY + 0.03, 0);
  return shadow;
}

function spawnRukia(scene, loader, getHeightFn) {
  const group = new THREE.Group();
  group.name = 'rukia_npc_group';
  const baseY = getHeightFn ? getHeightFn(-0.85, 0) : 0;
  const mesh = buildRukiaMesh(loader, baseY);
  const shadow = buildRukiaShadow(baseY);
  const tag = createPlayerNameTag('Kuchiki Rukia (Tenente)', 2.50);
  tag.position.set(-0.85, baseY + 2.35, 0);

  group.add(shadow);
  group.add(mesh);
  group.add(tag);
  group.userData = { mesh, shadow, tag, baseY };
  scene.add(group);
  return group;
}

const DIALOGUE_TEMPLATE = [
  '<div id="briefing-box" class="briefing-card">',
  '  <div class="briefing-avatar-col">',
  '    <div class="briefing-avatar-frame">',
  '      <img id="briefing-avatar-img" src="/src/assets/characters/rukia/front_0.png" alt="Rukia" />',
  '      <div class="avatar-speaker-badge">TENENTE</div>',
  '    </div>',
  '  </div>',
  '  <div class="briefing-body-col">',
  '    <div class="briefing-header">',
  '      <div class="speaker-titles">',
  '        <span class="speaker-name">Kuchiki Rukia</span>',
  '        <span class="speaker-division">13ª Divisão do Gotei 13</span>',
  '      </div>',
  '      <span id="briefing-counter" class="briefing-counter">1 / 4</span>',
  '    </div>',
  '    <p id="briefing-text" class="briefing-text"></p>',
  '    <div class="briefing-actions">',
  '      <button id="btn-briefing-skip" class="btn-briefing-secondary" type="button">⏭ Pular Briefing</button>',
  '      <button id="btn-briefing-next" class="btn-briefing-primary" type="button">❯ Próximo [Espaço]</button>',
  '    </div>',
  '  </div>',
  '</div>'
].join('');

function setupDialogueDOM() {
  let overlay = document.getElementById('prologue-overlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'prologue-overlay';
  overlay.className = 'prologue-overlay hidden';
  overlay.innerHTML = DIALOGUE_TEMPLATE;
  document.body.appendChild(overlay);
  return overlay;
}

function startTypewriter(fullText, textEl) {
  if (typewriterTimer) clearInterval(typewriterTimer);
  isTyping = true;
  let charIdx = 0;
  textEl.textContent = '';
  typewriterTimer = setInterval(() => {
    if (charIdx < fullText.length) {
      textEl.textContent += fullText[charIdx++];
    } else {
      clearInterval(typewriterTimer);
      typewriterTimer = null;
      isTyping = false;
    }
  }, 22);
}

function renderDialogueStep(idx) {
  const page = DIALOGUE_PAGES[idx];
  const overlay = setupDialogueDOM();
  overlay.classList.remove('hidden');

  const avatar = document.getElementById('briefing-avatar-img');
  const counter = document.getElementById('briefing-counter');
  const nextBtn = document.getElementById('btn-briefing-next');
  const textEl = document.getElementById('briefing-text');

  if (avatar) avatar.src = page.avatar;
  if (counter) counter.textContent = `${idx + 1} / ${DIALOGUE_PAGES.length}`;
  if (nextBtn) nextBtn.textContent = page.btnText;
  if (textEl) startTypewriter(page.text, textEl);
}

function finishInstantTyping() {
  if (!isTyping || !typewriterTimer) return;
  clearInterval(typewriterTimer);
  typewriterTimer = null;
  isTyping = false;
  const textEl = document.getElementById('briefing-text');
  if (textEl) textEl.textContent = DIALOGUE_PAGES[currentStep].text;
}

function triggerSenkaimonTransition(onFinish) {
  let flash = document.getElementById('senkaimon-flash');
  if (!flash) {
    flash = document.createElement('div');
    flash.id = 'senkaimon-flash';
    flash.className = 'senkaimon-flash';
    document.body.appendChild(flash);
  }
  flash.classList.add('active');
  setTimeout(() => {
    if (onFinish) onFinish();
    setTimeout(() => {
      flash.classList.remove('active');
    }, 450);
  }, 400);
}

function buildPortalCanvas() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 160;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 128, 160);
  ctx.fillStyle = '#38bdf8'; ctx.shadowColor = '#67e8f9'; ctx.shadowBlur = 12;
  ctx.fillRect(8, 8, 112, 144);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(24, 24, 80, 112);
  return c;
}

function createSenkaimonPortal(scene, baseY) {
  const group = new THREE.Group();
  group.name = 'senkaimon_portal_group';
  const geo = new THREE.PlaneGeometry(3.6, 4.8);
  geo.translate(0, 2.4, 0);
  const tex = new THREE.CanvasTexture(buildPortalCanvas());
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);
  group.position.set(0, baseY, -8.5);
  scene.add(group);
  return group;
}

function cleanupPrologueEntities() {
  prologueActive = false;
  isCinematicTransition = false;
  if (portalMesh && sceneRef) {
    sceneRef.remove(portalMesh);
    portalMesh = null;
  }
  if (rukiaNPC && sceneRef) {
    sceneRef.remove(rukiaNPC);
    rukiaNPC = null;
  }
}

function completePrologue() {
  cleanupPrologueEntities();
  const overlay = document.getElementById('prologue-overlay');
  if (overlay) overlay.classList.add('hidden');
  restoreDangaiConveyor(dangaiMapRef);
  document.removeEventListener('keydown', handlePrologueKeys);
  triggerSenkaimonTransition(onCompleteCb);
}

export function startCinematicTransition() {
  if (isCinematicTransition) return;
  isCinematicTransition = true;
  cinematicClock = 0;
  const overlay = document.getElementById('prologue-overlay');
  if (overlay) overlay.classList.add('hidden');
  document.removeEventListener('keydown', handlePrologueKeys);
  const baseY = rukiaNPC?.userData?.baseY || 0;
  if (sceneRef && !portalMesh) portalMesh = createSenkaimonPortal(sceneRef, baseY);
}

function handleNextClick() {
  if (isTyping) {
    finishInstantTyping();
    return;
  }
  currentStep++;
  if (currentStep >= DIALOGUE_PAGES.length) {
    startCinematicTransition();
  } else {
    renderDialogueStep(currentStep);
  }
}

function handlePrologueKeys(e) {
  if (!prologueActive) return;
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    handleNextClick();
  } else if (e.code === 'KeyP') {
    completePrologue();
  }
}

function bindDialogueButtons() {
  const nextBtn = document.getElementById('btn-briefing-next');
  const skipBtn = document.getElementById('btn-briefing-skip');
  const card = document.getElementById('briefing-box');
  if (nextBtn) nextBtn.onclick = handleNextClick;
  if (skipBtn) skipBtn.onclick = completePrologue;
  if (card) {
    card.onclick = (e) => {
      if (e.target.tagName !== 'BUTTON') handleNextClick();
    };
  }
}

function prepareDangaiConveyor(dangaiMap) {
  if (!dangaiMap?.propGroup) return;
  for (const child of dangaiMap.propGroup.children) {
    if (child.userData.origZ === undefined) child.userData.origZ = child.position.z;
    if (child.userData.origX === undefined) child.userData.origX = child.position.x;
    if (Math.abs(child.position.x) < 2.5) {
      child.position.x = child.position.x >= 0 ? 3.8 : -3.8;
    }
  }
  if (dangaiMap.terrainMesh?.material?.map) {
    dangaiMap.terrainMesh.material.map.offset.set(0, 0);
  }
}

function restoreDangaiConveyor(dangaiMap) {
  if (!dangaiMap?.propGroup) return;
  for (const child of dangaiMap.propGroup.children) {
    if (child.userData.origZ !== undefined) child.position.z = child.userData.origZ;
    if (child.userData.origX !== undefined) child.position.x = child.userData.origX;
  }
  if (dangaiMap.terrainMesh?.material?.map) {
    dangaiMap.terrainMesh.material.map.offset.set(0, 0);
  }
}

function updateConveyor(delta, dangaiMap, runSpeed = 7.5) {
  if (!dangaiMap) return;
  const mapTex = dangaiMap.terrainMesh?.material?.map;
  if (mapTex) {
    mapTex.offset.y = (mapTex.offset.y + runSpeed * 0.267 * delta) % 1.0;
  }
  if (!dangaiMap.propGroup) return;
  for (const child of dangaiMap.propGroup.children) {
    child.position.z += runSpeed * delta;
    if (child.position.z > 16.0) child.position.z -= 65.0;
  }
}

function updateRukiaRunner(mesh, tag, baseY, frame, bob, camera) {
  if (RUKIA_FRAMES[frame] && mesh.material.map !== RUKIA_FRAMES[frame]) {
    mesh.material.map = RUKIA_FRAMES[frame];
    mesh.material.needsUpdate = true;
  }
  mesh.position.y = baseY + bob;
  tag.position.y = baseY + 2.35 + bob;
  mesh.quaternion.copy(camera.quaternion);
  tag.quaternion.copy(camera.quaternion);
}

function updatePlayerRunner(player, playerMesh, baseY, frame, bob, camera, spriteTextures) {
  if (!player || !playerMesh) return;
  player.isMoving = true;
  player.dirX = 0;
  player.dirZ = -1;
  player.animFrame = frame;
  player.x = 0.85;
  player.z = 0;
  player.y = baseY + bob;
  playerMesh.position.set(0.85, player.y, 0);
  playerMesh.quaternion.copy(camera.quaternion);
  const pTex = spriteTextures ? spriteTextures[`player_back_${frame}`] : null;
  if (pTex && playerMesh.material.map !== pTex) {
    playerMesh.material.map = pTex;
    playerMesh.material.needsUpdate = true;
  }
}

export function startPrologue({ scene, loader, dangaiMap, getHeightFn, onComplete }) {
  prologueActive = true;
  currentStep = 0;
  animClock = 0;
  sceneRef = scene;
  onCompleteCb = onComplete;
  dangaiMapRef = dangaiMap;
  prepareDangaiConveyor(dangaiMap);
  rukiaNPC = spawnRukia(scene, loader, getHeightFn);

  setupDialogueDOM();
  bindDialogueButtons();
  renderDialogueStep(0);
  document.addEventListener('keydown', handlePrologueKeys);
}

function updateRukiaCinematic(mesh, shadow, tag, baseY, t, bob, camera) {
  const rZ = 4.5 * t;
  const rX = -0.85 - 0.35 * t;
  mesh.position.set(rX, baseY + bob, rZ);
  shadow.position.set(rX, baseY + 0.03, rZ);
  tag.position.set(rX, baseY + 2.35 + bob, rZ);
  mesh.quaternion.copy(camera.quaternion);
  tag.quaternion.copy(camera.quaternion);
}

function updatePlayerCinematic(player, playerMesh, baseY, t, bob, camera) {
  player.x = 0.85 * (1.0 - t);
  player.z = -8.5 * t;
  player.y = baseY + bob;
  playerMesh.position.set(player.x, player.y, player.z);
  playerMesh.quaternion.copy(camera.quaternion);
}

function updatePortalCinematic(t) {
  if (!portalMesh) return;
  const s = Math.min(1.0, 0.2 + 0.8 * (t / 0.5));
  portalMesh.scale.set(s, s, s);
}

function tickPrologueCinematic(delta, { camera, player, playerMesh, dangaiMap }) {
  cinematicClock += delta;
  const t = Math.min(1.0, cinematicClock / CINEMATIC_DURATION);
  const bobRukia = Math.sin(animClock * 16.0) * 0.035;
  const bobPlayer = Math.sin((animClock + 0.12) * 18.0) * 0.04;
  const { mesh, shadow, tag, baseY } = rukiaNPC.userData;

  updateRukiaCinematic(mesh, shadow, tag, baseY, t, bobRukia, camera);
  updatePlayerCinematic(player, playerMesh, baseY, t, bobPlayer, camera);
  updatePortalCinematic(t);
  camera.position.set(0, baseY + 2.35, 6.2 - 2.5 * t);
  camera.lookAt(0, baseY + 1.25, -12.0);
  updateConveyor(delta, dangaiMap, 11.0);

  if (t >= 1.0) completePrologue();
}

function tickPrologueNormal(delta, { camera, player, playerMesh, dangaiMap, spriteTextures }) {
  const frame = Math.floor(animClock * 10) % 8;
  const bobRukia = Math.sin(animClock * 16.0) * 0.035;
  const bobPlayer = Math.sin((animClock + 0.12) * 16.0) * 0.035;
  const { mesh, tag, baseY } = rukiaNPC.userData;
  updateRukiaRunner(mesh, tag, baseY, frame, bobRukia, camera);
  updatePlayerRunner(player, playerMesh, baseY, frame, bobPlayer, camera, spriteTextures);
  camera.position.set(0, baseY + 2.35, 6.2);
  camera.lookAt(0, baseY + 1.25, -12.0);
  updateConveyor(delta, dangaiMap);
}

export function updatePrologue(delta, ctx) {
  if (!prologueActive || !rukiaNPC) return;
  animClock += delta;
  if (isCinematicTransition) {
    tickPrologueCinematic(delta, ctx);
  } else {
    tickPrologueNormal(delta, ctx);
  }
}

export function cancelPrologue() {
  cleanupPrologueEntities();
  if (typewriterTimer) clearInterval(typewriterTimer);
  const overlay = document.getElementById('prologue-overlay');
  if (overlay) overlay.classList.add('hidden');
  restoreDangaiConveyor(dangaiMapRef);
  document.removeEventListener('keydown', handlePrologueKeys);
}

export function isPrologueActive() {
  return prologueActive;
}

export function isPrologueCinematicTransition() {
  return isCinematicTransition;
}
