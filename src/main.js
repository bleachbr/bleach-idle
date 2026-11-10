import * as THREE from 'three';
import { createSpritesheet } from './spritesheet.js';
import { MONSTERS_REGISTRY, FX_REGISTRY } from './characters.js';
import { FXManager } from './fx/fxManager.js';
import { createHuecoMundoMap, getTerrainHeight, MAP_CONFIG, clampPlayerToMap, updateMapPropsBillboard } from './maps/hueco_mundo.js';
import { createDangaiMap } from './maps/dangai.js';
import { createPlayerAnimator, triggerPlayerAction, updatePlayerAnimator, nearestEnemyDirection } from './playerAnimation.js';
import { loadPlayerKit, showPlayerFrame, updatePlayerShadow, playerAnimCatalog } from './playerSprite.js';
import { startPrologue, updatePrologue, isPrologueActive, cancelPrologue } from './prologue.js';
import { computePlayerDisplacement, getSpriteDirection, updateWalkCycle, resetWalkCycle, updatePlayerJump } from './movement.js';
import { initLoginMenu, showLoginMenu, hideLoginMenu, updateMenuCamera } from './menu.js';
import { initVirtualJoystick, getJoystickVector, showVirtualJoystick, hideVirtualJoystick, isTouchDevice } from './joystick.js';
import { initTelemetry, logTelemetry, syncMultiplayerSession } from './telemetry.js';
import { submitMatchScore } from './leaderboard.js';
import { createPlayerNameTag, updatePlayerNameTag } from './nametag.js';
import { updateHUD as renderHUD, showGameOver as displayGameOver } from './hud.js';
import { createCycleState, getCycleMultipliers, shouldSpawnCycleBoss, markBossSpawned, advanceToNextCycle, updateCycleProgress, registerKillInCycle, resetCycleState } from './cycle.js';
import { openLevelUpDialog, closeLevelUpDialog, handleLevelUpKeyInput, selectOptionIndex } from './levelup.js';
import { calculateReiatsuScore, getReiatsuAgroRadius, getReiatsuSpawnBonus, setPlayerCamouflage, updateEnemyWandering } from './reiatsu.js';
import { calculateEffectiveStats, getEffectiveCooldown, applyHierroDamageMitigation, applyWeaponLabels, WEAPON_DEFINITIONS } from './stats.js';
import { arsenalLabels, arsenalSlashTint, arsenalShot, volleyDirections } from './arsenal.js';
import { updateBuildHUD } from './build_hud.js';
import { updatePauseDetails } from './pause_modal.js';
import { stopMusic, playHuecoMundoBGM } from './audio.js';
import { showCharacterInHud } from './characterSelect.js';
// Constantes da Arena e Câmera (Hueco Mundo - Bioma Ativo da Entrega 1)
const ARENA_RADIUS = MAP_CONFIG.arenaRadius || 176.0;
const MAX_ENEMIES = 400;
// Configurações de Câmera estilo PokéBonk
const cameraState = {
  yaw: 0,            // Rotação horizontal em radianos (360° livre)
  pitch: 0.50,       // Inclinação vertical (~28° para o chão)
  dist: 10.0,        // Distância inicial mais próxima do personagem
  target: new THREE.Vector3(0, 1.25, 0)
};
let requestGamePointerLock = () => {};
// Estado do Jogo
export const state = {
  inMenu: true,
  active: false,
  paused: false,
  isAFK: false,
  cycleState: createCycleState(),
  reiatsuScore: 0,
  peakReiatsu: 0,
  levelUpOpen: false,
  gameOver: false,
  playerName: 'Ichigo Kurosaki',
  selectedCharacter: 'ichigo_shikai', // Seleção ativa dos personagens aprovados
  time: 0,
  kills: 0,
  damageDealt: 0,
  level: 1,
  xp: 0,
  xpNext: 20,
  bossSpawned: false,
  bossDefeated: false,
  census: {
    fishbone: 0,
    elite: 0,
    menos: 0
  },
  localPlayerId: 'shinigami_' + Math.random().toString(36).substring(2, 6),
  activeBannerOptions: [],
  weapons: {
    asauchi: { name: 'Corte de Asauchi', level: 1, cooldown: 1.0, timer: 0, damage: 35, totalDamage: 0 },
    getsuga: { name: 'Getsuga Tenshō', level: 1, cooldown: 2.8, timer: 0.8, damage: 180, totalDamage: 0 },
    byakurai: { name: 'Hadō #4 Byakurai', level: 0, cooldown: 2.2, timer: 0, damage: 45, totalDamage: 0 },
    shakkaho: { name: 'Hadō #31 Shakkahō', level: 0, cooldown: 3.5, timer: 0, damage: 70, totalDamage: 0 }
  },
  passives: {
    reiatsu: 0,
    shunpo: 0,
    hierro: 0,
    kaido: 0,
    magnet: 0
  }
};

// Dados do Jogador (Recruta Shinigami / Personagem Selecionado)
export const player = {
  x: 0,
  y: 0,
  z: 0,
  vy: 0,
  isGrounded: true,
  jumpStrength: 8.5,
  gravity: 24.0,
  hp: 100,
  maxHp: 100,
  speed: 6.0,
  dirX: 0,
  dirZ: -1, // Começa olhando para frente (norte), mostrando as costas em terceira pessoa
  invulnerableTime: 0,
  isMoving: false,
  animTimer: 0,
  animFrame: 1, // 0: passo esq, 1: neutro/parado, 2: passo dir, 3: neutro
  walkFps: 8    // Cadência dos passos
};

// Controles de Entrada
const keys = { w: false, a: false, s: false, d: false };
let isDraggingMouse = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Three.js Globais
let scene, camera, renderer, clock;
let playerMesh, playerShadowMesh, playerNameTag, slashMesh, reishiGroup, fxManager;
let activeMap = null, huecoMundoMap = null, dangaiMap = null;
let enemyMeshes = [];
let reishiDrops = [];
let spriteTextures = {};
let playerKit = null;
const playerAnimator = createPlayerAnimator(playerAnimCatalog);
const DEATH_ANIM_SECONDS = 1.6; // A animação de queda inteira (1 s) mais uma pausa antes da tela de fim
let deathTimer = 0;

