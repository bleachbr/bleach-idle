import * as THREE from 'three';
import { createSpritesheet } from './spritesheet.js';

// Constantes do jogo
const ARENA_RADIUS = 75.0;
const MAX_ENEMIES = 400;
const CAM_DIST = 14.0;
const CAM_PITCH = 0.55; // Inclinação da câmera para enxergar o chão e personagens com perfeição

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
  dirZ: 1,
  invulnerableTime: 0
};

// Controles
const keys = { w: false, a: false, s: false, d: false };

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
  scene.background = new THREE.Color(0x111625); // Azul-noite atmosférico visível

  clock = new THREE.Clock();

  // 1. Câmera
  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 300);
  updateCamera();

  // 2. Renderizador WebGL
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 3. Iluminação
  const ambLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambLight);

  const dirLight = new THREE.DirectionalLight(0xa5c4f5, 1.0);
  dirLight.position.set(20, 40, 20);
  scene.add(dirLight);

  // 4. Construção da Arena de Karakura
  createArena();

  // 5. Texturas e Sprites de Bleach
  buildSprites();

  // 6. Criar Personagem do Jogador (Recruta Shinigami)
  createPlayerMesh();

  // 7. Criar Malha do Efeito de Corte (Katana Slash)
  createSlashMesh();

  // 8. Grupo de Orbes de Reishi
  reishiGroup = new THREE.Group();
  scene.add(reishiGroup);

  // 9. Pool de Hollows
  initEnemyPool();

  // 10. Listeners de Teclado e Redimensionamento
  setupInputListeners();

  // Expor para debug via browser / playwright
  window.debugGame = { scene, camera, player, state, enemyMeshes };

  // 11. Iniciar Loop
  requestAnimationFrame(loop);
}

function createArena() {
  // 1. Chão de asfalto urbano com textura de grade
  const groundGeo = new THREE.PlaneGeometry(ARENA_RADIUS * 2, ARENA_RADIUS * 2, 32, 32);
  groundGeo.rotateX(-Math.PI / 2);

  // Textura procedural de calçamento/asfalto
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

  // 2. Barreira Espiritual Circular (Bordas da Arena)
  const barrierGeo = new THREE.RingGeometry(ARENA_RADIUS - 0.8, ARENA_RADIUS + 0.5, 64);
  barrierGeo.rotateX(-Math.PI / 2);
  const barrierMat = new THREE.MeshBasicMaterial({
    color: 0x3182ce,
    side: THREE.DoubleSide
  });
  const barrier = new THREE.Mesh(barrierGeo, barrierMat);
  barrier.position.y = 0.05;
  scene.add(barrier);

  // 3. Postes com lanternas/fitas espirituais nas bordas
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

    // Lanterna no topo do poste
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

  // Gera texturas individuais a partir do atlas para garantir renderização perfeita
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
  pGeo.translate(0, 1.0, 0); // Pivô nos pés

  const pMat = new THREE.MeshBasicMaterial({
    map: spriteTextures.player,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  playerMesh = new THREE.Mesh(pGeo, pMat);
  playerMesh.position.set(0, 0, 0);
  scene.add(playerMesh);

  // Sombra suave sob os pés do jogador
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
  // Arco visual do golpe da Katana
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
      map: spriteTextures.fishbone,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(baseGeo.clone(), mat);
    mesh.visible = false;
    mesh.position.set(0, -999, 0);

    // Sombra do monstro
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
      hp: 40,
      maxHp: 40,
      speed: 3.2,
      type: 'fishbone',
      isBoss: false,
      flashTimer: 0
    });
  }
}

function setupInputListeners() {
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.w = true;
    if (k === 'a' || k === 'arrowleft') keys.a = true;
    if (k === 's' || k === 'arrowdown') keys.s = true;
    if (k === 'd' || k === 'arrowright') keys.d = true;
  });

  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.w = false;
    if (k === 'a' || k === 'arrowleft') keys.a = false;
    if (k === 's' || k === 'arrowdown') keys.s = false;
    if (k === 'd' || k === 'arrowright') keys.d = false;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  document.getElementById('btn-restart').onclick = () => location.reload();
}

