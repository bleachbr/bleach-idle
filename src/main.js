import * as THREE from 'three';
import { createSpritesheet } from './spritesheet.js';

// Constantes da Arena e Câmera
const ARENA_RADIUS = 75.0;
const MAX_ENEMIES = 400;

// Configurações de Câmera estilo PokéBonk
const cameraState = {
  yaw: 0,            // Rotação horizontal em radianos (360° livre)
  pitch: 0.50,       // Inclinação vertical (~28° para o chão)
  dist: 13.0,        // Distância do personagem
  target: new THREE.Vector3(0, 1.0, 0)
};

// Estado do Jogo
export const state = {
  active: true,
  paused: false,
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
    shrieker: 0,
    acidwire: 0,
    menos: 0
  },
  weapons: {
    asauchi: { name: 'Corte de Asauchi', level: 1, cooldown: 1.0, timer: 0, damage: 30, totalDamage: 0 },
    byakurai: { name: 'Hadō #4 Byakurai', level: 0, cooldown: 2.2, timer: 0, damage: 45, totalDamage: 0 },
    shakkaho: { name: 'Hadō #31 Shakkahō', level: 0, cooldown: 3.5, timer: 0, damage: 70, totalDamage: 0 }
  },
  passives: {
    shunpo: 0,   // Velocidade +15% por nível
    reiatsu: 0,  // Dano +20% por nível
    magnet: 0    // Raio de coleta +30% por nível
  }
};

// Dados do Jogador (Recruta Shinigami)
export const player = {
  x: 0,
  y: 0,
  z: 0,
  hp: 100,
  maxHp: 100,
  speed: 6.0,
  dirX: 0,
  dirZ: 1, // Começa olhando para o sul / frente
  invulnerableTime: 0
};

// Controles de Entrada
const keys = { w: false, a: false, s: false, d: false };
let isDraggingMouse = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Three.js Globais
let scene, camera, renderer, clock;
let playerMesh, slashMesh, reishiGroup;
let enemyMeshes = [];
let reishiDrops = [];
let spriteTextures = {};

// Iniciar após DOM carregado
window.addEventListener('DOMContentLoaded', init);

function init() {
  const canvas = document.getElementById('game-canvas');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111625);

  clock = new THREE.Clock();

  // 1. Câmera Perspectiva
  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 300);
  updateCamera();

  // 2. Renderizador WebGL
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 3. Luzes
  const ambLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambLight);

  const dirLight = new THREE.DirectionalLight(0xa5c4f5, 1.0);
  dirLight.position.set(20, 40, 20);
  scene.add(dirLight);

  // 4. Arena de Karakura
  createArena();

  // 5. Texturas e Sprites de Bleach
  buildSprites();

  // 6. Personagem do Jogador (Recruta Shinigami)
  createPlayerMesh();

  // 7. Malha do Efeito de Corte (Katana Slash)
  createSlashMesh();

  // 8. Grupo de Orbes de Reishi
  reishiGroup = new THREE.Group();
  scene.add(reishiGroup);

  // 9. Pool de Inimigos Hollows
  initEnemyPool();

  // 10. Listeners de Teclado, Mouse (Rotação 360°) e Touch
  setupInputListeners(canvas);

  // Expor para inspeção e testes automatizados
  window.debugGame = { scene, camera, cameraState, player, state, enemyMeshes };

  // 11. Iniciar Loop
  requestAnimationFrame(loop);
}