// Iniciar após DOM carregado
window.addEventListener('DOMContentLoaded', init);

function setupRenderer(canvas) {
  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 480);
  updateCamera();
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function exposeDebugInterface() {
  window.debugGame = {
    scene, camera, cameraState, player, playerMesh, keys, state,
    enemyMeshes, fxManager, jumpPlayer, openLevelUpBanner,
    selectBannerOption: selectOptionIndex, skipLevelUp: finishLevelUp, checkLevelUp, spawnReishi, activeMap, getTerrainHeight,
    getSpriteDirection, computePlayerDisplacement, updateWalkCycle, resetWalkCycle,
    resetMatch, startGame, returnToMenu, showLoginMenu, hideLoginMenu,
    getJoystickVector, showVirtualJoystick, hideVirtualJoystick, spawnHollow, logTelemetry
  };
}

function init() {
  const canvas = document.getElementById('game-canvas');
  scene = new THREE.Scene();
  clock = new THREE.Clock();
  setupRenderer(canvas);
  createArena();
  buildSprites();
  createPlayerMesh();
  createSlashMesh();
  fxManager = new FXManager(scene, spriteTextures);
  reishiGroup = new THREE.Group();
  scene.add(reishiGroup);
  initEnemyPool();
  setupInputListeners(canvas);
  initVirtualJoystick({ cameraState, onJump: jumpPlayer });
  initTelemetry(state.localPlayerId, state.playerName);
  initLoginMenu({ onStartGame: startGame, onReturnToMenu: returnToMenu, onRestartGame: restartGame });
  exposeDebugInterface();
  showLoginMenu();
  requestAnimationFrame(loop);
}

function createArena() {
  const loader = new THREE.TextureLoader();
  huecoMundoMap = createHuecoMundoMap(scene, loader);
  dangaiMap = createDangaiMap(scene, loader);
  scene.remove(dangaiMap.mapGroup);
  activeMap = huecoMundoMap;
}

function switchToDangai() {
  if (huecoMundoMap) scene.remove(huecoMundoMap.mapGroup);
  if (dangaiMap) scene.add(dangaiMap.mapGroup);
  activeMap = dangaiMap;
}

function switchToHuecoMundo() {
  if (dangaiMap) scene.remove(dangaiMap.mapGroup);
  if (huecoMundoMap) scene.add(huecoMundoMap.mapGroup);
  activeMap = huecoMundoMap;
}

