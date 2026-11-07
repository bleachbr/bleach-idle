import * as THREE from 'three';
import { createSpritesheet } from './spritesheet.js';
import { billboardVertexShader, billboardFragmentShader } from './shaders.js';

// Constantes do jogo
const ARENA_RADIUS = 75.0;
const MAX_ENEMIES = 800;
const CAM_DIST = 9.0;
const CAM_PITCH = 0.45; // ~26° de inclinação para o chão

// Estado do Jogo
const state = {
  active: true,
  paused: false,
  time: 0,
  kills: 0,
  damageDealt: 0,
  level: 1,
  xp: 0,
  xpNext: 30,
  bossSpawned: false,
  bossDefeated: false,
  census: {
    fishbone: 0,
    shrieker: 0,
    acidwire: 0,
    menos: 0
  },
  weapons: {
    asauchi: { name: 'Corte de Asauchi', level: 1, cooldown: 1.1, timer: 0, damage: 25, totalDamage: 0 },
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
const player = {
  x: 0,
  y: 0,
  z: 0,
  hp: 100,
  maxHp: 100,
  speed: 5.5,
  dirX: 0,
  dirZ: 1,
  invulnerableTime: 0
};

// Input
const keys = { w: false, a: false, s: false, d: false };

// Three.js Core
let scene, camera, renderer, clock;
let spriteTexture;
let enemyMesh, aPos, aSize, aUV, aFx;
let playerMesh, pPos, pSize, pUV, pFx;
let attackSlashes = [];
let reishiDrops = [];

// Arrays de dados dos inimigos (SoA - Structure of Arrays)
const enemies = {
  count: 0,
  x: new Float32Array(MAX_ENEMIES),
  y: new Float32Array(MAX_ENEMIES),
  z: new Float32Array(MAX_ENEMIES),
  hp: new Float32Array(MAX_ENEMIES),
  maxHp: new Float32Array(MAX_ENEMIES),
  speed: new Float32Array(MAX_ENEMIES),
  type: new Array(MAX_ENEMIES),
  isBoss: new Uint8Array(MAX_ENEMIES),
  flash: new Float32Array(MAX_ENEMIES),
  dissolve: new Float32Array(MAX_ENEMIES),
  active: new Uint8Array(MAX_ENEMIES)
};

// Inicialização
window.addEventListener('DOMContentLoaded', init);

function init() {
  const canvas = document.getElementById('game-canvas');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0f18);
  scene.fog = new THREE.Fog(0x0c0f18, 30, 85);

  clock = new THREE.Clock();

  // 1. Câmera Perspectiva (PokéBonk: FOV 70°, CamDist 9.0, Pitch 0.45)
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
  updateCameraPosition();

  // 2. Renderizador WebGL
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 3. Luzes
  const ambLight = new THREE.AmbientLight(0xdde5f4, 0.85);
  scene.add(ambLight);

  const dirLight = new THREE.DirectionalLight(0x9fc5e8, 1.2);
  dirLight.position.set(20, 40, 20);
  scene.add(dirLight);

  // 4. Construção do Terreno da Arena Fechada (Karakura Town)
  createArena();

  // 5. Geração e Carregamento do Spritesheet
  const { canvas: sheetCanvas, sprites } = createSpritesheet();
  spriteTexture = new THREE.CanvasTexture(sheetCanvas);
  spriteTexture.magFilter = THREE.NearestFilter;
  spriteTexture.minFilter = THREE.NearestFilter;
  spriteTexture.colorSpace = THREE.SRGBColorSpace;

  // 6. Configuração dos Renderizadores Instanciados de Sprites
  setupSpriteRenderers(sprites);

  // 7. Eventos de Entrada (Teclado e Redimensionamento)
  setupInputListeners();

  // 8. Iniciar o Loop Principal
  requestAnimationFrame(loop);
}

function createArena() {
  // Chão Circular de Asfalto Urbano
  const groundGeo = new THREE.CircleGeometry(ARENA_RADIUS, 48);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1a2130,
    roughness: 0.85,
    metalness: 0.1
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  scene.add(ground);

  // Muro/Barreira de Selamento Espiritual nas Bordas da Arena
  const wallGeo = new THREE.RingGeometry(ARENA_RADIUS - 0.5, ARENA_RADIUS + 3.0, 48);
  wallGeo.rotateX(-Math.PI / 2);
  const wallMat = new THREE.MeshBasicMaterial({
    color: 0x2b3852,
    side: THREE.DoubleSide
  });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.y = 0.05;
  scene.add(wall);

  // Postes de Luz e Fitas de Selamento
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const px = Math.cos(angle) * ARENA_RADIUS;
    const pz = Math.sin(angle) * ARENA_RADIUS;

    const poleGeo = new THREE.CylinderGeometry(0.2, 0.2, 5, 8);
    poleGeo.translate(0, 2.5, 0);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2d3748 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(px, 0, pz);
    scene.add(pole);
  }
}

