// =======================================================================
// TIPOS DE HOLLOW DA HORDA: atributos, sorteio, rota e ataque
// Regra pura, sem Three.js. O desenho dos clipes está em hollowClips.js.
// =======================================================================

// unlockAt em segundos de partida: cada tipo novo aparece depois do anterior,
// para o jogador aprender um comportamento por vez.
export const HOLLOW_TYPES = {
  // O golpe do Fishbone (e do elite, que é um Fishbone reforçado) é só a animação: o dano segue por contato.
  fishbone: {
    hp: 45, speed: 6.4, scale: 1.4, contactDamage: 12, unlockAt: 0, weight: 6,
    attack: { range: 1.3, cooldown: 1.3, duration: 0.75 }
  },
  shrieker: {
    hp: 30, speed: 8.6, scale: 1.4, contactDamage: 10, unlockAt: 25, weight: 3,
    zigzag: { amplitude: 0.9, frequency: 3.0 },
    attack: { range: 1.8, cooldown: 1.4, duration: 0.75 }
  },
  acidwire: {
    hp: 60, speed: 5.0, scale: 1.5, contactDamage: 10, unlockAt: 50, weight: 2,
    keepAway: { min: 5.0, max: 9.0 },
    attack: { range: 13.0, cooldown: 3.2, duration: 0.86, spitAt: 0.43, spitDamage: 14, rooted: true }
  },
  // Lento e blindado: de média distância para, mira e investe em linha reta. Quem sai da frente desvia.
  ironhide: {
    hp: 160, speed: 4.0, scale: 1.7, contactDamage: 20, unlockAt: 80, weight: 2,
    charge: { range: 9.0, minRange: 2.5, windup: 0.6, dash: 0.7, speedMult: 3.4, cooldown: 4.5 },
    attack: { range: 1.6, cooldown: 1.8, duration: 0.86 }
  },
  // Espectro: chega em espiral, cada um girando para um lado, e só entra reto quando já está perto.
  wraith: {
    hp: 40, speed: 7.0, scale: 1.5, contactDamage: 11, unlockAt: 110, weight: 2,
    flank: { radius: 3.5, swirl: 1.4 },
    attack: { range: 1.8, cooldown: 1.5, duration: 0.75 }
  }
};

// O Menos Grande nasce só como chefe (spawnBossMenosGrande), então fica fora de HOLLOW_TYPES e do sorteio.
// O corpo dele é enorme: o golpe começa de mais longe. Também é só animação.
const MENOS_BOSS = { attack: { range: 3.2, cooldown: 2.4, duration: 1.0 } };

export function hollowTypeOf(en) {
  if (en.type === 'menos') return MENOS_BOSS;
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
  en.speed = (isElite ? 6.8 : t.speed) * mult.speedMult;
  en.contactDamage = isElite ? 22 : t.contactDamage;
  en.scale = isElite ? 2.2 : t.scale;
  en.attackCooldown = 0;
  en.hurtCooldown = 0;
  en.clip = null;
  en.charge = null;
  en.chargeCooldown = 0;
}

function keepAwayPace(keep, dist) {
  if (dist < keep.min) return -0.8;
  return dist > keep.max ? 1 : 0;
}

// Na preparação, o Encouraçado fica parado e vai travando a mira; na corrida, segue a mira travada.
function chargeSteer(en, charge, fx, fz) {
  if (en.charge.t < charge.windup) {
    en.charge.dirX = fx;
    en.charge.dirZ = fz;
    return { x: fx, z: fz, pace: 0 };
  }
  return { x: en.charge.dirX, z: en.charge.dirZ, pace: charge.speedMult };
}

// Espiral: soma ao rumo do jogador um desvio lateral, que some quando o espectro já está perto.
function flankSteer(en, flank, fx, fz, dist) {
  if (dist <= flank.radius) return { x: fx, z: fz, pace: 1 };
  const side = (en.id % 2 ? 1 : -1) * flank.swirl;
  const len = Math.hypot(fx - fz * side, fz + fx * side);
  return { x: (fx - fz * side) / len, z: (fz + fx * side) / len, pace: 1 };
}

// Direção (unitária, para onde o sprite olha) e ritmo (fração da velocidade; negativo recua).
export function steerHollow(en, dx, dz, dist, time) {
  const t = hollowTypeOf(en);
  const fx = dx / dist;
  const fz = dz / dist;
  if (en.charge && t.charge) return chargeSteer(en, t.charge, fx, fz);
  if (t.flank) return flankSteer(en, t.flank, fx, fz, dist);
  if (en.clip?.id === 'attack' && t.attack?.rooted) return { x: fx, z: fz, pace: 0 };
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

// Tranco ao levar golpe (clipe 'hurt', 12 quadros a 22 fps). É só visual: o hollow segue andando,
// o tranco não corta um golpe em curso e tem recarga para um hollow sob fogo contínuo ainda atacar.
export const HURT = { duration: 12 / 22, cooldown: 1.0 };

export function startHollowHurt(en, hasClip) {
  if (!hasClip || !en.active || en.clip || (en.hurtCooldown || 0) > 0) return false;
  en.clip = { id: 'hurt', t: 0 };
  en.hurtCooldown = HURT.cooldown;
  return true;
}

function advanceHurt(en, dt) {
  en.clip.t += dt;
  if (en.clip.t >= HURT.duration) en.clip = null;
  return null;
}

// Começa a investida a média distância e a encerra depois da preparação mais a corrida.
function tickCharge(en, charge, dist, dt) {
  en.chargeCooldown = Math.max(0, (en.chargeCooldown || 0) - dt);
  if (!en.charge) {
    const inRange = dist <= charge.range && dist > charge.minRange;
    if (inRange && en.chargeCooldown === 0) en.charge = { t: 0, dirX: en.dirX, dirZ: en.dirZ };
    return;
  }
  en.charge.t += dt;
  if (en.charge.t < charge.windup + charge.dash) return;
  en.charge = null;
  en.chargeCooldown = charge.cooldown;
}

// Avança o golpe do hollow. Devolve 'spit' no quadro em que o Acidwire cospe.
export function tickHollowAttack(en, dist, dt) {
  const charge = hollowTypeOf(en).charge;
  if (charge) tickCharge(en, charge, dist, dt);
  const attack = hollowTypeOf(en).attack;
  if (!attack) return null;
  en.attackCooldown = Math.max(0, (en.attackCooldown || 0) - dt);
  en.hurtCooldown = Math.max(0, (en.hurtCooldown || 0) - dt);
  if (en.clip?.id === 'hurt') return advanceHurt(en, dt);
  if (en.clip) return advanceAttack(en, attack, dt);
  if (dist <= attack.range && en.attackCooldown === 0) {
    en.clip = { id: 'attack', t: 0, fired: false };
    en.attackCooldown = attack.cooldown;
  }
  return null;
}