function createArena() {
  const groundGeo = new THREE.PlaneGeometry(ARENA_RADIUS * 2, ARENA_RADIUS * 2, 32, 32);
  groundGeo.rotateX(-Math.PI / 2);

  const groundCanvas = document.createElement('canvas');
  groundCanvas.width = 256;
  groundCanvas.height = 256;
  const gctx = groundCanvas.getContext('2d');
  gctx.fillStyle = '#1e2638';
  gctx.fillRect(0, 0, 256, 256);
  gctx.strokeStyle = '#2b364e';
  gctx.lineWidth = 2;
  for (let i = 0; i < 256; i += 32) {
    gctx.beginPath();
    gctx.moveTo(i, 0); gctx.lineTo(i, 256);
    gctx.moveTo(0, i); gctx.lineTo(256, i);
    gctx.stroke();
  }
  const groundTex = new THREE.CanvasTexture(groundCanvas);
  groundTex.wrapS = THREE.RepeatWrapping;
  groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.repeat.set(16, 16);

  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.8
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  scene.add(ground);

  // Barreira Espiritual Circular
  const barrierGeo = new THREE.RingGeometry(ARENA_RADIUS - 0.8, ARENA_RADIUS + 0.5, 64);
  barrierGeo.rotateX(-Math.PI / 2);
  const barrierMat = new THREE.MeshBasicMaterial({
    color: 0x3182ce,
    side: THREE.DoubleSide
  });
  const barrier = new THREE.Mesh(barrierGeo, barrierMat);
  barrier.position.y = 0.05;
  scene.add(barrier);

  // Postes de barreira com lanternas
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const px = Math.cos(angle) * ARENA_RADIUS;
    const pz = Math.sin(angle) * ARENA_RADIUS;

    const poleGeo = new THREE.CylinderGeometry(0.2, 0.2, 4.5, 8);
    poleGeo.translate(0, 2.25, 0);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a5568 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(px, 0, pz);
    scene.add(pole);

    const lampGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    lampGeo.translate(0, 4.5, 0);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0x63b3ed });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(px, 0, pz);
    scene.add(lamp);
  }
}

function buildSprites() {
  const { canvas, sprites } = createSpritesheet();

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
}

function createPlayerMesh() {
  const pGeo = new THREE.PlaneGeometry(2.0, 2.0);
  pGeo.translate(0, 1.0, 0);

  const pMat = new THREE.MeshBasicMaterial({
    map: spriteTextures.player_front,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  playerMesh = new THREE.Mesh(pGeo, pMat);
  playerMesh.position.set(0, 0, 0);
  scene.add(playerMesh);

  // Sombra suave sob os pés
  const shadowGeo = new THREE.CircleGeometry(0.7, 16);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.45
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.y = 0.02;
  playerMesh.add(shadow);
}

function createSlashMesh() {
  const slashGeo = new THREE.RingGeometry(1.6, 3.4, 24, 1, 0, Math.PI * 0.7);
  slashGeo.rotateX(-Math.PI / 2);
  const slashMat = new THREE.MeshBasicMaterial({
    color: 0x63b3ed,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide
  });
  slashMesh = new THREE.Mesh(slashGeo, slashMat);
  slashMesh.position.y = 0.5;
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
      flashTimer: 0
    });
  }
}

