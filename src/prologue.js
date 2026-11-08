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
let currentStep = 0;
let typewriterTimer = null;
let rukiaNPC = null;
let sceneRef = null;
let onCompleteCb = null;
let animClock = 0;
let isTyping = false;

function buildRukiaMesh(loader, baseY) {
  const tex = loader.load('/src/assets/characters/rukia/front_0.png');
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide
  });
  const geo = new THREE.PlaneGeometry(2.2, 2.2);
  geo.translate(0, 1.1, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, baseY, -3.2);
  return mesh;
}

function buildRukiaShadow(baseY) {
  const sGeo = new THREE.CircleGeometry(0.7, 16);
  sGeo.rotateX(-Math.PI / 2);
  const sMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 });
  const shadow = new THREE.Mesh(sGeo, sMat);
  shadow.position.set(0, baseY + 0.03, -3.2);
  return shadow;
}

function spawnRukia(scene, loader, getHeightFn) {
  const group = new THREE.Group();
  group.name = 'rukia_npc_group';
  const baseY = getHeightFn ? getHeightFn(0, -3.2) : 0;
  const mesh = buildRukiaMesh(loader, baseY);
  const shadow = buildRukiaShadow(baseY);
  const tag = createPlayerNameTag('Kuchiki Rukia (Tenente)');
  tag.position.set(0, baseY + 2.25, -3.2);

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

function completePrologue() {
  prologueActive = false;
  const overlay = document.getElementById('prologue-overlay');
  if (overlay) overlay.classList.add('hidden');
  if (rukiaNPC && sceneRef) {
    sceneRef.remove(rukiaNPC);
    rukiaNPC = null;
  }
  document.removeEventListener('keydown', handlePrologueKeys);
  triggerSenkaimonTransition(onCompleteCb);
}

function handleNextClick() {
  if (isTyping) {
    finishInstantTyping();
    return;
  }
  currentStep++;
  if (currentStep >= DIALOGUE_PAGES.length) {
    completePrologue();
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

export function startPrologue({ scene, loader, getHeightFn, onComplete }) {
  prologueActive = true;
  currentStep = 0;
  animClock = 0;
  sceneRef = scene;
  onCompleteCb = onComplete;
  rukiaNPC = spawnRukia(scene, loader, getHeightFn);

  setupDialogueDOM();
  bindDialogueButtons();
  renderDialogueStep(0);
  document.addEventListener('keydown', handlePrologueKeys);
}

export function updatePrologue(delta, camera) {
  if (!prologueActive || !rukiaNPC) return;
  animClock += delta;
  const { mesh, tag, baseY } = rukiaNPC.userData;
  const bob = Math.sin(animClock * 3.2) * 0.04;
  mesh.position.y = baseY + bob;
  tag.position.y = baseY + 2.25 + bob;
  mesh.quaternion.copy(camera.quaternion);
  tag.quaternion.copy(camera.quaternion);
}

export function cancelPrologue() {
  prologueActive = false;
  if (typewriterTimer) clearInterval(typewriterTimer);
  const overlay = document.getElementById('prologue-overlay');
  if (overlay) overlay.classList.add('hidden');
  if (rukiaNPC && sceneRef) {
    sceneRef.remove(rukiaNPC);
    rukiaNPC = null;
  }
  document.removeEventListener('keydown', handlePrologueKeys);
}

export function isPrologueActive() {
  return prologueActive;
}
