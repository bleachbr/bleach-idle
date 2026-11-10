// =======================================================================
// ARSENAL DE CADA PERSONAGEM JOGÁVEL
// As quatro posições de arma (asauchi, getsuga, byakurai, shakkaho) são as mesmas para todos,
// então level-up, cooldown e dano continuam uma regra só (src/stats.js). Aqui muda o que o
// jogador vê e como o disparo sai: nome, ícone, cor, quantidade de projéteis e alcance.
// Regra pura, sem Three.js: quem desenha é o FXManager.
// =======================================================================

const ICHIGO_SHOTS = {
  getsuga: { fx: 'skill_getsuga', speed: 19.5, maxDistance: 32.0, hitRadius: 2.4, startScale: 2.2, endScale: 4.2 },
  byakurai: { fx: 'skill_byakurai', speed: 28.0, maxDistance: 30.0, hitRadius: 1.6 },
  shakkaho: { fx: 'skill_shakkaho', speed: 16.0, maxDistance: 25.0, hitRadius: 2.8 }
};

export const ARSENALS = {
  ichigo_shikai: {
    slashTint: 0xffffff,
    labels: {
      asauchi: { name: 'Corte de Asauchi', icon: '⚔️' },
      getsuga: { name: 'Getsuga Tenshō', icon: '🌙' },
      byakurai: { name: 'Hadō #4 Byakurai', icon: '⚡' },
      shakkaho: { name: 'Hadō #31 Shakkahō', icon: '🔥' }
    },
    shots: {}
  },
  ishida: {
    slashTint: 0x7fd8ff,
    labels: {
      asauchi: { name: 'Seele Schneider', icon: '🗡️' },
      getsuga: { name: 'Licht Regen', icon: '🏹' },
      byakurai: { name: 'Heilig Pfeil', icon: '✴️' },
      shakkaho: { name: 'Sprenger', icon: '💠' }
    },
    shots: {
      // Chuva de flechas: leque de 5, cada uma mais fraca, todas atravessam
      getsuga: { fx: 'skill_quincy_arrow', count: 5, spread: 0.55, damageScale: 0.4,
        speed: 30.0, maxDistance: 30.0, hitRadius: 1.3, startScale: 1.8, endScale: 2.2, pierce: true },
      byakurai: { fx: 'skill_quincy_arrow', speed: 36.0, hitRadius: 1.4, startScale: 2.0, endScale: 2.4, pierce: true },
      shakkaho: { fx: 'skill_cero', tint: 0xcfefff, hitRadius: 3.4, startScale: 2.4, endScale: 3.8 }
    }
  },
  sado: {
    slashTint: 0xff8a6a,
    labels: {
      asauchi: { name: 'Brazo Derecha de Gigante', icon: '👊' },
      getsuga: { name: 'El Directo', icon: '💥' },
      byakurai: { name: 'Bala de Brazo', icon: '🥊' },
      shakkaho: { name: 'La Muerte', icon: '💀' }
    },
    shots: {
      // Punho de energia lento e largo que atravessa a horda
      getsuga: { fx: 'skill_directo', speed: 14.0, maxDistance: 28.0, hitRadius: 3.0,
        startScale: 2.6, endScale: 4.6, pierce: true },
      byakurai: { fx: 'skill_directo', speed: 24.0, hitRadius: 1.4, startScale: 1.3, endScale: 1.7 },
      shakkaho: { fx: 'skill_muerte', speed: 12.0, hitRadius: 3.8, startScale: 3.0, endScale: 4.4 }
    }
  },
  grimmjow: {
    slashTint: 0x9fe8ff,
    labels: {
      asauchi: { name: 'Pantera', icon: '⚔️' },
      getsuga: { name: 'Desgarrón', icon: '🐾' },
      byakurai: { name: 'Bala', icon: '👊' },
      shakkaho: { name: 'Gran Rey Cero', icon: '🌀' }
    },
    shots: {
      // Cinco garras paralelas, uma por dedo
      getsuga: { fx: 'skill_getsuga', tint: 0x6fe0ff, count: 5, lateral: 0.9, damageScale: 0.35,
        speed: 21.0, maxDistance: 28.0, hitRadius: 1.4, startScale: 1.6, endScale: 2.6 },
      byakurai: { fx: 'skill_cero', count: 3, spread: 0.16, damageScale: 0.45, speed: 32.0,
        startScale: 1.0, endScale: 1.2, hitRadius: 1.2 },
      shakkaho: { fx: 'skill_cero', pierce: true, speed: 22.0, maxDistance: 30.0,
        hitRadius: 2.6, startScale: 2.6, endScale: 4.2 }
    }
  }
};

function arsenalOf(charId) {
  return ARSENALS[charId] || ARSENALS.ichigo_shikai;
}

export function arsenalLabels(charId) {
  return arsenalOf(charId).labels;
}

export function arsenalSlashTint(charId) {
  return arsenalOf(charId).slashTint;
}

export function arsenalShot(charId, weaponKey) {
  return { count: 1, damageScale: 1, ...ICHIGO_SHOTS[weaponKey], ...arsenalOf(charId).shots[weaponKey] };
}

// Direção e deslocamento de cada projétil da salva: leque (spread, em radianos entre o primeiro
// e o último) ou fileira paralela (lateral, em metros entre vizinhos).
export function volleyDirections(dirX, dirZ, shot) {
  const shots = [];
  for (let i = 0; i < shot.count; i++) {
    const k = shot.count > 1 ? i / (shot.count - 1) - 0.5 : 0;
    const angle = Math.atan2(dirZ, dirX) + k * (shot.spread || 0);
    const side = k * (shot.count - 1) * (shot.lateral || 0);
    shots.push({ x: Math.cos(angle), z: Math.sin(angle), offX: -dirZ * side, offZ: dirX * side });
  }
  return shots;
}