// =======================================================================
// CONTROLES DE ENTRADA: TECLADO + ROTAÇÃO DO MOUSE (POINTER LOCK E DRAG)
// =======================================================================
function setupInputListeners(canvas) {
  // 1. Teclado
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.w = true;
    if (k === 'a' || k === 'arrowleft') keys.a = true;
    if (k === 's' || k === 'arrowdown') keys.s = true;
    if (k === 'd' || k === 'arrowright') keys.d = true;

    // Rotação rápida via teclas Q e E (opcional)
    if (k === 'q') cameraState.yaw -= 0.15;
    if (k === 'e') cameraState.yaw += 0.15;
  });

  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.w = false;
    if (k === 'a' || k === 'arrowleft') keys.a = false;
    if (k === 's' || k === 'arrowdown') keys.s = false;
    if (k === 'd' || k === 'arrowright') keys.d = false;
  });

  // 2. Rotação da Câmera com o Mouse (Estilo PokéBonk)
  // Suporta:
  // - Clique e arraste na tela (Mouse Drag)
  // - Pointer Lock opcional (ao clicar na área de jogo)
  canvas.addEventListener('mousedown', (e) => {
    isDraggingMouse = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isDraggingMouse = false;
  });

  window.addEventListener('mousemove', (e) => {
    // Se o ponteiro estiver travado via PointerLock API (estilo PokéBonk)
    if (document.pointerLockElement === canvas) {
      const sens = 0.0035;
      cameraState.yaw -= e.movementX * sens;
      cameraState.pitch += e.movementY * sens;
      cameraState.pitch = Math.max(0.15, Math.min(1.15, cameraState.pitch));
      return;
    }

    // Se estiver arrastando com botão do mouse
    if (isDraggingMouse) {
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      const sens = 0.006;
      cameraState.yaw -= dx * sens;
      cameraState.pitch += dy * sens;
      cameraState.pitch = Math.max(0.15, Math.min(1.15, cameraState.pitch));
    }
  });

  // Zoom da Câmera com a roda do mouse (Scroll Wheel)
  window.addEventListener('wheel', (e) => {
    cameraState.dist = Math.max(7.0, Math.min(24.0, cameraState.dist + Math.sign(e.deltaY) * 1.0));
  }, { passive: true });

  // 3. Suporte a Touch no Mobile (Deslizar para girar a câmera)
  let touchStartX = 0;
  let touchStartY = 0;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;

      cameraState.yaw -= dx * 0.008;
      cameraState.pitch = Math.max(0.15, Math.min(1.15, cameraState.pitch + dy * 0.006));
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  document.getElementById('btn-restart').onclick = () => location.reload();
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
  camera.lookAt(player.x, 1.2, player.z);
}

// =======================================================================
// CÁLCULO DE PERSPECTIVA DO SPRITE (FRENTE, COSTAS, LADOS)
// Matemática idêntica ao PokéBonk: dirRow()
// =======================================================================
function getSpriteDirection(facingX, facingZ) {
  // Vetores de base da câmera
  const camRightX = Math.cos(cameraState.yaw);
  const camRightZ = -Math.sin(cameraState.yaw);
  const camFwdX   = -Math.sin(cameraState.yaw);
  const camFwdZ   = -Math.cos(cameraState.yaw);

  // Projeção do vetor de visão do personagem em relação à câmera
  const rightProj = facingX * camRightX + facingZ * camRightZ;
  const fwdProj   = facingX * camFwdX   + facingZ * camFwdZ;

  // Ângulo relativo: 0 = olhando para frente da câmera (costas para o jogador)
  const angle = Math.atan2(rightProj, fwdProj);

  // Mapeia para 4 setores principais:
  // Frente (olhando para a câmera), Costas (olhando para longe), Lado Direito, Lado Esquerdo
  if (angle > -Math.PI * 0.25 && angle <= Math.PI * 0.25) {
    return 'back'; // Personagem anda para frente (mostra costas)
  } else if (angle > Math.PI * 0.25 && angle <= Math.PI * 0.75) {
    return 'side'; // Perfil direito
  } else if (angle < -Math.PI * 0.25 && angle >= -Math.PI * 0.75) {
    return 'side_l'; // Perfil esquerdo
  } else {
    return 'front'; // Personagem anda em direção à câmera (mostra a frente)
  }
}

// =======================================================================
// LOOP PRINCIPAL DE JOGO
// =======================================================================
let slashAlpha = 0;
let spawnTimer = 0;

function loop() {
  requestAnimationFrame(loop);

  const dt = Math.min(clock.getDelta(), 0.1);
  if (!state.active || state.paused) return;

  state.time += dt;

  // 1. Atualizar Jogador (Movimento relativo ao ângulo da câmera)
  updatePlayer(dt);

  // 2. Armas / Ataques
  updateWeapons(dt);

  // 3. Spawns e Inimigos
  updateSpawns(dt);
  updateEnemies(dt);

  // 4. Coleta de Reishi
  updateReishi(dt);

  // 5. Câmera Orbital
  updateCamera();

  // 6. Atualizar Sprites e Orientação de Billboarding
  updateBillboards();

  // 7. Renderizar Cena
  renderer.render(scene, camera);

  // 8. Atualizar HUD
  updateHUD();
}

