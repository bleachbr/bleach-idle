// =======================================================================
// BLEACH: SOUL SURVIVOR - ATLAS DE SPRITES PROCEDURAIS EM PIXEL ART
// =======================================================================
// Este módulo gera o spritesheet em tempo de execução via HTML5 Canvas 2D.
// Ele produz texturas para todos os personagens e monstros em 4 DIREÇÕES:
// - front:  Visão frontal (olhando em direção à câmera)
// - back:   Visão traseira (olhando para o horizonte / costas para a câmera)
// - side:   Perfil direito (olhando 90° para a direita da câmera)
// - side_l: Perfil esquerdo (olhando 90° para a esquerda da câmera / espelhado)
//
// CONCEITO DO POKÉBONK (BILLBOARD 2.5D):
// Em jogos Survivor 3D com sprites 2D, as malhas (THREE.Mesh) sempre encaram a câmera
// (billboard). Para dar a ilusão de tridimensionalidade total em 360°, o jogo calcula
// a projeção do vetor de movimento/visão de cada entidade contra os eixos da câmera
// e seleciona a fatia do atlas correspondente ('front', 'back', 'side' ou 'side_l').
// =======================================================================

export function createSpritesheet() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Mapa de coordenadas dos sprites no atlas (512x512)
  const sprites = {
    // 1. Recruta Shinigami (Y: 0..64)
    player_front:  { x: 0,   y: 0, w: 64, h: 64 },
    player_back:   { x: 64,  y: 0, w: 64, h: 64 },
    player_side:   { x: 128, y: 0, w: 64, h: 64 },
    player_side_l: { x: 192, y: 0, w: 64, h: 64 },

    // 2. Hollow Fishbone D (Y: 64..128)
    fishbone_front:  { x: 0,   y: 64, w: 64, h: 64 },
    fishbone_back:   { x: 64,  y: 64, w: 64, h: 64 },
    fishbone_side:   { x: 128, y: 64, w: 64, h: 64 },
    fishbone_side_l: { x: 192, y: 64, w: 64, h: 64 },

    // 3. Hollow Shrieker (Y: 128..192) - Morcego alado
    shrieker_front:  { x: 0,   y: 128, w: 64, h: 64 },
    shrieker_back:   { x: 64,  y: 128, w: 64, h: 64 },
    shrieker_side:   { x: 128, y: 128, w: 64, h: 64 },
    shrieker_side_l: { x: 192, y: 128, w: 64, h: 64 },

    // 4. Hollow Acidwire (Y: 192..256) - Serpente/humanoide ácido
    acidwire_front:  { x: 0,   y: 192, w: 64, h: 64 },
    acidwire_back:   { x: 64,  y: 192, w: 64, h: 64 },
    acidwire_side:   { x: 128, y: 192, w: 64, h: 64 },
    acidwire_side_l: { x: 192, y: 192, w: 64, h: 64 },

    // 5. Chefe Menos Grande / Gillian (Y: 256..384, tamanho 128x128)
    menos_front:  { x: 0,   y: 256, w: 128, h: 128 },
    menos_back:   { x: 128, y: 256, w: 128, h: 128 },
    menos_side:   { x: 256, y: 256, w: 128, h: 128 },
    menos_side_l: { x: 384, y: 256, w: 128, h: 128 },

    // 6. Orbe de Reishi / XP (X: 256, Y: 0, tamanho 32x32)
    reishi: { x: 256, y: 0, w: 32, h: 32 }
  };

  // Aliases para retrocompatibilidade
  sprites.player   = sprites.player_back;
  sprites.fishbone = sprites.fishbone_front;
  sprites.shrieker = sprites.shrieker_front;
  sprites.acidwire = sprites.acidwire_front;
  sprites.menos    = sprites.menos_front;

  // ---------------------------------------------------------------------
  // 1. DESENHO DO RECRUTA SHINIGAMI (4 DIREÇÕES)
  // ---------------------------------------------------------------------
  const playerProps = {
    bodyColor: '#121317',    // Quimono preto (Shihakusho)
    collarColor: '#ffffff',  // Gola interna branca / Obi
    skinColor: '#f7d0a1',    // Pele
    hairColor: '#e07a30',    // Cabelo alaranjado
    swordColor: '#e2e8f0',   // Lâmina de aço da Asauchi
    size: 64
  };
  drawPlayerFront(ctx, sprites.player_front.x, sprites.player_front.y, playerProps);
  drawPlayerBack(ctx, sprites.player_back.x, sprites.player_back.y, playerProps);
  drawPlayerSide(ctx, sprites.player_side.x, sprites.player_side.y, playerProps, false);
  drawPlayerSide(ctx, sprites.player_side_l.x, sprites.player_side_l.y, playerProps, true);

  // ---------------------------------------------------------------------
  // 2. DESENHO DO HOLLOW FISHBONE D (4 DIREÇÕES)
  // ---------------------------------------------------------------------
  const fishboneProps = {
    bodyColor: '#2d3748',
    maskColor: '#ffffff',
    eyeColor: '#e53e3e',
    accentColor: '#4a5568',
    horns: true,
    size: 64
  };
  drawHollowFront(ctx, sprites.fishbone_front.x, sprites.fishbone_front.y, fishboneProps);
  drawHollowBack(ctx, sprites.fishbone_back.x, sprites.fishbone_back.y, fishboneProps);
  drawHollowSide(ctx, sprites.fishbone_side.x, sprites.fishbone_side.y, fishboneProps, false);
  drawHollowSide(ctx, sprites.fishbone_side_l.x, sprites.fishbone_side_l.y, fishboneProps, true);

  // ---------------------------------------------------------------------
  // 3. DESENHO DO HOLLOW SHRIEKER (4 DIREÇÕES COM ASAS)
  // ---------------------------------------------------------------------
  const shriekerProps = {
    bodyColor: '#1a202c',
    maskColor: '#ffffff',
    eyeColor: '#dd6b20',
    accentColor: '#3182ce',
    wings: true,
    size: 64
  };
  drawHollowFront(ctx, sprites.shrieker_front.x, sprites.shrieker_front.y, shriekerProps);
  drawHollowBack(ctx, sprites.shrieker_back.x, sprites.shrieker_back.y, shriekerProps);
  drawHollowSide(ctx, sprites.shrieker_side.x, sprites.shrieker_side.y, shriekerProps, false);
  drawHollowSide(ctx, sprites.shrieker_side_l.x, sprites.shrieker_side_l.y, shriekerProps, true);

  // ---------------------------------------------------------------------
  // 4. DESENHO DO HOLLOW ACIDWIRE (4 DIREÇÕES SERPENTINAS)
  // ---------------------------------------------------------------------
  const acidwireProps = {
    bodyColor: '#1c4532',
    maskColor: '#ffffff',
    eyeColor: '#9ae6b4',
    accentColor: '#2f855a',
    serpent: true,
    size: 64
  };
  drawHollowFront(ctx, sprites.acidwire_front.x, sprites.acidwire_front.y, acidwireProps);
  drawHollowBack(ctx, sprites.acidwire_back.x, sprites.acidwire_back.y, acidwireProps);
  drawHollowSide(ctx, sprites.acidwire_side.x, sprites.acidwire_side.y, acidwireProps, false);
  drawHollowSide(ctx, sprites.acidwire_side_l.x, sprites.acidwire_side_l.y, acidwireProps, true);

  // ---------------------------------------------------------------------
  // 5. DESENHO DO CHEFE MENOS GRANDE (GILLIAN - 4 DIREÇÕES 128x128)
  // ---------------------------------------------------------------------
  drawMenosFront(ctx, sprites.menos_front.x, sprites.menos_front.y, 128);
  drawMenosBack(ctx, sprites.menos_back.x, sprites.menos_back.y, 128);
  drawMenosSide(ctx, sprites.menos_side.x, sprites.menos_side.y, 128, false);
  drawMenosSide(ctx, sprites.menos_side_l.x, sprites.menos_side_l.y, 128, true);

  // ---------------------------------------------------------------------
  // 6. DESENHO DO ORBE DE REISHI
  // ---------------------------------------------------------------------
  drawReishiOrb(ctx, sprites.reishi.x, sprites.reishi.y, 32);

  return { canvas, sprites };
}

