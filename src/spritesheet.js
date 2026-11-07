// Gerador de atlas de texturas procedural em Pixel Art
// Produz os sprites do Recruta Shinigami em 4 Direções (Frente, Costas, Lado Direito, Lado Esquerdo)
// e os Hollows (Fishbone D, Shrieker, Acidwire e Menos Grande)
export function createSpritesheet() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Mapa de coordenadas dos sprites no atlas
  const sprites = {
    // Recruta Shinigami (4 Direções em linha)
    player_front: { x: 0, y: 0, w: 64, h: 64 },
    player_back:  { x: 64, y: 0, w: 64, h: 64 },
    player_side:  { x: 128, y: 0, w: 64, h: 64 },
    player_side_l:{ x: 192, y: 0, w: 64, h: 64 },

    // Hollows Comuns (4 Direções para o Fishbone D)
    fishbone_front: { x: 0, y: 64, w: 64, h: 64 },
    fishbone_back:  { x: 64, y: 64, w: 64, h: 64 },
    fishbone_side:  { x: 128, y: 64, w: 64, h: 64 },
    fishbone_side_l:{ x: 192, y: 64, w: 64, h: 64 },

    // Outros Hollows
    shrieker: { x: 0, y: 128, w: 64, h: 64 },
    acidwire: { x: 64, y: 128, w: 64, h: 64 },

    // Chefe Menos Grande (Gillian)
    menos: { x: 256, y: 0, w: 128, h: 128 },

    // Orbe de Reishi (XP)
    reishi: { x: 128, y: 128, w: 32, h: 32 }
  };

  // Base de cores do Recruta Shinigami
  const playerProps = {
    bodyColor: '#121317',    // Quimono preto (Shihakusho)
    collarColor: '#ffffff',  // Gola interna branca / Obi
    skinColor: '#f7d0a1',    // Pele
    hairColor: '#e07a30',    // Cabelo laranja/castanho
    swordColor: '#e2e8f0',   // Asauchi (Katana)
    size: 64
  };

  // 1. Recruta Shinigami - 4 Visões
  drawPlayerFront(ctx, sprites.player_front.x, sprites.player_front.y, playerProps);
  drawPlayerBack(ctx, sprites.player_back.x, sprites.player_back.y, playerProps);
  drawPlayerSide(ctx, sprites.player_side.x, sprites.player_side.y, playerProps, false); // Direita
  drawPlayerSide(ctx, sprites.player_side_l.x, sprites.player_side_l.y, playerProps, true); // Esquerda

  // 2. Fishbone D - 4 Visões
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

  // 3. Shrieker e Acidwire
  drawHollowFront(ctx, sprites.shrieker.x, sprites.shrieker.y, {
    bodyColor: '#1a202c',
    maskColor: '#ffffff',
    eyeColor: '#dd6b20',
    accentColor: '#3182ce',
    wings: true,
    size: 64
  });

  drawHollowFront(ctx, sprites.acidwire.x, sprites.acidwire.y, {
    bodyColor: '#22543d',
    maskColor: '#ffffff',
    eyeColor: '#9ae6b4',
    accentColor: '#38a169',
    serpent: true,
    size: 64
  });

  // 4. Chefe Menos Grande (Gillian)
  drawMenosGrande(ctx, sprites.menos.x, sprites.menos.y, 128);

  // 5. Orbe de Reishi
  drawReishiOrb(ctx, sprites.reishi.x, sprites.reishi.y, 32);

  return { canvas, sprites };
}

// -----------------------------------------------------------------------
// RECRUTA SHINIGAMI: 4 DIREÇÕES
// -----------------------------------------------------------------------

// Visão Frontal (Olhando para a câmera)
function drawPlayerFront(ctx, ox, oy, p) {
  // Corpo / Shihakusho
  ctx.fillStyle = p.bodyColor;
  ctx.fillRect(ox + 20, oy + 26, 24, 28);
  // Faixa branca central (Gola cruzada)
  ctx.fillStyle = p.collarColor;
  ctx.fillRect(ox + 28, oy + 26, 8, 14);
  ctx.fillRect(ox + 22, oy + 38, 20, 4);

  // Cabeça
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
  ctx.fillRect(ox + 46, oy + 12, 3, 32); // Lâmina
  ctx.fillStyle = '#718096';
  ctx.fillRect(ox + 44, oy + 36, 7, 3);  // Tsuba
  ctx.fillStyle = '#1a202c';
  ctx.fillRect(ox + 46, oy + 39, 3, 8);  // Cabo

  // Pés com sandálias Waraji
  ctx.fillStyle = '#f7fafc';
  ctx.fillRect(ox + 22, oy + 54, 8, 6);
  ctx.fillRect(ox + 34, oy + 54, 8, 6);
}

// Visão de Costas (Olhando para a frente / longe da câmera)
function drawPlayerBack(ctx, ox, oy, p) {
  // Corpo / Shihakusho traseiro com fita branca amarrada
  ctx.fillStyle = p.bodyColor;
  ctx.fillRect(ox + 20, oy + 26, 24, 28);
  // Faixa do Obi nas costas com nó central
  ctx.fillStyle = p.collarColor;
  ctx.fillRect(ox + 22, oy + 38, 20, 4);
  ctx.fillRect(ox + 29, oy + 36, 6, 8);

  // Cabeça (cabelo cobre toda a parte de trás)
  ctx.fillStyle = p.hairColor;
  ctx.fillRect(ox + 22, oy + 8, 20, 18);
  ctx.fillRect(ox + 20, oy + 12, 4, 12);
  ctx.fillRect(ox + 40, oy + 12, 4, 12);

  // Katana na bainha / costas
  ctx.fillStyle = p.swordColor;
  ctx.fillRect(ox + 16, oy + 10, 3, 34); // Lâmina apontando para cima
  ctx.fillStyle = '#718096';
  ctx.fillRect(ox + 14, oy + 36, 7, 3);
  ctx.fillStyle = '#1a202c';
  ctx.fillRect(ox + 16, oy + 39, 3, 8);

  // Pés
  ctx.fillStyle = '#f7fafc';
  ctx.fillRect(ox + 22, oy + 54, 8, 6);
  ctx.fillRect(ox + 34, oy + 54, 8, 6);
}