function updatePlayer(dt) {
  let mx = 0;
  let mz = 0;
  if (keys.w) mz -= 1;
  if (keys.s) mz += 1;
  if (keys.a) mx -= 1;
  if (keys.d) mx += 1;

  if (mx !== 0 || mz !== 0) {
    const len = Math.hypot(mx, mz);
    mx /= len;
    mz /= len;

    // Movimentação RELATIVA À CÂMERA (o 'W' sempre anda para onde a câmera está apontada)
    const sinYaw = Math.sin(cameraState.yaw);
    const cosYaw = Math.cos(cameraState.yaw);

    const worldDx = mx * cosYaw - mz * sinYaw;
    const worldDz = mx * sinYaw + mz * cosYaw;

    player.dirX = worldDx;
    player.dirZ = worldDz;

    const currentSpeed = player.speed * (1 + state.passives.shunpo * 0.15);
    player.x += worldDx * currentSpeed * dt;
    player.z += worldDz * currentSpeed * dt;

    // Confinar na arena
    const dist = Math.hypot(player.x, player.z);
    if (dist > ARENA_RADIUS - 2.0) {
      const angle = Math.atan2(player.z, player.x);
      player.x = Math.cos(angle) * (ARENA_RADIUS - 2.0);
      player.z = Math.sin(angle) * (ARENA_RADIUS - 2.0);
    }
  }

  playerMesh.position.set(player.x, 0, player.z);

  // Piscar de dano
  if (player.invulnerableTime > 0) {
    player.invulnerableTime -= dt;
    playerMesh.material.opacity = Math.sin(state.time * 30) > 0 ? 0.4 : 1.0;
  } else {
    playerMesh.material.opacity = 1.0;
  }
}

function updateBillboards() {
  // 1. Sempre orienta a face do plano para a câmera
  playerMesh.quaternion.copy(camera.quaternion);

  // 2. Altera a textura do jogador de acordo com a direção em que está olhando
  const pDir = getSpriteDirection(player.dirX, player.dirZ);
  const pTex = spriteTextures[`player_${pDir}`] || spriteTextures.player_front;
  if (playerMesh.material.map !== pTex) {
    playerMesh.material.map = pTex;
    playerMesh.material.needsUpdate = true;
  }

  // 3. Atualiza os Hollows (para o Fishbone D também muda frente/costas/lados)
  for (const en of enemyMeshes) {
    if (en.active) {
      en.mesh.quaternion.copy(camera.quaternion);

      if (en.type === 'fishbone') {
        const eDir = getSpriteDirection(en.dirX, en.dirZ);
        const eTex = spriteTextures[`fishbone_${eDir}`] || spriteTextures.fishbone_front;
        if (en.mesh.material.map !== eTex) {
          en.mesh.material.map = eTex;
          en.mesh.material.needsUpdate = true;
        }
      }
    }
  }
}

function updateWeapons(dt) {
  const dmgBonus = 1 + state.passives.reiatsu * 0.2;

  // 1. Asauchi Slash (Katana frontal automática)
  const asauchi = state.weapons.asauchi;
  asauchi.timer -= dt;
  if (asauchi.timer <= 0) {
    asauchi.timer = asauchi.cooldown;
    executeAsauchiSlash(asauchi.damage * dmgBonus);
  }

  // Animação do Slash
  if (slashAlpha > 0) {
    slashAlpha -= dt * 4.0;
    slashMesh.material.opacity = Math.max(0, slashAlpha);
  }

  // 2. Hadō #4 Byakurai (Raio Perfurante no mais próximo)
  const byakurai = state.weapons.byakurai;
  if (byakurai.level > 0) {
    byakurai.timer -= dt;
    if (byakurai.timer <= 0) {
      byakurai.timer = byakurai.cooldown;
      executeByakurai(byakurai.damage * dmgBonus);
    }
  }

  // 3. Hadō #31 Shakkahō (Explosão em Área)
  const shakkaho = state.weapons.shakkaho;
  if (shakkaho.level > 0) {
    shakkaho.timer -= dt;
    if (shakkaho.timer <= 0) {
      shakkaho.timer = shakkaho.cooldown;
      executeShakkaho(shakkaho.damage * dmgBonus);
    }
  }
}