// =======================================================================
// ROTINAS DE DESENHO DE PIXEL ART - SHINIGAMI
// =======================================================================

function drawPlayerFront(ctx, ox, oy, p) {
  // Corpo / Shihakusho
  ctx.fillStyle = p.bodyColor;
  ctx.fillRect(ox + 20, oy + 26, 24, 28);
  // Faixa branca central (Gola cruzada)
  ctx.fillStyle = p.collarColor;
  ctx.fillRect(ox + 28, oy + 26, 8, 14);
  ctx.fillRect(ox + 22, oy + 38, 20, 4);

  // Cabeça e Rosto
  ctx.fillStyle = p.skinColor;
  ctx.fillRect(ox + 24, oy + 12, 16, 14);

  // Cabelo
  ctx.fillStyle = p.hairColor;
  ctx.fillRect(ox + 22, oy + 8, 20, 8);
  ctx.fillRect(ox + 20, oy + 12, 4, 8);

  // Olhos
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(ox + 27, oy + 18, 3, 3);
  ctx.fillRect(ox + 34, oy + 18, 3, 3);

  // Katana (na mão direita do personagem)
  ctx.fillStyle = p.swordColor;
  ctx.fillRect(ox + 46, oy + 12, 3, 32);
  ctx.fillStyle = '#718096';
  ctx.fillRect(ox + 44, oy + 36, 7, 3);
  ctx.fillStyle = '#1a202c';
  ctx.fillRect(ox + 46, oy + 39, 3, 8);

  // Pés com sandálias Waraji
  ctx.fillStyle = '#f7fafc';
  ctx.fillRect(ox + 22, oy + 54, 8, 6);
  ctx.fillRect(ox + 34, oy + 54, 8, 6);
}