function updateCamera() {
  const targetX = player.x;
  const targetZ = player.z;

  const camY = CAM_DIST * Math.sin(CAM_PITCH) + 1.2;
  const camZ = targetZ + CAM_DIST * Math.cos(CAM_PITCH);

  camera.position.set(targetX, camY, camZ);
  camera.lookAt(targetX, 1.0, targetZ);
}

// ==========================================
// LOOP DE JOGO
// ==========================================
let slashAlpha = 0;
let spawnTimer = 0;

function loop() {
  requestAnimationFrame(loop);

  const dt = Math.min(clock.getDelta(), 0.1);
  if (!state.active || state.paused) return;

  state.time += dt;

  // 1. Atualizar Jogador
  updatePlayer(dt);

  // 2. Armas / Ataques
  updateWeapons(dt);

  // 3. Spawns e Inimigos
  updateSpawns(dt);
  updateEnemies(dt);

  // 4. Coleta de Reishi
  updateReishi(dt);

  // 5. Câmera
  updateCamera();

  // 6. Billboard: Sprites sempre encaram a rotação da câmera (estilo PokéBonk)
  alignBillboards();

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

    player.dirX = mx;
    player.dirZ = mz;

    const currentSpeed = player.speed * (1 + state.passives.shunpo * 0.15);
    player.x += mx * currentSpeed * dt;
    player.z += mz * currentSpeed * dt;

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

function alignBillboards() {
  // Orienta os sprites para a câmera
  playerMesh.quaternion.copy(camera.quaternion);

  for (const en of enemyMeshes) {
    if (en.active) {
      en.mesh.quaternion.copy(camera.quaternion);
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
  en.flashTimer = 0.12; // Flash branco
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

  // Drop de Reishi
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
  // Spawn do Chefe Menos Grande: minuto 2 ou 60 kills
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

  // Nascem a 18-24 metros do jogador para entrarem na tela rapidamente
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
  en.mesh.material.map = spriteTextures[type];
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

  en.mesh.scale.set(3.2, 3.2, 3.2); // Colossal
  en.mesh.material.map = spriteTextures.menos;
  en.mesh.material.color.setHex(0xffffff);
  en.mesh.position.set(en.x, 0, en.z);
  en.mesh.visible = true;

  document.getElementById('boss-bar-container').classList.remove('hidden');
}

function updateEnemies(dt) {
  for (const en of enemyMeshes) {
    if (!en.active) continue;

    // Perseguição em direção ao jogador
    const dx = player.x - en.x;
    const dz = player.z - en.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.6) {
      en.x += (dx / dist) * en.speed * dt;
      en.z += (dz / dist) * en.speed * dt;
      en.mesh.position.set(en.x, 0, en.z);
    }

    // Dano de contato no jogador
    if (dist < 1.1 && player.invulnerableTime <= 0) {
      player.hp -= en.isBoss ? 35 : 12;
      player.invulnerableTime = 0.6;
      if (player.hp <= 0) {
        player.hp = 0;
        showGameOver(false);
      }
    }

    // Flash de dano decai
    if (en.flashTimer > 0) {
      en.flashTimer -= dt;
      if (en.flashTimer <= 0) {
        en.mesh.material.color.setHex(0xffffff);
      }
    }
  }
}

function updateHUD() {
  // HP
  const hpPercent = (player.hp / player.maxHp) * 100;
  document.getElementById('hp-bar-fill').style.width = hpPercent + '%';
  document.getElementById('hp-text').innerText = `${Math.ceil(player.hp)} / ${player.maxHp}`;

  // XP
  const xpPercent = (state.xp / state.xpNext) * 100;
  document.getElementById('xp-bar-fill').style.width = xpPercent + '%';
  document.getElementById('level-badge').innerText = `Nv. ${state.level}`;

  // Relógio
  const mins = String(Math.floor(state.time / 60)).padStart(2, '0');
  const secs = String(Math.floor(state.time % 60)).padStart(2, '0');
  document.getElementById('timer-box').innerText = `${mins}:${secs}`;
  document.getElementById('kills-count').innerText = state.kills;

  // Barra de Vida do Chefe
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