function executeAsauchiSlash(dmg) {
  slashAlpha = 0.8;
  const pAngle = Math.atan2(player.dirZ, player.dirX);
  slashMesh.position.set(player.x, 0.4, player.z);
  slashMesh.rotation.y = -pAngle + Math.PI * 0.35;

  const range = 4.5;
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
  let target = null;
  let minDist = 999;
  for (const en of enemyMeshes) {
    if (!en.active) continue;
    const d = Math.hypot(en.x - player.x, en.z - player.z);
    if (d < minDist) {
      minDist = d;
      target = en;
    }
  }

  if (target) {
    const tx = target.x - player.x;
    const tz = target.z - player.z;
    const len = Math.hypot(tx, tz) || 1;
    const nx = tx / len;
    const nz = tz / len;

    for (const en of enemyMeshes) {
      if (!en.active) continue;
      const ex = en.x - player.x;
      const ez = en.z - player.z;
      const proj = ex * nx + ez * nz;
      if (proj > 0 && proj < 25) {
        const perp = Math.abs(ex * nz - ez * nx);
        if (perp < 1.6) {
          damageEnemy(en, dmg, 'byakurai');
        }
      }
    }
  }
}

function executeShakkaho(dmg) {
  const targetX = player.x + player.dirX * 7;
  const targetZ = player.z + player.dirZ * 7;
  const radius = 5.0;

  for (const en of enemyMeshes) {
    if (!en.active) continue;
    const d = Math.hypot(en.x - targetX, en.z - targetZ);
    if (d <= radius) {
      damageEnemy(en, dmg, 'shakkaho');
    }
  }
}

function damageEnemy(en, dmg, weaponKey) {
  en.hp -= dmg;
  en.flashTimer = 0.12;
  en.mesh.material.color.setHex(0xffffff);

  state.damageDealt += dmg;
  state.weapons[weaponKey].totalDamage += dmg;

  if (en.hp <= 0) {
    killEnemy(en);
  }
}

function killEnemy(en) {
  en.active = false;
  en.mesh.visible = false;
  en.mesh.position.set(0, -999, 0);
  state.kills++;
  state.census[en.type] = (state.census[en.type] || 0) + 1;

  spawnReishi(en.x, en.z, en.isBoss ? 20 : 1);

  if (en.isBoss) {
    state.bossDefeated = true;
    showGameOver(true);
  }
}

function spawnReishi(x, z, amount) {
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

  reishiDrops.push({ mesh, x, z, value: amount * 10 });
}

function updateReishi(dt) {
  const magnetRadius = 4.0 * (1 + state.passives.magnet * 0.3);

  for (let i = reishiDrops.length - 1; i >= 0; i--) {
    const r = reishiDrops[i];
    r.mesh.quaternion.copy(camera.quaternion);

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
    openLevelUpModal();
  }
}

