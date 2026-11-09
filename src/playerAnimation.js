// =======================================================================
// MÁQUINA DE ESTADOS DE ANIMAÇÃO DO JOGADOR
// Só decide qual clipe e qual quadro mostrar. Não conhece Three.js nem combate:
// recebe o estado da locomoção a cada tick e os eventos por triggerPlayerAction.
// =======================================================================

const PRIORITY = {
  land: 0, level_up: 1, victory: 1, slash: 2, byakurai: 3, shakkaho: 3, getsuga: 4,
  hurt: 5, hurt_heavy: 6, death: 9
};

// As variantes de um golpe têm os mesmos tempos quadro a quadro, então trocar de variante
// no meio (o jogador começou a andar) mantém o quadro e não dá salto visual.
// `moving: null` quer dizer: esta ação não combina com andar, cancela.
const CLIPS = {
  slash: { stand: ['slash_a', 'slash_b', 'slash_c'], moving: 'move_slash', air: 'air_slash' },
  getsuga: { stand: ['getsuga'], moving: 'move_getsuga', air: 'air_slash' },
  byakurai: { stand: ['byakurai'], moving: 'move_kido', air: null },
  shakkaho: { stand: ['shakkaho'], moving: 'move_kido', air: null },
  hurt: { stand: ['hurt'], moving: 'hurt', air: 'hurt_air' },
  hurt_heavy: { stand: ['hurt_heavy'], moving: 'hurt_heavy', air: 'hurt_air' },
  land: { stand: ['land'], moving: null, air: null },
  level_up: { stand: ['level_up'], moving: null, air: null },
  victory: { stand: ['victory'], moving: null, air: null },
  death: { stand: ['death'], moving: 'death', air: 'death' }
};

// Numa multidão o contato bate a cada 0,6 s. Sem esta espera o sprite ficaria só em dor.
const HURT_COOLDOWN_SECONDS = 1.5;
// Dano em movimento só mostra o tranco inicial: o resto do clipe tem os pés plantados e deslizaria.
const HURT_FRAMES_WHILE_MOVING = 5;
const JUMP_FIRST_FRAME = 2;
const JUMP_FRAME_SPAN = 8;

export function createPlayerAnimator(catalog) {
  return {
    catalog,
    action: null,
    actionTime: 0,
    faceDir: null,
    comboIndex: -1,
    hurtCooldown: 0,
    baseClip: 'idle',
    baseTime: 0,
    wasGrounded: true
  };
}

function isHurt(action) {
  return action === 'hurt' || action === 'hurt_heavy';
}

export function triggerPlayerAction(animator, action, faceDir = null) {
  if (animator.action === 'death') return false;
  if (animator.action && PRIORITY[action] < PRIORITY[animator.action]) return false;
  if (isHurt(action) && animator.hurtCooldown > 0) return false;
  if (isHurt(action)) animator.hurtCooldown = HURT_COOLDOWN_SECONDS;
  if (action === 'slash') animator.comboIndex += 1;
  animator.action = action;
  animator.actionTime = 0;
  animator.faceDir = faceDir;
  return true;
}

function resolveActionClip(animator, ctx) {
  const options = CLIPS[animator.action];
  if (!ctx.isGrounded) return options.air;
  if (ctx.isMoving) return options.moving;
  const strikes = options.stand;
  return strikes[Math.max(0, animator.comboIndex) % strikes.length];
}

function clearAction(animator) {
  animator.action = null;
  animator.actionTime = 0;
  animator.faceDir = null;
}

function stepAction(animator, dt, ctx) {
  const anim = resolveActionClip(animator, ctx);
  if (!anim) {
    clearAction(animator);
    return null;
  }
  animator.actionTime += dt;
  const { fps, frames } = animator.catalog[anim];
  const frame = Math.floor(animator.actionTime * fps + 1e-6);
  if (animator.action === 'death') return { anim, frame: Math.min(frame, frames - 1) };
  const cutShort = ctx.isMoving && isHurt(animator.action) && frame >= HURT_FRAMES_WHILE_MOVING;
  if (frame >= frames || cutShort) {
    clearAction(animator);
    return null;
  }
  return { anim, frame };
}

function jumpFrame(ctx) {
  const progress = Math.max(0, Math.min(1, (1 - ctx.vy / ctx.jumpStrength) / 2));
  return JUMP_FIRST_FRAME + Math.round(progress * JUMP_FRAME_SPAN);
}

function baseClipName(ctx) {
  if (ctx.isAFK) return 'afk';
  if (!ctx.isMoving) return 'idle';
  return ctx.running ? 'run' : 'walk';
}

function stepBase(animator, dt, ctx) {
  if (!ctx.isGrounded && !ctx.isAFK) return { anim: 'jump', frame: jumpFrame(ctx) };
  const anim = baseClipName(ctx);
  if (anim !== animator.baseClip) {
    animator.baseClip = anim;
    animator.baseTime = 0;
  }
  animator.baseTime += dt;
  const { fps, frames } = animator.catalog[anim];
  return { anim, frame: Math.floor(animator.baseTime * fps + 1e-6) % frames };
}

function detectLanding(animator, ctx) {
  const landed = ctx.isGrounded && !animator.wasGrounded;
  animator.wasGrounded = ctx.isGrounded;
  if (landed && !ctx.isMoving && !animator.action) triggerPlayerAction(animator, 'land');
}

export function updatePlayerAnimator(animator, dt, ctx) {
  animator.hurtCooldown = Math.max(0, animator.hurtCooldown - dt);
  detectLanding(animator, ctx);
  if (ctx.isAFK && animator.action !== 'death') clearAction(animator);
  const active = animator.action ? stepAction(animator, dt, ctx) : null;
  return active || stepBase(animator, dt, ctx);
}

// Parado, o personagem golpeia virado para o Hollow mais próximo. Andando, as pernas mandam na direção.
export function nearestEnemyDirection(enemies, x, z) {
  let best = null;
  let bestDist = Infinity;
  for (const en of enemies) {
    if (!en.active) continue;
    const dist = Math.hypot(en.x - x, en.z - z);
    if (dist > 0 && dist < bestDist) {
      bestDist = dist;
      best = { dirX: (en.x - x) / dist, dirZ: (en.z - z) / dist };
    }
  }
  return best;
}
