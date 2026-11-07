// =======================================================================
// BLEACH: SOUL SURVIVOR - ESTÚDIO 360° DE SPRITES E APROVAÇÃO
// =======================================================================
// Este módulo gerencia o viewport Three.js do Estúdio de Validação Visual:
// - Rotação orbital livre em 360° (mouse drag ou slider)
// - Ciclo de passos (Walk Cycle 4x4) com controle de FPS
// - Comparação lado a lado (A vs B)
// - Aprovação e instalação automática em src/assets/ e src/characters.js
// =======================================================================

import * as THREE from 'three';

// Estado do Estúdio
const studioState = {
  activeCharacter: 'ichigo_shikai_w8',
  charactersData: {},
  manifest: null,
  yaw: 0,            // Rotação horizontal em radianos
  pitch: 0.42,       // Inclinação vertical (estilo PokéBonk)
  dist: 8.5,         // Distância da câmera
  autoOrbit: false,
  isAnimating: true,
  fps: 10,
  animTimer: 0,
  currentFrame: 1,
  worldScale: 2.2,
  compareMode: false,
  isDragging: false,
  lastMouseX: 0,
  lastMouseY: 0
};

// Three.js Globais
let scene, camera, renderer, clock;
let primaryMesh, compareMesh, groundMesh, shadowMesh, compareShadowMesh;
const textureCache = {};

window.addEventListener('DOMContentLoaded', initStudio);

async function initStudio() {
  const canvas = document.getElementById('studio-canvas');

  // 1. Configurar Cena Three.js
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0d14);

  clock = new THREE.Clock();

  // 2. Câmera Perspectiva (Fiel ao PokéBonk: FOV 70°)
  camera = new THREE.PerspectiveCamera(70, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  updateCameraPos();

  // 3. Renderizador WebGL
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 4. Luzes
  const ambLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambLight);
  const dirLight = new THREE.DirectionalLight(0xa5c4f5, 1.0);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  // 5. Cenário do Estúdio (Chão com Grid & Marcadores Cardeais)
  createStudioEnvironment();

  // 6. Carregar Dados de Staging da API
  await fetchStagingCharacters();

  // 7. Criar Malha do Personagem
  createCharacterMeshes();

  // 8. Configurar Event Listeners da UI
  setupUIEventListeners(canvas);

  // 9. Atualizar Inspeção Inicial
  updateInspectionPanel();

  // 10. Loop de Renderização
  requestAnimationFrame(studioLoop);
}

// -----------------------------------------------------------------------
// CENÁRIO DO ESTÚDIO: CHÃO COM GRID E MARCADORES DE DIREÇÃO
// -----------------------------------------------------------------------
function createStudioEnvironment() {
  // Solo com anéis concêntricos e grid
  const groundGeo = new THREE.PlaneGeometry(16, 16);
  groundGeo.rotateX(-Math.PI / 2);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111624';
  ctx.fillRect(0, 0, 512, 512);

  // Grid sutil
  ctx.strokeStyle = '#1c2638';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0); ctx.lineTo(i, 512);
    ctx.moveTo(0, i); ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Círculo indicador central
  ctx.strokeStyle = '#2b4168';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(256, 256, 140, 0, Math.PI * 2);
  ctx.stroke();

  // Marcadores de Direção no chão
  ctx.fillStyle = '#63b3ed';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FRENTE (SUL)', 256, 470);
  ctx.fillText('COSTAS (NORTE)', 256, 42);
  ctx.fillText('LESTE', 460, 260);
  ctx.fillText('OESTE', 50, 260);

  const groundTex = new THREE.CanvasTexture(canvas);
  groundTex.colorSpace = THREE.SRGBColorSpace;
  const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.8 });
  groundMesh = new THREE.Mesh(groundGeo, groundMat);
  scene.add(groundMesh);

  // Sombra suave sob os pés
  const shadowGeo = new THREE.CircleGeometry(0.7, 32);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 });
  shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.position.y = 0.02;
  scene.add(shadowMesh);

  // Sombra para modo comparativo
  compareShadowMesh = new THREE.Mesh(shadowGeo.clone(), shadowMat.clone());
  compareShadowMesh.position.set(-1.8, 0.02, 0);
  compareShadowMesh.visible = false;
  scene.add(compareShadowMesh);
}

