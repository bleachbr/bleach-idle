// Gerador de atlas de texturas procedural em Pixel Art
// Produz os sprites do Recruta Shinigami, Hollows (Fishbone D, Shrieker, Acidwire) e do Menos Grande
export function createSpritesheet() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Mapa de coordenadas dos sprites no atlas
  const sprites = {
    // Recruta Shinigami (Shihakusho preto tradicional + Asauchi)
    player: { x: 0, y: 0, w: 64, h: 64 },
    // Hollows Comuns
    fishbone: { x: 64, y: 0, w: 64, h: 64 },
    shrieker: { x: 128, y: 0, w: 64, h: 64 },
    acidwire: { x: 192, y: 0, w: 64, h: 64 },
    // Chefe: Menos Grande (Gillian)
    menos: { x: 256, y: 0, w: 128, h: 128 },
    // Orbe de Reishi (XP)
    reishi: { x: 0, y: 64, w: 32, h: 32 }
  };

  // 1. Desenho do Recruta Shinigami
  drawPixelCharacter(ctx, sprites.player.x, sprites.player.y, {
    bodyColor: '#121317',    // Quimono preto (Shihakusho)
    collarColor: '#ffffff',  // Gola interna branca
    skinColor: '#f7d0a1',    // Pele
    hairColor: '#e07a30',    // Cabelo laranja/castanho
    swordColor: '#e2e8f0',   // Asauchi (Katana)
    size: 64
  });

  // 2. Desenho do Fishbone D (Hollow peixe-humanoide clássico)
  drawHollow(ctx, sprites.fishbone.x, sprites.fishbone.y, {
    bodyColor: '#2d3748',
    maskColor: '#ffffff',
    eyeColor: '#e53e3e',
    accentColor: '#4a5568',
    horns: true,
    size: 64
  });

  // 3. Desenho do Shrieker (Hollow voador com asas)
  drawHollow(ctx, sprites.shrieker.x, sprites.shrieker.y, {
    bodyColor: '#1a202c',
    maskColor: '#ffffff',
    eyeColor: '#dd6b20',
    accentColor: '#3182ce',
    wings: true,
    size: 64
  });

  // 4. Desenho do Acidwire (Hollow quadrúpede com cauda)
  drawHollow(ctx, sprites.acidwire.x, sprites.acidwire.y, {
    bodyColor: '#22543d',
    maskColor: '#ffffff',
    eyeColor: '#9ae6b4',
    accentColor: '#38a169',
    serpent: true,
    size: 64
  });

  // 5. Desenho do Chefe Menos Grande (Gillian)
  drawMenosGrande(ctx, sprites.menos.x, sprites.menos.y, 128);

  // 6. Desenho do Reishi (Partícula Espiritual Azul Brilhante)
  drawReishiOrb(ctx, sprites.reishi.x, sprites.reishi.y, 32);

  return { canvas, sprites };
}

function drawPixelCharacter(ctx, ox, oy, p) {
  // Corpo / Shihakusho
  ctx.fillStyle = p.bodyColor;
  ctx.fillRect(ox + 20, oy + 26, 24, 28);
  // Faixa branca central (Obi)
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

  // Katana (Asauchi na mão direita)
  ctx.fillStyle = p.swordColor;
  ctx.fillRect(ox + 46, oy + 12, 3, 32); // Lâmina prateada
  ctx.fillStyle = '#718096';
  ctx.fillRect(ox + 44, oy + 36, 7, 3);  // Tsuba (guarda)
  ctx.fillStyle = '#1a202c';
  ctx.fillRect(ox + 46, oy + 39, 3, 8);  // Tsuka (cabo)

  // Pés com sandálias de palha (Waraji)
  ctx.fillStyle = '#f7fafc';
  ctx.fillRect(ox + 22, oy + 54, 8, 6);
  ctx.fillRect(ox + 34, oy + 54, 8, 6);
}

function drawHollow(ctx, ox, oy, p) {
  // Corpo sombrio do Hollow
  ctx.fillStyle = p.bodyColor;
  ctx.fillRect(ox + 16, oy + 22, 32, 28);

  // Asas caso seja Shrieker
  if (p.wings) {
    ctx.fillStyle = p.accentColor;
    ctx.fillRect(ox + 4, oy + 16, 12, 18);
    ctx.fillRect(ox + 48, oy + 16, 12, 18);
  }

  // Máscara Branca de Hollow (Crânio)
  ctx.fillStyle = p.maskColor;
  ctx.fillRect(ox + 20, oy + 10, 24, 20);

  // Detalhes da máscara
  if (p.horns) {
    ctx.fillStyle = p.maskColor;
    ctx.fillRect(ox + 18, oy + 4, 6, 8);
    ctx.fillRect(ox + 40, oy + 4, 6, 8);
  }

  // Olhos vazados brilhantes
  ctx.fillStyle = p.eyeColor;
  ctx.fillRect(ox + 24, oy + 16, 5, 5);
  ctx.fillRect(ox + 35, oy + 16, 5, 5);

  // Dentes/Boca da máscara
  ctx.fillStyle = '#1a202c';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(ox + 24 + i * 4, oy + 25, 2, 4);
  }

  // Garras / Pés
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(ox + 18, oy + 50, 8, 6);
  ctx.fillRect(ox + 38, oy + 50, 8, 6);
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
  // Nariz longo pontudo
  ctx.beginPath();
  ctx.moveTo(ox + 64, oy + 42);
  ctx.lineTo(ox + 64, oy + 64);
  ctx.lineTo(ox + 56, oy + 50);
  ctx.closePath();
  ctx.fill();

  // Olhos vermelhos malévolos
  ctx.fillStyle = '#e53e3e';
  ctx.fillRect(ox + 54, oy + 36, 6, 6);
  ctx.fillRect(ox + 68, oy + 36, 6, 6);

  // Pés gigantescos
  ctx.fillStyle = '#1a202c';
  ctx.fillRect(ox + 32, oy + 118, 24, 8);
  ctx.fillRect(ox + 72, oy + 118, 24, 8);
}

function drawReishiOrb(ctx, ox, oy, s) {
  // Esfera de Reishi luminosa
  ctx.fillStyle = '#00f0ff';
  ctx.beginPath();
  ctx.arc(ox + 16, oy + 16, 8, 0, Math.PI * 2);
  ctx.fill();

  // Centro de alta energia branco
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ox + 16, oy + 16, 4, 0, Math.PI * 2);
  ctx.fill();
}
