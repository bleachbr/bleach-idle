// =======================================================================
// TIPOS DE HOLLOW DA HORDA: atributos, sorteio, rota e ataque
// Regra pura, sem Three.js. O desenho dos clipes está em hollowClips.js.
// =======================================================================

// unlockAt em segundos de partida: cada tipo novo aparece depois do anterior,
// para o jogador aprender um comportamento por vez.
export const HOLLOW_TYPES = {
  fishbone: { hp: 45, speed: 3.2, scale: 1.4, contactDamage: 12, unlockAt: 0, weight: 6 },
  shrieker: {
    hp: 30, speed: 4.3, scale: 1.4, contactDamage: 10, unlockAt: 25, weight: 3,
    zigzag: { amplitude: 0.9, frequency: 3.0 },
    attack: { range: 1.8, cooldown: 1.4, duration: 0.75 }
  },
  acidwire: {
    hp: 60, speed: 2.5, scale: 1.5, contactDamage: 10, unlockAt: 50, weight: 2,
    keepAway: { min: 5.0, max: 9.0 },
    attack: { range: 13.0, cooldown: 3.2, duration: 0.86, spitAt: 0.43, spitDamage: 14, rooted: true }
  }
};

export function hollowTypeOf(en) {
  return HOLLOW_TYPES[en.type === 'elite' ? 'fishbone' : en.type] || HOLLOW_TYPES.fishbone;
}

export function pickHollowType(time, roll = Math.random()) {
  const open = Object.entries(HOLLOW_TYPES).filter(([, t]) => time >= t.unlockAt);
  const total = open.reduce((sum, [, t]) => sum + t.weight, 0);
  let left = roll * total;
  for (const [id, t] of open) {
    left -= t.weight;
    if (left < 0) return id;
  }
  return open[open.length - 1][0];
}

// Atributos de um hollow comum recém-surgido. O elite continua sendo um Fishbone reforçado.
export function configureHollow(en, typeId, isElite, mult) {
  const t = HOLLOW_TYPES[typeId];
  en.type = isElite ? 'elite' : typeId;
  en.isElite = isElite;
  en.hp = Math.round((isElite ? 200 : t.hp) * mult.hpMult);
  en.maxHp = en.hp;
  en.speed = (isElite ? 3.4 : t.speed) * mult.speedMult;
  en.contactDamage = isElite ? 22 : t.contactDamage;
  en.scale = isElite ? 2.2 : t.scale;
  en.attackCooldown = 0;
  en.clip = null;
}

function keepAwayPace(keep, dist) {
  if (dist < keep.min) return -0.8;
  return dist > keep.max ? 1 : 0;
}

// Direção (unitária, para onde o sprite olha) e ritmo (fração da velocidade; negativo recua).
export function steerHollow(en, dx, dz, dist, time) {
  const t = hollowTypeOf(en);
  const fx = dx / dist;
  const fz = dz / dist;
  if (en.clip && t.attack?.rooted) return { x: fx, z: fz, pace: 0 };
  if (t.keepAway) return { x: fx, z: fz, pace: keepAwayPace(t.keepAway, dist) };
  if (!t.zigzag) return { x: fx, z: fz, pace: 1 };
  // Desvio lateral senoidal; a fase por id evita que o bando inteiro vire junto.
  const side = Math.sin(time * t.zigzag.frequency + en.id * 1.7) * t.zigzag.amplitude;
  const len = Math.hypot(fx - fz * side, fz + fx * side);
  return { x: (fx - fz * side) / len, z: (fz + fx * side) / len, pace: 1 };
}

function advanceAttack(en, attack, dt) {
  en.clip.t += dt;
  const fires = attack.spitAt !== undefined && !en.clip.fired && en.clip.t >= attack.spitAt;
  if (fires) en.clip.fired = true;
  if (en.clip.t >= attack.duration) en.clip = null;
  return fires ? 'spit' : null;
}

// Avança o golpe do hollow. Devolve 'spit' no quadro em que o Acidwire cospe.
export function tickHollowAttack(en, dist, dt) {
  const attack = hollowTypeOf(en).attack;
  if (!attack || en.type === 'elite') return null;
  en.attackCooldown = Math.max(0, (en.attackCooldown || 0) - dt);
  if (en.clip) return advanceAttack(en, attack, dt);
  if (dist <= attack.range && en.attackCooldown === 0) {
    en.clip = { id: 'attack', t: 0, fired: false };
    en.attackCooldown = attack.cooldown;
  }
  return null;
}