function buildSprites() {
  const { canvas, sprites } = createSpritesheet();

  // 1. Carregar texturas procedurais padrão
  for (const [key, sp] of Object.entries(sprites)) {
    const sCanvas = document.createElement('canvas');
    sCanvas.width = sp.w;
    sCanvas.height = sp.h;
    const sCtx = sCanvas.getContext('2d');
    sCtx.imageSmoothingEnabled = false;
    sCtx.drawImage(canvas, sp.x, sp.y, sp.w, sp.h, 0, 0, sp.w, sp.h);

    const tex = new THREE.CanvasTexture(sCanvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    spriteTextures[key] = tex;
  }

  // 2. Kit de animações do personagem escolhido no menu (trocado em startGame)
  playerKit = loadPlayerKit(new THREE.TextureLoader(), state.selectedCharacter);

  // 3. Carregar efeitos visuais (FX) registrados no FX_REGISTRY (Auras, Cortes, Habilidades)
  if (typeof FX_REGISTRY !== 'undefined') {
    const fxLoader = new THREE.TextureLoader();
    for (const [fxId, fxInfo] of Object.entries(FX_REGISTRY)) {
      const fCount = fxInfo.frameCount || 4;
      for (let f = 0; f < fCount; f++) {
        const fPath = `/src/assets/fx/${fxId}/frame_${f}.png`;
        const fTex = fxLoader.load(fPath);
        fTex.magFilter = THREE.LinearFilter;
        fTex.minFilter = THREE.LinearFilter;
        fTex.colorSpace = THREE.SRGBColorSpace;
        spriteTextures[`fx_${fxId}_${f}`] = fTex;
      }
    }
  }

  // 4. Carregar monstros oficiais aprovados (Fishbone D e Menos Grande Gillian)
  loadMonsterTextures(new THREE.TextureLoader());
}

function loadMonsterDirFrames(loader, m, d) {
  const tex = loader.load('/src/assets/monsters/' + m.id + '/' + d + '.png');
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  spriteTextures[m.alias + '_' + d] = tex;
  spriteTextures[m.id + '_' + d] = tex;

  for (let f = 0; f < m.dirCount; f++) {
    const fTex = loader.load('/src/assets/monsters/' + m.id + '/' + d + '_' + f + '.png');
    fTex.magFilter = THREE.NearestFilter;
    fTex.colorSpace = THREE.SRGBColorSpace;
    spriteTextures[m.alias + '_' + d + '_' + f] = fTex;
    spriteTextures[m.id + '_' + d + '_' + f] = fTex;
  }
}

function loadMonsterTextures(loader) {
  const monsters = [
    { id: 'fishbone', alias: 'fishbone', dirCount: 8 },
    { id: 'menos_grande', alias: 'menos', dirCount: 8 }
  ];
  for (const m of monsters) {
    for (const d of ['front', 'side_l', 'side', 'back']) {
      loadMonsterDirFrames(loader, m, d);
    }
    spriteTextures[m.alias] = spriteTextures[m.alias + '_front'];
    spriteTextures[m.id] = spriteTextures[m.alias + '_front'];
  }
}

function attachPlayerShadowAndTag() {
  playerNameTag = createPlayerNameTag(state.playerName, 2.50);
  playerMesh.add(playerNameTag);
  const shadowGeo = new THREE.CircleGeometry(0.78, 16);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.y = 0.02;
  playerShadowMesh = shadow;
  playerMesh.add(shadow);
}

function createPlayerMesh() {
  const pGeo = new THREE.PlaneGeometry(2.35, 2.35);
  pGeo.translate(0, 1.175, 0);
  const pMat = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  playerMesh = new THREE.Mesh(pGeo, pMat);
  playerMesh.position.set(0, 0, 0);
  scene.add(playerMesh);
  attachPlayerShadowAndTag();
}

function createSlashMesh() {
  // Arco de corte animado (4 quadros de efeito de combate)
  const slashGeo = new THREE.PlaneGeometry(3.2, 3.2);
  slashGeo.rotateX(-Math.PI / 2);
  const slashMat = new THREE.MeshBasicMaterial({
    map: spriteTextures.fx_slash_combat_0 || null,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0,
    side: THREE.DoubleSide
  });
  slashMesh = new THREE.Mesh(slashGeo, slashMat);
  slashMesh.position.y = 0.45;
  scene.add(slashMesh);
}

function initEnemyPool() {
  const baseGeo = new THREE.PlaneGeometry(2.2, 2.2);
  baseGeo.translate(0, 1.1, 0);

  for (let i = 0; i < MAX_ENEMIES; i++) {
    const mat = new THREE.MeshBasicMaterial({
      map: spriteTextures.fishbone_front,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(baseGeo.clone(), mat);
    mesh.visible = false;
    mesh.position.set(0, -999, 0);

    const sGeo = new THREE.CircleGeometry(0.6, 16);
    sGeo.rotateX(-Math.PI / 2);
    const sMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });
    const sMesh = new THREE.Mesh(sGeo, sMat);
    sMesh.position.y = 0.02;
    mesh.add(sMesh);

    scene.add(mesh);

    enemyMeshes.push({
      id: i,
      mesh,
      active: false,
      x: 0,
      z: 0,
      dirX: 0,
      dirZ: 1,
      hp: 40,
      maxHp: 40,
      speed: 3.2,
      type: 'fishbone',
      isBoss: false,
      flashTimer: 0,
      damageContributions: {} // Rastreamento de dano multiplayer por jogador
    });
  }
}

// =======================================================================
// CONTROLES DE ENTRADA: TECLADO + ROTAÇÃO DO MOUSE (POINTER LOCK E DRAG)
// =======================================================================
function handleMovementKeys(k, down) {
  if (k === 'w' || k === 'arrowup') keys.w = down;
  if (k === 'a' || k === 'arrowleft') keys.a = down;
  if (k === 's' || k === 'arrowdown') keys.s = down;
  if (k === 'd' || k === 'arrowright') keys.d = down;
}

function handleLevelUpKeys(k) {
  return handleLevelUpKeyInput(k);
}

function pauseGame(canvas) {
  state.paused = true;
  state.isAFK = true;
  setPlayerCamouflage(player, playerMesh, true);
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  updatePauseDetails(player, state);
  document.getElementById('pause-modal')?.classList.remove('hidden');
}

function pauseOnFocusLoss(canvas) {
  keys.w = keys.a = keys.s = keys.d = false;
  if (state.active && !state.gameOver && !state.paused) pauseGame(canvas);
}

function resumeGame(canvas) {
  if (state.inMenu) return;
  state.paused = false;
  state.isAFK = false;
  setPlayerCamouflage(player, playerMesh, false);
  document.getElementById('pause-modal')?.classList.add('hidden');
  if (!isTouchDevice() && state.active && !state.levelUpOpen && !state.gameOver && document.pointerLockElement !== canvas) {
    canvas.requestPointerLock().catch(() => {});
  }
}

function handleEscapeKey(canvas) {
  if (isPrologueActive() || state.gameOver) return;
  if (state.levelUpOpen) { finishLevelUp(); return; }
  if (!state.paused) { pauseGame(canvas); } else { resumeGame(canvas); }
}

function setupKeyboardListeners(canvas) {
  window.addEventListener('keydown', (e) => {
    if (state.inMenu) return;
    const k = e.key.toLowerCase();
    handleMovementKeys(k, true);
    if (e.code === 'Space' || k === ' ') { e.preventDefault(); if (!isPrologueActive()) jumpPlayer(); }
    if (handleLevelUpKeys(k)) return;
    if (k === 'q') cameraState.yaw -= 0.15;
    if (k === 'e') cameraState.yaw += 0.15;
    if (k === 'escape') handleEscapeKey(canvas);
  });
  window.addEventListener('keyup', (e) => {
    if (!state.inMenu) handleMovementKeys(e.key.toLowerCase(), false);
  });
}

function setupPointerLockListeners(canvas) {
  window.addEventListener('blur', () => pauseOnFocusLoss(canvas));
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseOnFocusLoss(canvas); });
  canvas.addEventListener('click', () => { if (!state.inMenu && !state.levelUpOpen && !state.gameOver && !isPrologueActive()) resumeGame(canvas); });
  document.getElementById('pause-modal')?.addEventListener('click', () => { if (!state.gameOver) resumeGame(canvas); });
  document.addEventListener('pointerlockchange', () => {
    if (isTouchDevice() || isPrologueActive()) return; const isLocked = (document.pointerLockElement === canvas);
    if (!isLocked) {
      if (!state.inMenu && state.active && !state.levelUpOpen && !state.gameOver) pauseGame(canvas);
    } else if (!state.inMenu) {
      state.paused = false;
      document.getElementById('pause-modal')?.classList.add('hidden');
    }
  });
  const resumeBtn = document.getElementById('btn-resume');
  if (resumeBtn) resumeBtn.onclick = (e) => { e.stopPropagation(); resumeGame(canvas); };
}

function setupMouseLook(canvas) {
  window.addEventListener('mousemove', (e) => {
    if (isPrologueActive()) return;
    if (document.pointerLockElement === canvas) {
      cameraState.yaw -= e.movementX * 0.0035;
      cameraState.pitch = Math.max(0.15, Math.min(1.15, cameraState.pitch + e.movementY * 0.0035));
      return;
    }
    if (isDraggingMouse) {
      const dx = e.clientX - lastMouseX, dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX; lastMouseY = e.clientY;
      cameraState.yaw -= dx * 0.006;
      cameraState.pitch = Math.max(0.15, Math.min(1.15, cameraState.pitch + dy * 0.006));
    }
  });
  canvas.addEventListener('mousedown', (e) => { isDraggingMouse = true; lastMouseX = e.clientX; lastMouseY = e.clientY; });
  window.addEventListener('mouseup', () => { isDraggingMouse = false; });
  window.addEventListener('wheel', (e) => {
    cameraState.dist = Math.max(8.0, Math.min(14.0, cameraState.dist + Math.sign(e.deltaY) * 0.8));
  }, { passive: true });
}