// -----------------------------------------------------------------------
// CARREGAMENTO DE TEXTURAS E MANIFESTOS DE STAGING
// -----------------------------------------------------------------------
async function fetchStagingCharacters() {
  try {
    const res = await fetch('/api/staging/list');
    const data = await res.json();
    for (const char of data.characters) {
      studioState.charactersData[char.id] = char;
    }
  } catch (err) {
    console.warn('API de staging não acessível, usando manifestos locais:', err);
    // Fallback padrão
    studioState.charactersData['ichigo_shikai'] = {
      id: 'ichigo_shikai',
      name: 'Ichigo Shikai (Walk 4x4)',
      format: 'walk4x4',
      frameCount: 4,
      targetSize: 128
    };
    studioState.charactersData['ichigo_chibi'] = {
      id: 'ichigo_chibi',
      name: 'Ichigo Chibi (Ref)',
      format: 'single_front',
      frameCount: 1,
      targetSize: 128
    };
  }

  studioState.manifest = studioState.charactersData[studioState.activeCharacter];
  const selectChar = document.getElementById('select-character');
  if (selectChar) {
    selectChar.value = studioState.activeCharacter;
  }
}

function loadTexture(url) {
  if (textureCache[url]) return textureCache[url];

  const tex = new THREE.TextureLoader().load(url);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache[url] = tex;
  return tex;
}

// -----------------------------------------------------------------------
// CRIAÇÃO E ATUALIZAÇÃO DAS MALHAS (BILLBOARDS 2.5D)
// -----------------------------------------------------------------------
function createCharacterMeshes() {
  const geo = new THREE.PlaneGeometry(1.0, 1.0);
  geo.translate(0, 0.5, 0); // Ancorado na base dos pés

  const matPrimary = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  primaryMesh = new THREE.Mesh(geo, matPrimary);
  primaryMesh.scale.set(studioState.worldScale, studioState.worldScale, 1.0);
  scene.add(primaryMesh);

  // Malha comparativa B
  const matCompare = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  compareMesh = new THREE.Mesh(geo.clone(), matCompare);
  compareMesh.scale.set(studioState.worldScale, studioState.worldScale, 1.0);
  compareMesh.position.set(-1.8, 0, 0);
  compareMesh.visible = false;
  scene.add(compareMesh);

  updateMeshTextures();
}

function updateMeshTextures() {
  const charId = studioState.activeCharacter;
  const manifest = studioState.charactersData[charId] || { format: 'walk8', frameCount: 8 };
  studioState.manifest = manifest;

  // Determinar a direção com base no ângulo da câmera
  const dir = getDirectionFromYaw(studioState.yaw);

  // Textura do personagem ativo
  let primaryUrl = '';
  const isAnimated = manifest.format === 'walk8' || manifest.format === 'walk4x4';
  if (isAnimated) {
    const totalFrames = manifest.frameCount || (manifest.format === 'walk8' ? 8 : 4);
    const fIdx = studioState.currentFrame % totalFrames;
    primaryUrl = `/geradores/staging/${charId}/${dir}_${fIdx}.png`;
  } else {
    primaryUrl = `/geradores/staging/${charId}/${dir}.png`;
  }

  const tex = loadTexture(primaryUrl);
  if (primaryMesh.material.map !== tex) {
    primaryMesh.material.map = tex;
    primaryMesh.material.needsUpdate = true;
  }

  // Se modo comparativo estiver ativo
  if (studioState.compareMode) {
    const compId = (charId === 'ichigo_shikai_w8' || charId === 'ichigo_shikai') ? 'ichigo_shikai_4f' : 'ichigo_shikai_w8';
    const compManifest = studioState.charactersData[compId] || { format: 'walk4x4', frameCount: 4 };

    let compUrl = '';
    const compAnimated = compManifest.format === 'walk8' || compManifest.format === 'walk4x4';
    if (compAnimated) {
      const totalFrames = compManifest.frameCount || (compManifest.format === 'walk8' ? 8 : 4);
      const fIdx = studioState.currentFrame % totalFrames;
      compUrl = `/geradores/staging/${compId}/${dir}_${fIdx}.png`;
    } else {
      compUrl = `/geradores/staging/${compId}/${dir}.png`;
    }

    const compTex = loadTexture(compUrl);
    if (compareMesh.material.map !== compTex) {
      compareMesh.material.map = compTex;
      compareMesh.material.needsUpdate = true;
    }
  }
}