function openLevelUpModal() {
  state.paused = true;
  const modal = document.getElementById('levelup-modal');
  const container = document.getElementById('cards-container');
  container.innerHTML = '';

  const options = [
    { key: 'asauchi', type: 'weapon', name: 'Corte de Asauchi', icon: '🗡️', desc: 'Aumenta o dano da katana e reduz o intervalo de corte.' },
    { key: 'byakurai', type: 'weapon', name: 'Hadō #4 Byakurai', icon: '⚡', desc: 'Dispara um raio perfurante veloz em linha reta.' },
    { key: 'shakkaho', type: 'weapon', name: 'Hadō #31 Shakkahō', icon: '🔥', desc: 'Lança uma esfera de fogo de Reiatsu que explode em área.' },
    { key: 'shunpo', type: 'passive', name: 'Treino de Shunpo', icon: '👟', desc: '+15% de velocidade de movimento permanente.' },
    { key: 'reiatsu', type: 'passive', name: 'Densidade de Reiatsu', icon: '💎', desc: '+20% de dano espiritual para todos os ataques.' },
    { key: 'magnet', type: 'passive', name: 'Controle de Reishi', icon: '🧲', desc: '+30% no raio de atração das partículas de Reishi.' }
  ];

  const shuffled = options.sort(() => 0.5 - Math.random()).slice(0, 3);
  shuffled.forEach(opt => {
    const card = document.createElement('div');
    card.className = 'skill-card';
    card.innerHTML = `
      <div class="skill-icon">${opt.icon}</div>
      <div class="skill-name">${opt.name}</div>
      <div class="skill-desc">${opt.desc}</div>
    `;
    card.onclick = () => selectSkill(opt);
    container.appendChild(card);
  });

  modal.classList.remove('hidden');
}

function selectSkill(opt) {
  if (opt.type === 'weapon') {
    state.weapons[opt.key].level++;
    state.weapons[opt.key].damage += 15;
    state.weapons[opt.key].cooldown = Math.max(0.35, state.weapons[opt.key].cooldown * 0.88);
  } else {
    state.passives[opt.key]++;
  }

  document.getElementById('levelup-modal').classList.add('hidden');
  state.paused = false;
}

// Spawns
function updateSpawns(dt) {
  if (!state.bossSpawned && (state.time >= 120 || state.kills >= 60)) {
    spawnBossMenosGrande();
    state.bossSpawned = true;
    return;
  }

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnTimer = Math.max(0.3, 1.0 - (state.time / 180) * 0.7);
    const count = 1 + Math.floor(state.time / 30);
    for (let i = 0; i < count; i++) {
      spawnHollow();
    }
  }
}

function spawnHollow() {
  const en = enemyMeshes.find(e => !e.active);
  if (!en) return;

  const angle = Math.random() * Math.PI * 2;
  const dist = 16.0 + Math.random() * 8.0;
  en.x = player.x + Math.cos(angle) * dist;
  en.z = player.z + Math.sin(angle) * dist;

  const rand = Math.random();
  let type = 'fishbone';
  let hp = 40;
  let spd = 3.2;

  if (rand > 0.75) {
    type = 'acidwire';
    hp = 70;
    spd = 2.6;
  } else if (rand > 0.45) {
    type = 'shrieker';
    hp = 30;
    spd = 4.2;
  }

  en.active = true;
  en.type = type;
  en.hp = hp;
  en.maxHp = hp;
  en.speed = spd;
  en.isBoss = false;

  en.mesh.scale.set(1.0, 1.0, 1.0);
  en.mesh.material.map = spriteTextures[type === 'fishbone' ? 'fishbone_front' : type];
  en.mesh.material.color.setHex(0xffffff);
  en.mesh.position.set(en.x, 0, en.z);
  en.mesh.visible = true;
}

function spawnBossMenosGrande() {
  const en = enemyMeshes.find(e => !e.active);
  if (!en) return;

  const angle = Math.random() * Math.PI * 2;
  const dist = 30.0;
  en.x = Math.cos(angle) * dist;
  en.z = Math.sin(angle) * dist;

  en.active = true;
  en.type = 'menos';
  en.hp = 2000;
  en.maxHp = 2000;
  en.speed = 2.0;
  en.isBoss = true;

  en.mesh.scale.set(3.2, 3.2, 3.2);
  en.mesh.material.map = spriteTextures.menos;
  en.mesh.material.color.setHex(0xffffff);
  en.mesh.position.set(en.x, 0, en.z);
  en.mesh.visible = true;

  document.getElementById('boss-bar-container').classList.remove('hidden');
}