function setupInputListeners(canvas) {
  setupKeyboardListeners(canvas);
  setupPointerLockListeners(canvas);
  setupMouseLook(canvas);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Atualização da Câmera baseada no Yaw (360° livre) e Pitch
function updateCamera() {
  const h = Math.cos(cameraState.pitch);
  const g = Math.sin(cameraState.pitch);
  const dist = cameraState.dist;

  const camX = player.x + Math.sin(cameraState.yaw) * h * dist;
  const camY = player.y + g * dist + 0.8;
  const camZ = player.z + Math.cos(cameraState.yaw) * h * dist;

  camera.position.set(camX, camY, camZ);
  camera.lookAt(player.x, 1.25, player.z);
}

// =======================================================================
// CÁLCULO DE PERSPECTIVA DO SPRITE: 4 DIREÇÕES (FRENTE, COSTAS, LADOS)
// Matemática idêntica ao PokéBonk: dirRow()
// =======================================================================
// Determina qual quadrante angular o vetor de visão/deslocamento da entidade
// ocupa em relação à câmera atual.


// =======================================================================
// LOOP PRINCIPAL DE JOGO (60 FPS)
// =======================================================================
let slashAlpha = 0;
let spawnTimer = 0;

function renderMenuBackground(dt) {
  updateMenuCamera(cameraState, dt);
  updateCamera();
  updatePlayerSprite(dt);
  updateBillboards();
  renderer.render(scene, camera);
}

function updateCombatLoop(dt) {
  state.time += dt;
  updateWeapons(dt);
  if (fxManager) {
    fxManager.updateAura(dt, player.x, player.z, camera.quaternion);
    fxManager.updateProjectiles(dt, enemyMeshes, (en, dmg, type) => {
      damageEnemy(en, dmg, type);
    }, camera.quaternion);
  }
  updateSpawns(dt);
  updateEnemies(dt);
  updateReishi(dt);
}

function updateGame(dt) {
  if (isPrologueActive()) {
    updatePrologue(dt, { camera, player, playerMesh, dangaiMap: activeMap, showRunFrame });
    renderer.render(scene, camera);
    return;
  }
  if (deathTimer > 0) {
    tickPlayerDeath(dt);
    return;
  }
  if (!state.isAFK) {
    updatePlayer(dt);
    updateCombatLoop(dt);
  }
  updateEnemies(dt);
  updateCamera();
  updatePlayerSprite(dt);
  updateBillboards();
  renderer.render(scene, camera);
  updateHUD();
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.1);
  if (state.inMenu) {
    renderMenuBackground(dt);
    return;
  }
  if (!state.active) return;
  updateGame(dt);
}

// =======================================================================
// MOVIMENTAÇÃO DO JOGADOR RELATIVA AO ÂNGULO DA CÂMERA
// =======================================================================
// Quando o jogador gira a câmera (seja 90°, 180° ou qualquer ângulo),
// o controle de movimentação com o teclado precisa acompanhar a visão:
// - Pressionar 'W' ou '↑': O personagem SEMPRE avança para o fundo da tela.
// - Pressionar 'S' ou '↓': O personagem SEMPRE recua em direção à tela.
// - Pressionar 'D' ou '→': O personagem SEMPRE anda para a direita da tela.
// - Pressionar 'A' ou '←': O personagem SEMPRE anda para a esquerda da tela.
function applyPlayerMovement(player, dir, dt) {
  player.dirX = dir.dx;
  player.dirZ = dir.dz;
  const speed = player.speed * (1 + (state.passives?.shunpo || 0) * 0.12);
  player.x += dir.dx * speed * dt;
  player.z += dir.dz * speed * dt;
  clampPlayerToMap(player, activeMap?.colliders, ARENA_RADIUS);
  player.isMoving = true;
}

function updatePlayerTimers(player, dt) {
  if (player.invulnerableTime > 0) player.invulnerableTime -= dt;
  if (player.katanaCooldown > 0) player.katanaCooldown -= dt;
  if (state.passives?.kaido > 0 && player.hp < player.maxHp) {
    const regen = Math.min(state.passives.kaido * 1.5, player.maxHp * 0.04);
    player.hp = Math.min(player.maxHp, player.hp + regen * dt);
  }
}

function updatePlayer(dt) {
  const dir = computePlayerDisplacement(keys, cameraState.yaw, getJoystickVector());
  if (dir) {
    applyPlayerMovement(player, dir, dt);
  } else {
    resetWalkCycle(player);
  }

  const terrainY = getTerrainHeight ? getTerrainHeight(player.x, player.z) : 0;
  updatePlayerJump(player, terrainY, dt);
  playerMesh.position.set(player.x, player.y, player.z);
  updatePlayerShadow(playerShadowMesh, player.y, terrainY);
  updatePlayerTimers(player, dt);
}

function jumpPlayer() {
  if (player.isGrounded && state.active && !state.paused) {
    player.vy = player.jumpStrength;
    player.isGrounded = false;
  }
}

function updateEnemyBillboard(en, walkFrame) {
  en.mesh.quaternion.copy(camera.quaternion);
  const eDir = getSpriteDirection(en.dirX, en.dirZ, cameraState.yaw);
  const baseType = en.type === 'elite' ? 'fishbone' : en.type;
  const frameKey = baseType + '_' + eDir + '_' + walkFrame;
  const texKey = baseType + '_' + eDir;
  const eTex = spriteTextures[frameKey] || spriteTextures[texKey] || spriteTextures[baseType + '_front'];
  if (eTex && en.mesh.material.map !== eTex) {
    en.mesh.material.map = eTex;
    en.mesh.material.needsUpdate = true;
  }
}

function updatePlayerSprite(dt) {
  const clip = updatePlayerAnimator(playerAnimator, dt, {
    isGrounded: player.isGrounded,
    isMoving: player.isMoving,
    isAFK: state.isAFK,
    running: (state.passives?.shunpo || 0) > 0,
    vy: player.vy,
    jumpStrength: player.jumpStrength
  });
  const face = (!player.isMoving && playerAnimator.faceDir) || { dirX: player.dirX, dirZ: player.dirZ };
  showPlayerFrame(playerMesh, playerKit, clip, getSpriteDirection(face.dirX, face.dirZ, cameraState.yaw));
}