// -----------------------------------------------------------------------
// CÁLCULO DE DIREÇÃO DA CÂMERA (FRENTE, COSTAS, LADOS)
// -----------------------------------------------------------------------
// O personagem fica parado no centro olhando para o norte (0, -1).
// Quando a câmera orbita:
// 0°   (Norte)  -> Câmera atrás do personagem  -> Mostra COSTAS (back)
// 90°  (Leste)  -> Câmera à direita           -> Mostra PERFIL DIREITO (side)
// 180° (Sul)    -> Câmera de frente           -> Mostra FRENTE (front)
// 270° (Oeste)  -> Câmera à esquerda          -> Mostra PERFIL ESQUERDO (side_l)
function getDirectionFromYaw(yawRad) {
  // Normalizar para [0, 2PI)
  let angle = yawRad % (Math.PI * 2);
  if (angle < 0) angle += Math.PI * 2;

  // Setores de 90° centrados
  if (angle >= Math.PI * 1.75 || angle < Math.PI * 0.25) {
    return 'back';   // Costas
  } else if (angle >= Math.PI * 0.25 && angle < Math.PI * 0.75) {
    return 'side';   // Lado Direito
  } else if (angle >= Math.PI * 0.75 && angle < Math.PI * 1.25) {
    return 'front';  // Frente
  } else {
    return 'side_l'; // Lado Esquerdo
  }
}

function getDirectionLabel(dir) {
  const map = {
    back: 'COSTAS (BACK)',
    side: 'PERFIL DIREITO (SIDE RIGHT)',
    front: 'FRENTE (FRONT)',
    side_l: 'PERFIL ESQUERDO (SIDE LEFT)'
  };
  return map[dir] || dir.toUpperCase();
}

// -----------------------------------------------------------------------
// LOOP PRINCIPAL DO ESTÚDIO
// -----------------------------------------------------------------------
function studioLoop() {
  requestAnimationFrame(studioLoop);

  const dt = clock.getDelta();

  // 1. Giro automático se ativado
  if (studioState.autoOrbit) {
    studioState.yaw += dt * 0.6;
    if (studioState.yaw > Math.PI * 2) studioState.yaw -= Math.PI * 2;
    document.getElementById('slider-yaw').value = Math.round(THREE.MathUtils.radToDeg(studioState.yaw));
    document.getElementById('label-yaw').innerText = `${Math.round(THREE.MathUtils.radToDeg(studioState.yaw))}°`;
    updateCameraPos();
  }

  // 2. Animação de caminhada (Walk Cycle 8 frames ou 4 frames)
  const isAnimated = studioState.manifest?.format === 'walk8' || studioState.manifest?.format === 'walk4x4';
  const totalFrames = studioState.manifest?.frameCount || (studioState.manifest?.format === 'walk8' ? 8 : 4);

  if (studioState.isAnimating && isAnimated) {
    studioState.animTimer += dt;
    const interval = 1.0 / studioState.fps;
    if (studioState.animTimer >= interval) {
      studioState.animTimer = 0;
      studioState.currentFrame = (studioState.currentFrame + 1) % totalFrames;
      document.getElementById('info-frame').innerText = `${studioState.currentFrame + 1} / ${totalFrames}`;
    }
  }

  // 3. Atualizar Texturas conforme a rotação e animação
  updateMeshTextures();

  // 4. Billboard: Encarar a rotação da câmera (Idêntico ao jogo principal)
  primaryMesh.quaternion.copy(camera.quaternion);
  if (studioState.compareMode) {
    compareMesh.quaternion.copy(camera.quaternion);
  }

  // 5. Atualizar painel de diagnóstico
  updateInspectionPanel();

  // 6. Renderizar
  renderer.render(scene, camera);
}