function drawPlayerBack(ctx, ox, oy, p) {
  // Corpo / Shihakusho traseiro com fita branca amarrada
  ctx.fillStyle = p.bodyColor;
  ctx.fillRect(ox + 20, oy + 26, 24, 28);
  ctx.fillStyle = p.collarColor;
  ctx.fillRect(ox + 22, oy + 38, 20, 4);
  ctx.fillRect(ox + 29, oy + 36, 6, 8); // Nó do Obi

  // Cabeça (cabelo cobre toda a parte de trás)
  ctx.fillStyle = p.hairColor;
  ctx.fillRect(ox + 22, oy + 8, 20, 18);
  ctx.fillRect(ox + 20, oy + 12, 4, 12);
  ctx.fillRect(ox + 40, oy + 12, 4, 12);

  // Katana na bainha / costas
  ctx.fillStyle = p.swordColor;
  ctx.fillRect(ox + 16, oy + 10, 3, 34);
  ctx.fillStyle = '#718096';
  ctx.fillRect(ox + 14, oy + 36, 7, 3);
  ctx.fillStyle = '#1a202c';
  ctx.fillRect(ox + 16, oy + 39, 3, 8);

  // Pés
  ctx.fillStyle = '#f7fafc';
  ctx.fillRect(ox + 22, oy + 54, 8, 6);
  ctx.fillRect(ox + 34, oy + 54, 8, 6);
}

function drawPlayerSide(ctx, ox, oy, p, flip) {
  ctx.save();
  if (flip) {
    ctx.translate(ox + 64, oy);
    ctx.scale(-1, 1);
    ox = 0;
    oy = 0;
  }

  // Corpo / Perfil Shihakusho
  ctx.fillStyle = p.bodyColor;
  ctx.fillRect(ox + 24, oy + 26, 18, 28);
  ctx.fillStyle = p.collarColor;
  ctx.fillRect(ox + 26, oy + 38, 14, 4);

  // Cabeça e Nariz
  ctx.fillStyle = p.skinColor;
  ctx.fillRect(ox + 26, oy + 12, 14, 14);
  ctx.fillRect(ox + 40, oy + 18, 3, 3);

  // Cabelo de perfil
  ctx.fillStyle = p.hairColor;
  ctx.fillRect(ox + 22, oy + 8, 18, 10);
  ctx.fillRect(ox + 20, oy + 14, 6, 12);

  // Olho de perfil
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(ox + 34, oy + 17, 3, 3);

  // Braço empunhando a Katana para a frente
  ctx.fillStyle = p.bodyColor;
  ctx.fillRect(ox + 32, oy + 30, 10, 6);
  ctx.fillStyle = p.swordColor;
  ctx.fillRect(ox + 42, oy + 8, 3, 34);
  ctx.fillStyle = '#718096';
  ctx.fillRect(ox + 40, oy + 34, 7, 3);

  // Pés
  ctx.fillStyle = '#f7fafc';
  ctx.fillRect(ox + 22, oy + 54, 8, 6);
  ctx.fillRect(ox + 32, oy + 54, 8, 6);

  ctx.restore();
}