function updateEnemies(dt) {
  for (const en of enemyMeshes) {
    if (!en.active) continue;

    const dx = player.x - en.x;
    const dz = player.z - en.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.6) {
      en.dirX = dx / dist;
      en.dirZ = dz / dist;
      en.x += en.dirX * en.speed * dt;
      en.z += en.dirZ * en.speed * dt;
      en.mesh.position.set(en.x, 0, en.z);
    }

    // Dano de contato
    if (dist < 1.1 && player.invulnerableTime <= 0) {
      player.hp -= en.isBoss ? 35 : 12;
      player.invulnerableTime = 0.6;
      if (player.hp <= 0) {
        player.hp = 0;
        showGameOver(false);
      }
    }

    if (en.flashTimer > 0) {
      en.flashTimer -= dt;
      if (en.flashTimer <= 0) {
        en.mesh.material.color.setHex(0xffffff);
      }
    }
  }
}

function updateHUD() {
  const hpPercent = (player.hp / player.maxHp) * 100;
  document.getElementById('hp-bar-fill').style.width = hpPercent + '%';
  document.getElementById('hp-text').innerText = `${Math.ceil(player.hp)} / ${player.maxHp}`;

  const xpPercent = (state.xp / state.xpNext) * 100;
  document.getElementById('xp-bar-fill').style.width = xpPercent + '%';
  document.getElementById('level-badge').innerText = `Nv. ${state.level}`;

  const mins = String(Math.floor(state.time / 60)).padStart(2, '0');
  const secs = String(Math.floor(state.time % 60)).padStart(2, '0');
  document.getElementById('timer-box').innerText = `${mins}:${secs}`;
  document.getElementById('kills-count').innerText = state.kills;

  if (state.bossSpawned && !state.bossDefeated) {
    const boss = enemyMeshes.find(e => e.active && e.isBoss);
    if (boss) {
      const bossHpPercent = (boss.hp / boss.maxHp) * 100;
      document.getElementById('boss-hp-fill').style.width = Math.max(0, bossHpPercent) + '%';
    }
  }
}

function showGameOver(victory) {
  state.active = false;
  const modal = document.getElementById('gameover-modal');
  const title = document.getElementById('report-title');
  const subtitle = document.getElementById('report-subtitle');

  if (victory) {
    title.innerText = 'MISSÃO CUMPRIDA! (VITÓRIA)';
    title.style.color = '#48bb78';
    subtitle.innerText = 'O Menos Grande (Gillian) foi purificado e Karakura está a salvo!';
  } else {
    title.innerText = 'VOCÊ CAIU EM COMBATE';
    title.style.color = '#f56565';
    subtitle.innerText = 'Sua alma foi sobrepujada pela invasão dos Hollows.';
  }

  const mins = String(Math.floor(state.time / 60)).padStart(2, '0');
  const secs = String(Math.floor(state.time % 60)).padStart(2, '0');
  document.getElementById('stat-time').innerText = `${mins}:${secs}`;
  document.getElementById('stat-level').innerText = `Nv. ${state.level}`;
  document.getElementById('stat-kills').innerText = state.kills;
  document.getElementById('stat-damage').innerText = Math.round(state.damageDealt).toLocaleString('pt-BR');

  const censusList = document.getElementById('enemies-census');
  censusList.innerHTML = `
    <li><span>Fishbone D:</span> <b>${state.census.fishbone}</b></li>
    <li><span>Shrieker:</span> <b>${state.census.shrieker}</b></li>
    <li><span>Acidwire:</span> <b>${state.census.acidwire}</b></li>
    <li><span>Menos Grande (Chefe):</span> <b>${state.census.menos > 0 ? '1 (PURIFICADO)' : '0'}</b></li>
  `;

  const weaponsList = document.getElementById('weapons-census');
  weaponsList.innerHTML = Object.values(state.weapons)
    .filter(w => w.level > 0)
    .map(w => `<li><span>${w.name} (Nv. ${w.level}):</span> <b>${Math.round(w.totalDamage).toLocaleString('pt-BR')} dano</b></li>`)
    .join('');

  modal.classList.remove('hidden');
}