function showRunFrame(frame) {
  showPlayerFrame(playerMesh, playerKit, { anim: 'run', frame }, 'back');
}

function updateBillboards() {
  playerMesh.quaternion.copy(camera.quaternion);
  const enemyWalkFrame = Math.floor(state.time * 8) % 8;
  for (const en of enemyMeshes) {
    if (en.active) updateEnemyBillboard(en, enemyWalkFrame);
  }

  updateMapPropsBillboard(activeMap?.propGroup, camera);
}

function updateSlashVisual(dt) {
  if (slashAlpha <= 0) return;
  slashAlpha -= dt * 4.0;
  const progress = Math.max(0, Math.min(1.0, 1.0 - (slashAlpha / 0.8)));
  const frame = Math.min(3, Math.floor(progress * 4));
  const slashTex = spriteTextures[`fx_slash_combat_${frame}`];
  if (slashTex && slashMesh.material.map !== slashTex) {
    slashMesh.material.map = slashTex;
    slashMesh.material.needsUpdate = true;
  }
  slashMesh.material.opacity = Math.max(0, slashAlpha);
}

function tickWeapon(w, dt, cd, action, onFire) {
  if (!w || w.level <= 0) return;
  w.timer -= dt;
  if (w.timer <= 0) {
    w.timer = cd;
    triggerPlayerAction(playerAnimator, action, nearestEnemyDirection(enemyMeshes, player.x, player.z));
    onFire();
  }
}

function updateWeapons(dt) {
  const stats = calculateEffectiveStats(player, state.passives);
  const w = state.weapons;
  const asauchiCd = getEffectiveCooldown(1.0 - (w.asauchi.level - 1) * 0.05, stats.haste);
  tickWeapon(w.asauchi, dt, asauchiCd, 'slash', () => executeAsauchiSlash((35 + (w.asauchi.level - 1) * 15) * stats.atkMult));
  const getsugaCd = getEffectiveCooldown(2.8 - (w.getsuga.level - 1) * 0.15, stats.haste);
  tickWeapon(w.getsuga, dt, getsugaCd, 'getsuga', () => executeGetsugaTensho((180 + (w.getsuga.level - 1) * 45) * stats.atkMult));
  updateSlashVisual(dt);
  const byakuraiCd = getEffectiveCooldown(2.2 - (w.byakurai.level - 1) * 0.12, stats.haste);
  tickWeapon(w.byakurai, dt, byakuraiCd, 'byakurai', () => executeByakurai((45 + (w.byakurai.level - 1) * 20) * stats.atkMult));
  const shakkahoCd = getEffectiveCooldown(3.5 - (w.shakkaho.level - 1) * 0.18, stats.haste);
  tickWeapon(w.shakkaho, dt, shakkahoCd, 'shakkaho', () => executeShakkaho((70 + (w.shakkaho.level - 1) * 25) * stats.atkMult));
}

// =======================================================================
// MIRA INTELIGENTE DE AUTO-ATAQUE (ESTILO POKÉBONK / SURVIVOR)
// =======================================================================
// O jogador foca em esquivar e se posicionar no mapa.
// As habilidades avaliam a geometria da arena e disparam nos melhores alvos:
// - Getsuga Tenshō: Avalia qual feixe direcional perfurará o maior número de Hollows
// - Asauchi Slash: Corta na direção da ameaça mais próxima no corpo a corpo
function findSmartTargetDirection(playerX, playerZ, maxRange = 32.0, beamRadius = 2.4) {
  const candidates = [];
  for (const en of enemyMeshes) {
    if (!en.active) continue;
    const dx = en.x - playerX;
    const dz = en.z - playerZ;
    const dist = Math.hypot(dx, dz);
    if (dist <= maxRange && dist > 0.1) {
      candidates.push({
        en,
        dist,
        dirX: dx / dist,
        dirZ: dz / dist,
        isBoss: en.isBoss
      });
    }
  }

  // Se não houver nenhum Hollow no campo de visão, dispara na direção que o jogador caminha
  if (candidates.length === 0) {
    return { dirX: player.dirX, dirZ: player.dirZ, targetCount: 0 };
  }

  // Prioridade 1: Boss Menos Grande (alvo prioritário absoluto se estiver em campo)
  const boss = candidates.find(c => c.isBoss);
  if (boss && boss.dist <= maxRange) {
    return { dirX: boss.dirX, dirZ: boss.dirZ, targetCount: 1, target: boss.en };
  }

  // Prioridade 2: Maior aglomeração em linha (densest pierce line)
  let bestDir = { dirX: candidates[0].dirX, dirZ: candidates[0].dirZ, score: -1, target: candidates[0].en };

  for (const primary of candidates) {
    let alignedCount = 0;
    for (const other of candidates) {
      const ox = other.en.x - playerX;
      const oz = other.en.z - playerZ;
      const dot = ox * primary.dirX + oz * primary.dirZ;

      if (dot > 0 && dot <= maxRange) {
        const perpDist = Math.abs(ox * (-primary.dirZ) + oz * primary.dirX);
        if (perpDist <= beamRadius) {
          alignedCount++;
        }
      }
    }

    const score = alignedCount * 150 - primary.dist;
    if (score > bestDir.score) {
      bestDir = {
        dirX: primary.dirX,
        dirZ: primary.dirZ,
        score,
        targetCount: alignedCount,
        target: primary.en
      };
    }
  }

  return bestDir;
}

function executeGetsugaTensho(dmg) {
  if (!fxManager) return;
  // Mira inteligente: Encontra a direção com maior densidade de Hollows ou boss
  const target = findSmartTargetDirection(player.x, player.z, 32.0, 2.4);

  fireSkill('getsuga', target, dmg);
}

// Uma salva do arsenal do personagem: um projétil ou vários (leque, fileira).
function fireSkill(key, target, dmg) {
  const shot = arsenalShot(state.selectedCharacter, key);
  for (const v of volleyDirections(target.dirX, target.dirZ, shot)) {
    fxManager.spawnSkillProjectile(shot.fx, key, player.x + v.offX, player.z + v.offZ, v.x, v.z, dmg * shot.damageScale, shot);
  }
}