// =======================================================================
// ROTINAS DE DESENHO DE PIXEL ART - HOLLOWS (FISHBONE, SHRIEKER, ACIDWIRE)
// =======================================================================

function drawHollowFront(ctx, ox, oy, p) {
  // Corpo sombrio
  ctx.fillStyle = p.bodyColor;
  ctx.fillRect(ox + 16, oy + 22, 32, 28);

  // Asas caso seja Shrieker
  if (p.wings) {
    ctx.fillStyle = p.accentColor;
    ctx.fillRect(ox + 4, oy + 16, 12, 22);
    ctx.fillRect(ox + 48, oy + 16, 12, 22);
  }

  // Cauda serpentina caso seja Acidwire
  if (p.serpent) {
    ctx.fillStyle = p.accentColor;
    ctx.fillRect(ox + 28, oy + 48, 8, 12);
  }

  // Máscara Branca de Hollow (Crânio)
  ctx.fillStyle = p.maskColor;
  ctx.fillRect(ox + 20, oy + 10, 24, 20);

  // Chifres
  if (p.horns) {
    ctx.fillStyle = p.maskColor;
    ctx.fillRect(ox + 18, oy + 4, 6, 8);
    ctx.fillRect(ox + 40, oy + 4, 6, 8);
  }

  // Olhos brilhantes da máscara
  ctx.fillStyle = p.eyeColor;
  ctx.fillRect(ox + 24, oy + 16, 5, 5);
  ctx.fillRect(ox + 35, oy + 16, 5, 5);

  // Dentes / Boca serrilhada
  ctx.fillStyle = '#1a202c';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(ox + 24 + i * 4, oy + 25, 2, 4);
  }

  // Garras dianteiras
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(ox + 18, oy + 50, 8, 6);
  ctx.fillRect(ox + 38, oy + 50, 8, 6);
}

function drawHollowBack(ctx, ox, oy, p) {
  // Corpo traseiro
  ctx.fillStyle = p.bodyColor;
  ctx.fillRect(ox + 16, oy + 22, 32, 28);

  // Asas vistas de trás
  if (p.wings) {
    ctx.fillStyle = p.accentColor;
    ctx.fillRect(ox + 4, oy + 16, 12, 22);
    ctx.fillRect(ox + 48, oy + 16, 12, 22);
  }

  // Costas da cabeça
  ctx.fillStyle = '#374151';
  ctx.fillRect(ox + 20, oy + 10, 24, 20);

  // Chifres vistos de trás
  if (p.horns) {
    ctx.fillStyle = p.maskColor;
    ctx.fillRect(ox + 18, oy + 4, 6, 8);
    ctx.fillRect(ox + 40, oy + 4, 6, 8);
  }

  // Coluna vertebral ossuda branca nas costas (icônico em Hollows)
  ctx.fillStyle = p.maskColor;
  for (let y = 0; y < 5; y++) {
    ctx.fillRect(ox + 30, oy + 24 + y * 5, 4, 3);
  }

  // Pés traseiros
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(ox + 18, oy + 50, 8, 6);
  ctx.fillRect(ox + 38, oy + 50, 8, 6);
}

function drawHollowSide(ctx, ox, oy, p, flip) {
  ctx.save();
  if (flip) {
    ctx.translate(ox + 64, oy);
    ctx.scale(-1, 1);
    ox = 0;
    oy = 0;
  }

  // Corpo de perfil curvado
  ctx.fillStyle = p.bodyColor;
  ctx.fillRect(ox + 20, oy + 22, 26, 28);

  // Asa única de perfil
  if (p.wings) {
    ctx.fillStyle = p.accentColor;
    ctx.fillRect(ox + 14, oy + 14, 10, 24);
  }

  // Máscara de perfil com mandíbula projetada para a frente
  ctx.fillStyle = p.maskColor;
  ctx.fillRect(ox + 24, oy + 10, 20, 20);
  ctx.fillRect(ox + 42, oy + 18, 6, 12); // Focinho/queixo pontudo projetado

  // Chifre de perfil
  if (p.horns) {
    ctx.fillRect(ox + 28, oy + 4, 8, 8);
  }

  // Olho lateral
  ctx.fillStyle = p.eyeColor;
  ctx.fillRect(ox + 34, oy + 16, 5, 5);

  // Garras estendidas atacando para a frente
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(ox + 36, oy + 34, 12, 5);
  ctx.fillRect(ox + 24, oy + 50, 8, 6);
  ctx.fillRect(ox + 34, oy + 50, 8, 6);

  ctx.restore();
}