function setupSpriteRenderers(sprites) {
  // Material compartilhado com Shaders Customizados
  const spriteMat = new THREE.ShaderMaterial({
    vertexShader: billboardVertexShader,
    fragmentShader: billboardFragmentShader,
    uniforms: {
      map: { value: spriteTexture },
      uTexel: { value: new THREE.Vector2(1 / 512, 1 / 512) },
      uLean: { value: 0.35 },
      uTime: { value: 0 }
    },
    transparent: true,
    depthWrite: true
  });

  const baseQuad = new THREE.PlaneGeometry(1, 1);
  baseQuad.translate(0, 0.5, 0); // Pivô nos pés do personagem

  // --- MESH DO JOGADOR ---
  pPos = new Float32Array(3);
  pSize = new Float32Array(2);
  pUV = new Float32Array(4);
  pFx = new Float32Array(4);

  const pGeo = baseQuad.clone();
  pGeo.setAttribute('iPos', new THREE.InstancedBufferAttribute(pPos, 3));
  pGeo.setAttribute('iSize', new THREE.InstancedBufferAttribute(pSize, 2));
  pGeo.setAttribute('iUV', new THREE.InstancedBufferAttribute(pUV, 4));
  pGeo.setAttribute('iFx', new THREE.InstancedBufferAttribute(pFx, 4));

  playerMesh = new THREE.InstancedMesh(pGeo, spriteMat, 1);
  playerMesh.frustumCulled = false;
  scene.add(playerMesh);

  // Inicializar dados do player
  const pSp = sprites.player;
  pSize[0] = 1.6; pSize[1] = 1.6;
  pUV[0] = pSp.x / 512; pUV[1] = pSp.y / 512;
  pUV[2] = (pSp.x + pSp.w) / 512; pUV[3] = (pSp.y + pSp.h) / 512;
  pFx[2] = 1.0; // Contorno branco/ciano do jogador

  // --- MESH DOS INIMIGOS (Hollows) ---
  aPos = new Float32Array(MAX_ENEMIES * 3);
  aSize = new Float32Array(MAX_ENEMIES * 2);
  aUV = new Float32Array(MAX_ENEMIES * 4);
  aFx = new Float32Array(MAX_ENEMIES * 4);

  const eGeo = baseQuad.clone();
  eGeo.setAttribute('iPos', new THREE.InstancedBufferAttribute(aPos, 3));
  eGeo.setAttribute('iSize', new THREE.InstancedBufferAttribute(aSize, 2));
  eGeo.setAttribute('iUV', new THREE.InstancedBufferAttribute(aUV, 4));
  eGeo.setAttribute('iFx', new THREE.InstancedBufferAttribute(aFx, 4));

  enemyMesh = new THREE.InstancedMesh(eGeo, spriteMat, MAX_ENEMIES);
  enemyMesh.frustumCulled = false;
  scene.add(enemyMesh);

  // Mapear UVs auxiliares
  window.spriteDefs = sprites;
}

function updateCameraPosition() {
  const targetX = player.x;
  const targetZ = player.z;

  const camY = CAM_DIST * Math.sin(CAM_PITCH) + 1.2;
  const camZ = targetZ + CAM_DIST * Math.cos(CAM_PITCH);

  camera.position.set(targetX, camY, camZ);
  camera.lookAt(targetX, 1.2, targetZ);
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

  document.getElementById('btn-restart').onclick = restartGame;
}