function executeAsauchiSlash(dmg) {
  slashAlpha = 0.8;

  // Auto-mira melee: corta em direção ao Hollow mais próximo a até 5.5m
  let targetDirX = player.dirX;
  let targetDirZ = player.dirZ;
  let closestDist = 5.5;

  for (const en of enemyMeshes) {
    if (!en.active) continue;
    const d = Math.hypot(en.x - player.x, en.z - player.z);
    if (d < closestDist) {
      closestDist = d;
      targetDirX = (en.x - player.x) / d;
      targetDirZ = (en.z - player.z) / d;
    }
  }

  const pAngle = Math.atan2(targetDirZ, targetDirX);
  slashMesh.position.set(player.x + targetDirX * 1.2, 0.45, player.z + targetDirZ * 1.2);
  slashMesh.rotation.y = -pAngle;
  const slashTex = spriteTextures['fx_slash_combat_0'];
  if (slashTex) {
    slashMesh.material.map = slashTex;
    slashMesh.material.needsUpdate = true;
  }

  const range = 4.8;
  const arc = Math.PI * 0.8;

  for (const en of enemyMeshes) {
    if (!en.active) continue;
    const dx = en.x - player.x;
    const dz = en.z - player.z;
    const dist = Math.hypot(dx, dz);

    if (dist <= range) {
      const angleToEnemy = Math.atan2(dz, dx);
      let diff = Math.abs(angleToEnemy - pAngle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;

      if (diff <= arc / 2) {
        damageEnemy(en, dmg, 'asauchi');
      }
    }
  }
}

function executeByakurai(dmg) {
  if (!fxManager) return;
  let target = null, minDist = 999;
  for (const en of enemyMeshes) {
    if (!en.active) continue;
    const d = Math.hypot(en.x - player.x, en.z - player.z);
    if (d < minDist) { minDist = d; target = en; }
  }
  if (!target) return;
  const tx = target.x - player.x, tz = target.z - player.z;
  const len = Math.hypot(tx, tz) || 1;
  fireSkill('byakurai', { dirX: tx / len, dirZ: tz / len }, dmg);
}

function executeShakkaho(dmg) {
  if (!fxManager) return;
  const target = findSmartTargetDirection(player.x, player.z, 25.0, 2.8);
  fireSkill('shakkaho', target, dmg);
}

function damageEnemy(en, dmg, weaponKey, attackerId = state.localPlayerId) {
  en.hp -= dmg;
  en.flashTimer = 0.12;
  en.mesh.material.color.setHex(0xffffff);

  // Registro de dano multiplayer (quem mais causar dano ganha a bolinha de Reishi)
  if (!en.damageContributions) en.damageContributions = {};
  en.damageContributions[attackerId] = (en.damageContributions[attackerId] || 0) + dmg;

  state.damageDealt += dmg;
  const key = weaponKey === 'getsuga_tenshou' ? 'getsuga' : weaponKey;
  if (state.weapons[key]) {
    state.weapons[key].totalDamage += dmg;
  }

  if (en.hp <= 0) {
    killEnemy(en);
  }
}

function getTopDamagePlayer(contribs, fallbackId) {
  let maxDmg = -1, topId = fallbackId;
  for (const [pid, d] of Object.entries(contribs || {})) {
    if (d > maxDmg) { maxDmg = d; topId = pid; }
  }
  return topId;
}

function killEnemy(en) {
  en.active = false;
  en.mesh.visible = false;
  en.mesh.position.set(0, -999, 0);
  state.kills++;
  registerKillInCycle(state.cycleState);
  state.census[en.type] = (state.census[en.type] || 0) + 1;

  const topPlayerId = getTopDamagePlayer(en.damageContributions, state.localPlayerId);
  const dropAmount = en.isBoss ? 26 : (en.isElite ? 6 : 1);
  spawnReishi(en.x, en.z, dropAmount, topPlayerId);

  if (en.isBoss) {
    document.getElementById('boss-bar-container')?.classList.add('hidden');
    advanceToNextCycle(state.cycleState, en.x, en.z, spawnReishi);
    triggerPlayerAction(playerAnimator, 'victory');
  }
}

function spawnReishi(x, z, amount, ownerPlayerId = state.localPlayerId) {
  const geo = new THREE.PlaneGeometry(0.8, 0.8);
  geo.translate(0, 0.4, 0);
  const mat = new THREE.MeshBasicMaterial({
    map: spriteTextures.reishi,
    transparent: true,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0, z);
  reishiGroup.add(mesh);

  reishiDrops.push({ mesh, x, z, value: amount * 10, ownerPlayerId });
}

function updateReishi(dt) {
  const magnetRadius = 3.5 + (state.passives.magnet || 0) * 2.5;

  for (let i = reishiDrops.length - 1; i >= 0; i--) {
    const r = reishiDrops[i];
    r.mesh.quaternion.copy(camera.quaternion);

    // No multiplayer, a partícula só é atraída para o jogador que causou mais dano
    if (r.ownerPlayerId && r.ownerPlayerId !== state.localPlayerId) {
      continue;
    }

    const dx = player.x - r.x;
    const dz = player.z - r.z;
    const dist = Math.hypot(dx, dz);

    if (dist < magnetRadius) {
      r.x += (dx / dist) * 12 * dt;
      r.z += (dz / dist) * 12 * dt;
      r.mesh.position.set(r.x, 0, r.z);

      if (dist < 0.8) {
        state.xp += r.value;
        reishiGroup.remove(r.mesh);
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
        reishiDrops.splice(i, 1);
        checkLevelUp();
      }
    }
  }
}

function checkLevelUp() {
  if (state.xp >= state.xpNext) {
    state.xp -= state.xpNext;
    state.level++;
    state.xpNext = Math.round(state.xpNext * 1.4);
    if (!state.levelUpOpen) {
      openLevelUpBanner();
    } else {
      state.pendingLevelUps = (state.pendingLevelUps || 0) + 1;
    }
  }
}

// =======================================================================
// BANNER FLUTUANTE DE LEVEL UP (NÃO CONGELA O JOGO)
// Atalhos [1], [2], [3] ou Pular [0 / P]
// A nova escolha SOBRESCREVE o poder anterior (mecânica de substituição)
// =======================================================================
function applyWeaponChoice(key) {
  if (state.weapons[key]) {
    state.weapons[key].level = Math.min(5, (state.weapons[key].level || 0) + 1);
    state.weapons[key].timer = 0;
  }
}

function applyPassiveChoice(key) {
  state.passives[key] = Math.min(5, (state.passives[key] || 0) + 1);
}

function applyPowerSelection(opt) {
  if (opt.type === 'weapon') applyWeaponChoice(opt.key);
  if (opt.type === 'passive') applyPassiveChoice(opt.key);
  updateBuildHUD(state.weapons, state.passives);
  finishLevelUp();
}

function openLevelUpBanner() {
  state.levelUpOpen = true;
  openLevelUpDialog({
    weaponsState: state.weapons,
    passivesState: state.passives,
    onSelect: (_idx, opt) => applyPowerSelection(opt),
    onSkip: () => finishLevelUp()
  });
}

function finishLevelUp() {
  closeLevelUpDialog();
  triggerPlayerAction(playerAnimator, 'level_up');
  state.levelUpOpen = false;
  if (state.pendingLevelUps && state.pendingLevelUps > 0) {
    state.pendingLevelUps--;
    setTimeout(() => {
      if (state.active && !state.gameOver) openLevelUpBanner();
    }, 120);
  }
}

let eliteSpawnTimer = 35.0;

// Spawns
function updateHollowTimers(dt) {
  eliteSpawnTimer -= dt;
  if (eliteSpawnTimer <= 0) {
    eliteSpawnTimer = 35.0;
    spawnHollow(true);
  }
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnTimer = Math.max(0.3, 1.0 - (state.time / 180) * 0.7);
    const count = 1 + Math.floor(state.time / 30) + getReiatsuSpawnBonus(state.reiatsuScore);
    for (let i = 0; i < count; i++) spawnHollow(false);
  }
}

function updateSpawns(dt) {
  if (state.isAFK) return;
  updateCycleProgress(state.cycleState, state.time, state.kills);
  state.reiatsuScore = calculateReiatsuScore(player, state);
  if (state.reiatsuScore > state.peakReiatsu) state.peakReiatsu = state.reiatsuScore;
  if (shouldSpawnCycleBoss(state.cycleState)) {
    spawnBossMenosGrande();
    markBossSpawned(state.cycleState);
    return;
  }
  updateHollowTimers(dt);
}

function setupHollowMesh(en) {
  const s = en.isElite ? 2.2 : 1.4;
  en.mesh.scale.set(s, s, s);
  en.mesh.material.map = spriteTextures.fishbone_front || spriteTextures.fishbone;
  en.mesh.material.color.setHex(en.isElite ? 0xff3355 : 0xffffff);
  const spawnY = getTerrainHeight ? getTerrainHeight(en.x, en.z) : 0;
  en.mesh.position.set(en.x, spawnY, en.z);
  en.mesh.visible = true;
}

function spawnHollow(isElite = false) {
  const en = enemyMeshes.find(e => !e.active);
  if (!en) return;

  const mult = getCycleMultipliers(state.cycleState);
  const angle = Math.random() * Math.PI * 2;
  const dist = 16.0 + Math.random() * 8.0;
  en.x = player.x + Math.cos(angle) * dist;
  en.z = player.z + Math.sin(angle) * dist;
  en.active = true;
  en.type = isElite ? 'elite' : 'fishbone';
  en.isElite = isElite;
  en.hp = Math.round((isElite ? 200 : 45) * mult.hpMult);
  en.maxHp = en.hp;
  en.speed = (isElite ? 3.4 : 3.2) * mult.speedMult;
  en.isBoss = false;
  en.targetPlayerId = null;
  en.damageContributions = {};
  setupHollowMesh(en);
}

function setupBossMesh(en) {
  en.mesh.scale.set(3.8, 3.8, 3.8);
  en.mesh.material.map = spriteTextures.menos_front || spriteTextures.menos;
  en.mesh.material.color.setHex(0xffffff);
  en.mesh.position.set(en.x, getTerrainHeight(en.x, en.z), en.z);
  en.mesh.visible = true;
}

function spawnBossMenosGrande(targetPlayerId = state.localPlayerId) {
  const en = enemyMeshes.find(e => !e.active);
  if (!en) return;

  const mult = getCycleMultipliers(state.cycleState);
  const angle = Math.random() * Math.PI * 2;
  en.x = Math.cos(angle) * 30.0;
  en.z = Math.sin(angle) * 30.0;

  en.active = true;
  en.type = 'menos';
  en.hp = Math.round(2000 * mult.bossHpMult);
  en.maxHp = en.hp;
  en.speed = 2.0 * mult.speedMult;
  en.isBoss = true;
  en.targetPlayerId = targetPlayerId;
  en.damageContributions = {};
  setupBossMesh(en);
  logTelemetry('WARN', 'BOSS_SPAWNED', `Gillian surgiu no Ciclo ${state.cycleState.currentCycle}`, { cycle: state.cycleState.currentCycle });
  document.getElementById('boss-bar-container').classList.remove('hidden');
}

function applyContactDamage(en, dist) {
  if (dist >= 1.1 || player.y >= 0.9 || player.invulnerableTime > 0) return;
  const rawDmg = en.isBoss ? 35 : (en.isElite ? 22 : 12);
  const hierroPts = (state.passives.hierro || 0) * 25;
  player.hp -= applyHierroDamageMitigation(rawDmg, hierroPts);
  player.invulnerableTime = 0.6;
  triggerPlayerAction(playerAnimator, en.isBoss ? 'hurt_heavy' : 'hurt');
  if (player.hp <= 0) {
    player.hp = 0;
    triggerPlayerAction(playerAnimator, 'death');
    deathTimer = DEATH_ANIM_SECONDS;
  }
}

function tickPlayerDeath(dt) {
  deathTimer -= dt;
  updatePlayerJump(player, getTerrainHeight(player.x, player.z), dt);
  playerMesh.position.y = player.y;
  updateCamera();
  updatePlayerSprite(dt);
  updateBillboards();
  renderer.render(scene, camera);
  if (deathTimer <= 0) showGameOver(false);
}

function moveEnemyTowardsPlayer(en, dx, dz, dist, dt) {
  en.dirX = dx / dist;
  en.dirZ = dz / dist;
  en.x += en.dirX * en.speed * dt;
  en.z += en.dirZ * en.speed * dt;
  en.mesh.position.set(en.x, getTerrainHeight(en.x, en.z), en.z);
}

function tickEnemyBehavior(en, dt) {
  const dx = player.x - en.x;
  const dz = player.z - en.z;
  const dist = Math.hypot(dx, dz);
  const agroRadius = getReiatsuAgroRadius(state.reiatsuScore);

  if (state.isAFK || dist > agroRadius) {
    updateEnemyWandering(en, dt);
  } else {
    if (dist > 0.6) moveEnemyTowardsPlayer(en, dx, dz, dist, dt);
    applyContactDamage(en, dist);
  }
  if (en.flashTimer > 0) {
    en.flashTimer -= dt;
    if (en.flashTimer <= 0) en.mesh.material.color.setHex(en.isElite ? 0xff3355 : 0xffffff);
  }
}

function updateEnemies(dt) {
  for (const en of enemyMeshes) {
    if (en.active) tickEnemyBehavior(en, dt);
  }
}

function updateHUD() {
  renderHUD(player, state, enemyMeshes);
  updateBuildHUD(state.weapons, state.passives);
}

function showGameOver(victory) {
  displayGameOver(victory, state, submitMatchScore, hideVirtualJoystick);
}

function resetPlayerState() {
  player.x = 0;
  player.y = 0;
  player.z = 0;
  player.vy = 0;
  player.isGrounded = true;
  player.hp = player.maxHp;
  player.invulnerableTime = 0;
  deathTimer = 0;
  Object.assign(playerAnimator, createPlayerAnimator(playerAnimCatalog));
  player.animTimer = 0;
  player.animFrame = 1;
  player.isMoving = false;
  player.dirX = 0;
  player.dirZ = -1;
  cameraState.yaw = 0;
  cameraState.pitch = 0.5;
  cameraState.dist = 13.0;
}

function resetWeaponsAndPassives() {
  state.weapons.asauchi = { name: WEAPON_DEFINITIONS.asauchi.name, level: 1, cooldown: 1.0, timer: 0, damage: 35, totalDamage: 0 };
  state.weapons.getsuga = { name: WEAPON_DEFINITIONS.getsuga.name, level: 1, cooldown: 2.8, timer: 0.8, damage: 180, totalDamage: 0 };
  state.weapons.byakurai = { name: WEAPON_DEFINITIONS.byakurai.name, level: 0, cooldown: 2.2, timer: 0, damage: 45, totalDamage: 0 };
  state.weapons.shakkaho = { name: WEAPON_DEFINITIONS.shakkaho.name, level: 0, cooldown: 3.5, timer: 0, damage: 70, totalDamage: 0 };
  state.passives.reiatsu = 0;
  state.passives.shunpo = 0;
  state.passives.hierro = 0;
  state.passives.kaido = 0;
  state.passives.magnet = 0;
  updateBuildHUD(state.weapons, state.passives);
}

function clearActiveEntities() {
  for (const en of enemyMeshes) {
    en.active = false;
    en.mesh.visible = false;
  }
  for (const drop of reishiDrops) {
    drop.active = false;
    drop.mesh.visible = false;
  }
  if (fxManager) {
    for (const proj of fxManager.projectiles) {
      proj.active = false;
      proj.mesh.visible = false;
    }
  }
}

function resetMatchStats() {
  state.time = 0;
  state.kills = 0;
  state.damageDealt = 0;
  state.level = 1;
  state.xp = 0;
  state.xpNext = 20;
  state.bossSpawned = false;
  state.bossDefeated = false;
  state.gameOver = false;
  state.paused = false;
  state.isAFK = false;
  state.reiatsuScore = 0;
  state.peakReiatsu = 0;
  resetCycleState(state.cycleState);
  state.levelUpOpen = false;
  state.census = { fishbone: 0, elite: 0, menos: 0 };
}

function resetMatch() {
  resetMatchStats();
  eliteSpawnTimer = 35.0;
  setPlayerCamouflage(player, false);
  resetPlayerState();
  resetWeaponsAndPassives();
  clearActiveEntities();
  updateHUD();
}

function launchGameSession() {
  state.inMenu = false; state.active = true;
  cameraState.dist = 10.0;
  hideLoginMenu();
  showVirtualJoystick();
}

function onPrologueCompleted() {
  switchToHuecoMundo();
  playHuecoMundoBGM();
  player.x = 0; player.z = 0; player.isMoving = false;
  state.paused = false;
  document.getElementById('pause-modal')?.classList.add('hidden');
}

function selectCharacter(charId) {
  if (charId) state.selectedCharacter = charId;
  playerKit = loadPlayerKit(new THREE.TextureLoader(), state.selectedCharacter);
  showCharacterInHud(state.selectedCharacter);
  applyWeaponLabels(arsenalLabels(state.selectedCharacter));
  slashMesh.material.color.setHex(arsenalSlashTint(state.selectedCharacter));
}

function startGame(name, charId) {
  stopMusic();
  selectCharacter(charId);
  if (name) state.playerName = name;
  updatePlayerNameTag(playerNameTag, state.playerName);
  const nameEl = document.getElementById('player-name-display');
  if (nameEl) nameEl.textContent = state.playerName;
  resetMatch();
  launchGameSession();
  switchToDangai();
  player.x = 0; player.z = 0;
  startPrologue({
    scene, loader: new THREE.TextureLoader(), dangaiMap: activeMap, onComplete: onPrologueCompleted,
    getHeightFn: (x, z) => (activeMap?.getTerrainHeight ? activeMap.getTerrainHeight(x, z) : 0)
  });
}

function returnToMenu() {
  cancelPrologue();
  switchToHuecoMundo();
  state.active = false;
  state.paused = false;
  state.inMenu = true;
  hideVirtualJoystick();
  if (document.pointerLockElement) document.exitPointerLock();
  showLoginMenu();
}

function restartGame() {
  const gameoverModal = document.getElementById('gameover-modal');
  if (gameoverModal) gameoverModal.classList.add('hidden');
  startGame();
}