// Visão de Perfil / Lado (Direita ou Esquerda)
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
  ctx.fillRect(ox + 40, oy + 18, 3, 3); // Nariz/queixo de perfil

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
  ctx.fillRect(ox + 42, oy + 8, 3, 34); // Espada empunhada à frente
  ctx.fillStyle = '#718096';
  ctx.fillRect(ox + 40, oy + 34, 7, 3);

  // Pés em passo de marcha
  ctx.fillStyle = '#f7fafc';
  ctx.fillRect(ox + 22, oy + 54, 8, 6);
  ctx.fillRect(ox + 32, oy + 54, 8, 6);

  ctx.restore();
}

// -----------------------------------------------------------------------
// HOLLOW FISHBONE D: 4 DIREÇÕES
// -----------------------------------------------------------------------

function drawHollowFront(ctx, ox, oy, p) {
  ctx.fillStyle = p.bodyColor;
  ctx.fillRect(ox + 16, oy + 22, 32, 28);

  if (p.wings) {
    ctx.fillStyle = p.accentColor;
    ctx.fillRect(ox + 4, oy + 16, 12, 18);
    ctx.fillRect(ox + 48, oy + 16, 12, 18);
  }

  // Máscara Branca de Hollow
  ctx.fillStyle = p.maskColor;
  ctx.fillRect(ox + 20, oy + 10, 24, 20);

  if (p.horns) {
    ctx.fillStyle = p.maskColor;
    ctx.fillRect(ox + 18, oy + 4, 6, 8);
    ctx.fillRect(ox + 40, oy + 4, 6, 8);
  }

  // Olhos vermelhos
  ctx.fillStyle = p.eyeColor;
  ctx.fillRect(ox + 24, oy + 16, 5, 5);
  ctx.fillRect(ox + 35, oy + 16, 5, 5);

  // Dentes
  ctx.fillStyle = '#1a202c';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(ox + 24 + i * 4, oy + 25, 2, 4);
  }

  // Garras
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(ox + 18, oy + 50, 8, 6);
  ctx.fillRect(ox + 38, oy + 50, 8, 6);
}

function drawHollowBack(ctx, ox, oy, p) {
  // Corpo traseiro com vértebras e ossos dorsais expostos
  ctx.fillStyle = p.bodyColor;
  ctx.fillRect(ox + 16, oy + 22, 32, 28);

  // Costas da cabeça
  ctx.fillStyle = '#4a5568';
  ctx.fillRect(ox + 20, oy + 10, 24, 20);

  // Chifres vistos de trás
  if (p.horns) {
    ctx.fillStyle = p.maskColor;
    ctx.fillRect(ox + 18, oy + 4, 6, 8);
    ctx.fillRect(ox + 40, oy + 4, 6, 8);
  }

  // Coluna vertebral ossuda branca nas costas
  ctx.fillStyle = p.maskColor;
  for (let y = 0; y < 5; y++) {
    ctx.fillRect(ox + 30, oy + 24 + y * 5, 4, 3);
  }

  // Pés traseiros
  ctx.fillStyle = '#e2e8f0';
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

  // Máscara de perfil com mandíbula projetada
  ctx.fillStyle = p.maskColor;
  ctx.fillRect(ox + 24, oy + 10, 20, 20);
  ctx.fillRect(ox + 42, oy + 18, 6, 12); // Focinho/queixo pontudo

  // Chifre de perfil
  if (p.horns) {
    ctx.fillRect(ox + 28, oy + 4, 8, 8);
  }

  // Olho lateral
  ctx.fillStyle = p.eyeColor;
  ctx.fillRect(ox + 34, oy + 16, 5, 5);

  // Garras estendidas
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(ox + 36, oy + 34, 10, 5);
  ctx.fillRect(ox + 24, oy + 50, 8, 6);
  ctx.fillRect(ox + 34, oy + 50, 8, 6);

  ctx.restore();
}

function drawMenosGrande(ctx, ox, oy, s) {
  // Túnica preta gigantesca e pontuda do Menos
  ctx.fillStyle = '#0a0d14';
  ctx.beginPath();
  ctx.moveTo(ox + 64, oy + 30);
  ctx.lineTo(ox + 110, oy + 120);
  ctx.lineTo(ox + 18, oy + 120);
  ctx.closePath();
  ctx.fill();

  // Máscara branca alongada e pontuda icônica
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(ox + 48, oy + 24, 32, 42);
  ctx.beginPath();
  ctx.moveTo(ox + 64, oy + 42);
  ctx.lineTo(ox + 64, oy + 64);
  ctx.lineTo(ox + 56, oy + 50);
  ctx.closePath();
  ctx.fill();

  // Olhos vermelhos
  ctx.fillStyle = '#e53e3e';
  ctx.fillRect(ox + 54, oy + 36, 6, 6);
  ctx.fillRect(ox + 68, oy + 36, 6, 6);

  // Pés
  ctx.fillStyle = '#1a202c';
  ctx.fillRect(ox + 32, oy + 118, 24, 8);
  ctx.fillRect(ox + 72, oy + 118, 24, 8);
}

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