// ==========================================
// LOOP PRINCIPAL DE SIMULAÇÃO E RENDERIZAÇÃO
// ==========================================
function loop() {
  requestAnimationFrame(loop);

  const dt = Math.min(clock.getDelta(), 0.1);
  if (!state.active || state.paused) return;

  state.time += dt;

  // 1. Atualizar Jogador (Movimentação com Shunpo)
  updatePlayer(dt);

  // 2. Armas e Ataques
  updateWeapons(dt);

  // 3. Spawns e IA de Hordas de Hollows
  updateSpawns(dt);
  updateEnemies(dt);

  // 4. Coleta de Reishi
  updateReishiDrops(dt);

  // 5. Câmera e Shaders
  updateCameraPosition();
  enemyMesh.material.uniforms.uTime.value = state.time;

  // Atualizar atributos no WebGL
  playerMesh.geometry.attributes.iPos.needsUpdate = true;
  playerMesh.geometry.attributes.iFx.needsUpdate = true;
  enemyMesh.geometry.attributes.iPos.needsUpdate = true;
  enemyMesh.geometry.attributes.iSize.needsUpdate = true;
  enemyMesh.geometry.attributes.iUV.needsUpdate = true;
  enemyMesh.geometry.attributes.iFx.needsUpdate = true;

  // Renderizar Cena 3D
  renderer.render(scene, camera);

  // Atualizar HUD
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

    // Confinar dentro da Arena Fechada
    const dist = Math.hypot(player.x, player.z);
    if (dist > ARENA_RADIUS - 2.0) {
      const angle = Math.atan2(player.z, player.x);
      player.x = Math.cos(angle) * (ARENA_RADIUS - 2.0);
      player.z = Math.sin(angle) * (ARENA_RADIUS - 2.0);
    }
  }

  // Atualizar posição do sprite do jogador
  pPos[0] = player.x;
  pPos[1] = player.y;
  pPos[2] = player.z;

  // Piscar de invulnerabilidade se tomou dano
  if (player.invulnerableTime > 0) {
    player.invulnerableTime -= dt;
    pFx[0] = Math.sin(state.time * 30) > 0 ? 0.7 : 0.0;
  } else {
    pFx[0] = 0.0;
  }
}