function updateCameraPos() {
  const h = Math.cos(studioState.pitch);
  const g = Math.sin(studioState.pitch);
  const dist = studioState.dist;

  const camX = Math.sin(studioState.yaw) * h * dist;
  const camY = g * dist + 0.5;
  const camZ = Math.cos(studioState.yaw) * h * dist;

  camera.position.set(camX, camY, camZ);
  camera.lookAt(0, 1.1, 0);
}

function updateInspectionPanel() {
  const dir = getDirectionFromYaw(studioState.yaw);
  const deg = (THREE.MathUtils.radToDeg(studioState.yaw) % 360).toFixed(1);

  document.getElementById('info-dir').innerText = dir;
  document.getElementById('info-angle').innerText = `${deg}°`;
  document.getElementById('indicator-text').innerText = getDirectionLabel(dir);

  const manifest = studioState.manifest;
  if (manifest) {
    document.getElementById('info-format').innerText = manifest.format || 'walk4x4';
    document.getElementById('info-res').innerText = `${manifest.targetSize || 128}x${manifest.targetSize || 128} px`;
  }
}

// -----------------------------------------------------------------------
// EVENT LISTENERS DE CONTROLE (UI E MOUSE)
// -----------------------------------------------------------------------
function setupUIEventListeners(canvas) {
  // 1. Seletor de Personagem
  const selectChar = document.getElementById('select-character');
  selectChar.addEventListener('change', (e) => {
    studioState.activeCharacter = e.target.value;
    studioState.currentFrame = 1;
    studioState.manifest = studioState.charactersData[studioState.activeCharacter];
    document.getElementById('info-frame').innerText = `${studioState.currentFrame + 1} / ${studioState.manifest?.frameCount || 1}`;
  });

  // 2. Modo Comparativo Lado a Lado
  const toggleCompare = document.getElementById('toggle-compare');
  toggleCompare.addEventListener('change', (e) => {
    studioState.compareMode = e.target.checked;
    compareMesh.visible = e.target.checked;
    compareShadowMesh.visible = e.target.checked;
    primaryMesh.position.x = e.target.checked ? 1.8 : 0;
    shadowMesh.position.x = e.target.checked ? 1.8 : 0;
  });

  // 3. Slider de Rotação 360°
  const sliderYaw = document.getElementById('slider-yaw');
  sliderYaw.addEventListener('input', (e) => {
    studioState.yaw = THREE.MathUtils.degToRad(parseFloat(e.target.value));
    document.getElementById('label-yaw').innerText = `${e.target.value}°`;
    updateCameraPos();
  });

  // 4. Botões de Ângulo Rápido
  document.querySelectorAll('.angle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const deg = parseFloat(btn.dataset.angle);
      studioState.yaw = THREE.MathUtils.degToRad(deg);
      sliderYaw.value = deg;
      document.getElementById('label-yaw').innerText = `${deg}°`;
      studioState.autoOrbit = false;
      document.getElementById('btn-auto-orbit').innerText = '▶ Iniciar Giro Automático 360°';
      updateCameraPos();
    });
  });

  // 5. Botão Auto-Orbit
  const btnAuto = document.getElementById('btn-auto-orbit');
  btnAuto.addEventListener('click', () => {
    studioState.autoOrbit = !studioState.autoOrbit;
    btnAuto.innerText = studioState.autoOrbit ? '⏸ Pausar Giro Automático' : '▶ Iniciar Giro Automático 360°';
  });

  // 6. Controles de Animação
  const btnAnim = document.getElementById('btn-toggle-anim');
  btnAnim.addEventListener('click', () => {
    studioState.isAnimating = !studioState.isAnimating;
    btnAnim.innerText = studioState.isAnimating ? '⏸ Pausar Passo' : '▶ Retomar Passo';
  });

  const btnStep = document.getElementById('btn-step-frame');
  btnStep.addEventListener('click', () => {
    studioState.isAnimating = false;
    btnAnim.innerText = '▶ Retomar Passo';
    const totalFrames = studioState.manifest?.frameCount || (studioState.manifest?.format === 'walk8' ? 8 : 4);
    studioState.currentFrame = (studioState.currentFrame + 1) % totalFrames;
    document.getElementById('info-frame').innerText = `${studioState.currentFrame + 1} / ${totalFrames}`;
  });

  const sliderFps = document.getElementById('slider-fps');
  sliderFps.addEventListener('input', (e) => {
    studioState.fps = parseInt(e.target.value);
    document.getElementById('label-fps').innerText = `${studioState.fps} FPS`;
  });

  // 7. Escala Mundial
  const sliderScale = document.getElementById('slider-scale');
  sliderScale.addEventListener('input', (e) => {
    studioState.worldScale = parseFloat(e.target.value);
    document.getElementById('label-scale').innerText = `${studioState.worldScale}x`;
    primaryMesh.scale.set(studioState.worldScale, studioState.worldScale, 1.0);
    compareMesh.scale.set(studioState.worldScale, studioState.worldScale, 1.0);
  });

  // 8. Toggles de Solo e Sombra
  document.getElementById('toggle-shadow').addEventListener('change', (e) => {
    shadowMesh.visible = e.target.checked;
    if (studioState.compareMode) compareShadowMesh.visible = e.target.checked;
  });

  document.getElementById('toggle-grid').addEventListener('change', (e) => {
    groundMesh.visible = e.target.checked;
  });

  // 9. Arraste do Mouse no Canvas (Orbital Look)
  canvas.addEventListener('mousedown', (e) => {
    studioState.isDragging = true;
    studioState.lastMouseX = e.clientX;
    studioState.lastMouseY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    studioState.isDragging = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (!studioState.isDragging) return;

    const dx = e.clientX - studioState.lastMouseX;
    const dy = e.clientY - studioState.lastMouseY;
    studioState.lastMouseX = e.clientX;
    studioState.lastMouseY = e.clientY;

    studioState.yaw -= dx * 0.008;
    studioState.pitch += dy * 0.006;
    studioState.pitch = Math.max(0.15, Math.min(1.2, studioState.pitch));

    let deg = Math.round(THREE.MathUtils.radToDeg(studioState.yaw)) % 360;
    if (deg < 0) deg += 360;
    sliderYaw.value = deg;
    document.getElementById('label-yaw').innerText = `${deg}°`;

    updateCameraPos();
  });

  // Zoom com a roda do mouse
  canvas.addEventListener('wheel', (e) => {
    studioState.dist = Math.max(4.0, Math.min(18.0, studioState.dist + Math.sign(e.deltaY) * 0.8));
    updateCameraPos();
  }, { passive: true });

  // 10. Ação de Aprovação (Passo 3)
  const btnApprove = document.getElementById('btn-approve');
  const feedback = document.getElementById('approve-feedback');

  btnApprove.addEventListener('click', async () => {
    const charId = studioState.activeCharacter;
    btnApprove.disabled = true;
    btnApprove.innerText = 'Instalando no jogo...';

    try {
      const res = await fetch('/api/staging/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: charId, category: 'characters' })
      });

      const result = await res.json();
      if (result.success) {
        feedback.className = 'feedback-msg';
        feedback.innerHTML = `<b>✓ Aprovado com sucesso!</b><br>Instalado em <code>src/assets/characters/${charId}</code> e registrado em <code>src/characters.js</code>. O personagem agora está pronto para uso oficial!`;
        document.getElementById('info-status').innerText = 'INSTALADO OFICIAL';
        document.getElementById('info-status').className = 'status-installed';
      } else {
        feedback.className = 'feedback-msg';
        feedback.style.background = '#742a2a';
        feedback.innerText = `Erro ao aprovar: ${result.error}`;
      }
    } catch (err) {
      feedback.className = 'feedback-msg';
      feedback.style.background = '#742a2a';
      feedback.innerText = `Erro de conexão: ${err.message}`;
    } finally {
      btnApprove.disabled = false;
      btnApprove.innerText = '✓ APROVADO & ATUALIZADO';
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  });
}