// =======================================================================
// ROTINAS DE DESENHO DO CHEFE MENOS GRANDE (GILLIAN - 128x128)
// =======================================================================

function drawMenosFront(ctx, ox, oy, s) {
  // Manto cônico negro colossal
  ctx.fillStyle = '#0a0d14';
  ctx.beginPath();
  ctx.moveTo(ox + 64, oy + 30);
  ctx.lineTo(ox + 110, oy + 120);
  ctx.lineTo(ox + 18, oy + 120);
  ctx.closePath();
  ctx.fill();

  // Máscara branca alongada frontal
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(ox + 48, oy + 24, 32, 42);

  // Nariz longo pontudo clássico do Menos
  ctx.beginPath();
  ctx.moveTo(ox + 64, oy + 42);
  ctx.lineTo(ox + 64, oy + 64);
  ctx.lineTo(ox + 56, oy + 50);
  ctx.closePath();
  ctx.fill();

  // Olhos vermelhos malévolos frontais
  ctx.fillStyle = '#e53e3e';
  ctx.fillRect(ox + 54, oy + 36, 6, 6);
  ctx.fillRect(ox + 68, oy + 36, 6, 6);

  // Pés gigantescos
  ctx.fillStyle = '#1a202c';
  ctx.fillRect(ox + 32, oy + 118, 24, 8);
  ctx.fillRect(ox + 72, oy + 118, 24, 8);
}

function drawMenosBack(ctx, ox, oy, s) {
  // Manto cônico negro visto de trás
  ctx.fillStyle = '#0a0d14';
  ctx.beginPath();
  ctx.moveTo(ox + 64, oy + 26);
  ctx.lineTo(ox + 110, oy + 120);
  ctx.lineTo(ox + 18, oy + 120);
  ctx.closePath();
  ctx.fill();

  // Costura / dobra central do manto
  ctx.fillStyle = '#1a202c';
  ctx.fillRect(ox + 62, oy + 32, 4, 86);

  // Gola alta traseira
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(ox + 50, oy + 26, 28, 8);

  // Pés traseiros
  ctx.fillStyle = '#1a202c';
  ctx.fillRect(ox + 32, oy + 118, 24, 8);
  ctx.fillRect(ox + 72, oy + 118, 24, 8);
}

function drawMenosSide(ctx, ox, oy, s, flip) {
  ctx.save();
  if (flip) {
    ctx.translate(ox + 128, oy);
    ctx.scale(-1, 1);
    ox = 0;
    oy = 0;
  }

  // Manto cônico de perfil
  ctx.fillStyle = '#0a0d14';
  ctx.beginPath();
  ctx.moveTo(ox + 54, oy + 28);
  ctx.lineTo(ox + 104, oy + 120);
  ctx.lineTo(ox + 24, oy + 120);
  ctx.closePath();
  ctx.fill();

  // Máscara de perfil com o nariz longo projetado para frente
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(ox + 52, oy + 24, 20, 38);

  // Nariz longo pontudo projetado horizontalmente
  ctx.beginPath();
  ctx.moveTo(ox + 72, oy + 38);
  ctx.lineTo(ox + 94, oy + 48);
  ctx.lineTo(ox + 72, oy + 54);
  ctx.closePath();
  ctx.fill();

  // Olho lateral
  ctx.fillStyle = '#e53e3e';
  ctx.fillRect(ox + 60, oy + 34, 6, 6);

  // Pés
  ctx.fillStyle = '#1a202c';
  ctx.fillRect(ox + 34, oy + 118, 22, 8);
  ctx.fillRect(ox + 68, oy + 118, 22, 8);

  ctx.restore();
}

// =======================================================================
// ORBE DE REISHI
// =======================================================================
function drawReishiOrb(ctx, ox, oy, s) {
  ctx.fillStyle = '#00f0ff';
  ctx.beginPath();
  ctx.arc(ox + 16, oy + 16, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ox + 16, oy + 16, 4, 0, Math.PI * 2);
  ctx.fill();
}