function updateWeapons(dt) {
  const dmgBonus = 1 + state.passives.reiatsu * 0.2;

  // 1. Asauchi Slash (Corte em arco frontal)
  const asauchi = state.weapons.asauchi;
  asauchi.timer -= dt;
  if (asauchi.timer <= 0) {
    asauchi.timer = asauchi.cooldown;
    executeAsauchiSlash(asauchi.damage * dmgBonus);
  }

  // 2. Hadō #4 Byakurai (Raio Perfurante no Hollow mais próximo)
  const byakurai = state.weapons.byakurai;
  if (byakurai.level > 0) {
    byakurai.timer -= dt;
    if (byakurai.timer <= 0) {
      byakurai.timer = byakurai.cooldown;
      executeByakurai(byakurai.damage * dmgBonus);
    }
  }

  // 3. Hadō #31 Shakkahō (Canhão de Fogo Explosivo)
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
  const range = 4.2;
  const arc = Math.PI * 0.75; // 135° frontal

  for (let i = 0; i < MAX_ENEMIES; i++) {
    if (!enemies.active[i]) continue;
    const dx = enemies.x[i] - player.x;
    const dz = enemies.z[i] - player.z;
    const dist = Math.hypot(dx, dz);

    if (dist <= range) {
      const angleToEnemy = Math.atan2(dz, dx);
      const playerAngle = Math.atan2(player.dirZ, player.dirX);
      let diff = Math.abs(angleToEnemy - playerAngle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;

      if (diff <= arc / 2) {
        damageEnemy(i, dmg, 'asauchi');
      }
    }
  }
}

function executeByakurai(dmg) {
  let closestIdx = -1;
  let minDist = 999;

  for (let i = 0; i < MAX_ENEMIES; i++) {
    if (!enemies.active[i]) continue;
    const d = Math.hypot(enemies.x[i] - player.x, enemies.z[i] - player.z);
    if (d < minDist) {
      minDist = d;
      closestIdx = i;
    }
  }

  if (closestIdx !== -1) {
    // Atinge o alvo e qualquer outro na mesma linha reta
    const tx = enemies.x[closestIdx] - player.x;
    const tz = enemies.z[closestIdx] - player.z;
    const len = Math.hypot(tx, tz) || 1;
    const nx = tx / len;
    const nz = tz / len;

    for (let i = 0; i < MAX_ENEMIES; i++) {
      if (!enemies.active[i]) continue;
      const ex = enemies.x[i] - player.x;
      const ez = enemies.z[i] - player.z;
      const proj = ex * nx + ez * nz;
      if (proj > 0 && proj < 25) {
        const perp = Math.abs(ex * nz - ez * nx);
        if (perp < 1.5) {
          damageEnemy(i, dmg, 'byakurai');
        }
      }
    }
  }
}

function executeShakkaho(dmg) {
  // Dispara no aglomerado mais denso de Hollows
  let targetX = player.x + player.dirX * 8;
  let targetZ = player.z + player.dirZ * 8;

  const blastRadius = 5.0;
  for (let i = 0; i < MAX_ENEMIES; i++) {
    if (!enemies.active[i]) continue;
    const dist = Math.hypot(enemies.x[i] - targetX, enemies.z[i] - targetZ);
    if (dist <= blastRadius) {
      damageEnemy(i, dmg, 'shakkaho');
    }
  }
}

function damageEnemy(idx, dmg, weaponKey) {
  enemies.hp[idx] -= dmg;
  enemies.flash[idx] = 1.0; // Flash branco no shader
  state.damageDealt += dmg;
  state.weapons[weaponKey].totalDamage += dmg;

  if (enemies.hp[idx] <= 0) {
    killEnemy(idx);
  }
}

function killEnemy(idx) {
  enemies.active[idx] = 0;
  aPos[idx * 3 + 1] = -999; // Move para fora da visão
  state.kills++;

  const type = enemies.type[idx];
  state.census[type] = (state.census[type] || 0) + 1;

  // Drop de Reishi
  spawnReishi(enemies.x[idx], enemies.z[idx], enemies.isBoss[idx] ? 20 : 1);

  // Se derrotou o Chefe Menos Grande -> Fim de Jogo com Vitória
  if (enemies.isBoss[idx]) {
    state.bossDefeated = true;
    showGameOver(true);
  }
}

function spawnReishi(x, z, amount) {
  reishiDrops.push({ x, z, value: amount * 10 });
}

function updateReishiDrops(dt) {
  const magnetRadius = 3.5 * (1 + state.passives.magnet * 0.3);

  for (let i = reishiDrops.length - 1; i >= 0; i--) {
    const r = reishiDrops[i];
    const dx = player.x - r.x;
    const dz = player.z - r.z;
    const dist = Math.hypot(dx, dz);

    if (dist < magnetRadius) {
      r.x += (dx / dist) * 12 * dt;
      r.z += (dz / dist) * 12 * dt;

      if (dist < 0.8) {
        state.xp += r.value;
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

  // Escolhe 3 aleatórias
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
    state.weapons[opt.key].cooldown = Math.max(0.4, state.weapons[opt.key].cooldown * 0.88);
  } else {
    state.passives[opt.key]++;
  }

  document.getElementById('levelup-modal').classList.add('hidden');
  state.paused = false;
}

// Spawns
let spawnTimer = 0;
function updateSpawns(dt) {
  // Condição para Spawn do Chefe Menos Grande: Minuto 3 ou 80 kills
  if (!state.bossSpawned && (state.time >= 180 || state.kills >= 80)) {
    spawnBossMenosGrande();
    state.bossSpawned = true;
    return;
  }

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnTimer = Math.max(0.25, 1.2 - (state.time / 180) * 0.8);
    const waveSize = 1 + Math.floor(state.time / 45);
    for (let i = 0; i < waveSize; i++) {
      spawnHollow();
    }
  }
}

function spawnHollow() {
  const idx = findFreeEnemySlot();
  if (idx === -1) return;

  // Nascem nas bordas da arena
  const angle = Math.random() * Math.PI * 2;
  const dist = ARENA_RADIUS - 4.0;
  const x = Math.cos(angle) * dist;
  const z = Math.sin(angle) * dist;

  // Tipos de Hollows
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

  enemies.active[idx] = 1;
  enemies.x[idx] = x;
  enemies.y[idx] = 0;
  enemies.z[idx] = z;
  enemies.hp[idx] = hp;
  enemies.maxHp[idx] = hp;
  enemies.speed[idx] = spd;
  enemies.type[idx] = type;
  enemies.isBoss[idx] = 0;
  enemies.flash[idx] = 0;

  // Setup de UV e Tamanho
  const sp = window.spriteDefs[type];
  aSize[idx * 2] = 1.6;
  aSize[idx * 2 + 1] = 1.6;
  aUV[idx * 4] = sp.x / 512;
  aUV[idx * 4 + 1] = sp.y / 512;
  aUV[idx * 4 + 2] = (sp.x + sp.w) / 512;
  aUV[idx * 4 + 3] = (sp.y + sp.h) / 512;
  aFx[idx * 4 + 2] = 0.0; // Sem contorno para mobs comuns
}

function spawnBossMenosGrande() {
  const idx = findFreeEnemySlot();
  if (idx === -1) return;

  const angle = Math.random() * Math.PI * 2;
  const dist = 35.0;

  enemies.active[idx] = 1;
  enemies.x[idx] = Math.cos(angle) * dist;
  enemies.y[idx] = 0;
  enemies.z[idx] = Math.sin(angle) * dist;
  enemies.hp[idx] = 2500;
  enemies.maxHp[idx] = 2500;
  enemies.speed[idx] = 1.8;
  enemies.type[idx] = 'menos';
  enemies.isBoss[idx] = 1;
  enemies.flash[idx] = 0;

  const sp = window.spriteDefs.menos;
  aSize[idx * 2] = 5.2;     // Chefe Colossal (3.5x maior)
  aSize[idx * 2 + 1] = 5.2;
  aUV[idx * 4] = sp.x / 512;
  aUV[idx * 4 + 1] = sp.y / 512;
  aUV[idx * 4 + 2] = (sp.x + sp.w) / 512;
  aUV[idx * 4 + 3] = (sp.y + sp.h) / 512;
  aFx[idx * 4 + 2] = 2.5; // Contorno vermelho carmesim de Chefe no shader

  document.getElementById('boss-bar-container').classList.remove('hidden');
}

function findFreeEnemySlot() {
  for (let i = 0; i < MAX_ENEMIES; i++) {
    if (!enemies.active[i]) return i;
  }
  return -1;
}

function updateEnemies(dt) {
  for (let i = 0; i < MAX_ENEMIES; i++) {
    if (!enemies.active[i]) continue;

    // Perseguição do jogador
    const dx = player.x - enemies.x[i];
    const dz = player.z - enemies.z[i];
    const dist = Math.hypot(dx, dz);

    if (dist > 0.5) {
      enemies.x[i] += (dx / dist) * enemies.speed[i] * dt;
      enemies.z[i] += (dz / dist) * enemies.speed[i] * dt;
    }

    // Dano no Jogador por contato
    if (dist < 1.0 && player.invulnerableTime <= 0) {
      player.hp -= enemies.isBoss[i] ? 35 : 12;
      player.invulnerableTime = 0.6;
      if (player.hp <= 0) {
        player.hp = 0;
        showGameOver(false);
      }
    }

    // Flash de dano decai
    if (enemies.flash[i] > 0) {
      enemies.flash[i] -= dt * 6.0;
      if (enemies.flash[i] < 0) enemies.flash[i] = 0;
    }

    // Atualiza buffers de shader
    aPos[i * 3] = enemies.x[i];
    aPos[i * 3 + 1] = enemies.y[i];
    aPos[i * 3 + 2] = enemies.z[i];
    aFx[i * 4] = enemies.flash[i];
  }
}

function updateHUD() {
  // Barra de Vida
  const hpPercent = (player.hp / player.maxHp) * 100;
  document.getElementById('hp-bar-fill').style.width = hpPercent + '%';
  document.getElementById('hp-text').innerText = `${Math.ceil(player.hp)} / ${player.maxHp}`;

  // XP / Reishi
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
    for (let i = 0; i < MAX_ENEMIES; i++) {
      if (enemies.active[i] && enemies.isBoss[i]) {
        const bossHpPercent = (enemies.hp[i] / enemies.maxHp[i]) * 100;
        document.getElementById('boss-hp-fill').style.width = Math.max(0, bossHpPercent) + '%';
        break;
      }
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
    subtitle.innerText = 'O Menos Grande (Gillian) foi destruído e a invasão a Karakura foi contida!';
  } else {
    title.innerText = 'VOCÊ CAIU EM COMBATE';
    title.style.color = '#f56565';
    subtitle.innerText = 'Sua alma foi sobrepujada pela horda de Hollows.';
  }

  const mins = String(Math.floor(state.time / 60)).padStart(2, '0');
  const secs = String(Math.floor(state.time % 60)).padStart(2, '0');
  document.getElementById('stat-time').innerText = `${mins}:${secs}`;
  document.getElementById('stat-level').innerText = `Nv. ${state.level}`;
  document.getElementById('stat-kills').innerText = state.kills;
  document.getElementById('stat-damage').innerText = Math.round(state.damageDealt).toLocaleString('pt-BR');

  // Censo de Monstros
  const censusList = document.getElementById('enemies-census');
  censusList.innerHTML = `
    <li><span>Fishbone D:</span> <b>${state.census.fishbone}</b></li>
    <li><span>Shrieker:</span> <b>${state.census.shrieker}</b></li>
    <li><span>Acidwire:</span> <b>${state.census.acidwire}</b></li>
    <li><span>Menos Grande (Chefe):</span> <b>${state.census.menos > 0 ? '1 (PURIFICADO)' : '0'}</b></li>
  `;

  // Censo de Armas
  const weaponsList = document.getElementById('weapons-census');
  weaponsList.innerHTML = Object.values(state.weapons)
    .filter(w => w.level > 0)
    .map(w => `<li><span>${w.name} (Nv. ${w.level}):</span> <b>${Math.round(w.totalDamage).toLocaleString('pt-BR')} dano</b></li>`)
    .join('');

  modal.classList.remove('hidden');
}

function restartGame() {
  location.reload();
}
