// =======================================================================
// MÓDULO DE MOVIMENTAÇÃO E ANIMAÇÃO: BLEACH SOUL SURVIVOR
// Funções puras desacopladas para movimento relativo à câmera e walk cycle
// =======================================================================

/**
 * Calcula o deslocamento no plano XZ relativo ao ângulo de rotação da câmera (yaw).
 * - W / Up: avança para o fundo da tela (vetor frontal da câmera)
 * - S / Down: recua em direção à tela
 * - D / Right: desloca para a direita da visão
 * - A / Left: desloca para a esquerda da visão
 */
export function computePlayerDisplacement(keys, yaw, joy = null) {
  let fwd = (joy && Math.hypot(joy.x, joy.y) > 0.08) ? joy.y : ((keys.w ? 1 : 0) - (keys.s ? 1 : 0));
  let right = (joy && Math.hypot(joy.x, joy.y) > 0.08) ? joy.x : ((keys.d ? 1 : 0) - (keys.a ? 1 : 0));
  if (fwd === 0 && right === 0) return null;

  const len = Math.hypot(right, fwd);
  fwd /= len;
  right /= len;

  const sinYaw = Math.sin(yaw);
  const cosYaw = Math.cos(yaw);

  return {
    dx: right * cosYaw - fwd * sinYaw,
    dz: -right * sinYaw - fwd * cosYaw
  };
}

/**
 * Determina a direção do sprite ('back', 'front', 'side', 'side_l')
 * baseado no vetor de deslocamento relativo à orientação da câmera.
 */
export function getSpriteDirection(facingX, facingZ, cameraYaw) {
  const sinYaw = Math.sin(cameraYaw);
  const cosYaw = Math.cos(cameraYaw);

  const camFwdX = -sinYaw;
  const camFwdZ = -cosYaw;
  const camRightX = cosYaw;
  const camRightZ = -sinYaw;

  const rightProj = facingX * camRightX + facingZ * camRightZ;
  const fwdProj = facingX * camFwdX + facingZ * camFwdZ;
  const angle = Math.atan2(rightProj, fwdProj);

  if (angle > -Math.PI * 0.25 && angle <= Math.PI * 0.25) {
    return 'back';
  } else if (angle > Math.PI * 0.25 && angle <= Math.PI * 0.75) {
    return 'side';
  } else if (angle < -Math.PI * 0.25 && angle >= -Math.PI * 0.75) {
    return 'side_l';
  } else {
    return 'front';
  }
}

/**
 * Avança o ciclo de animação das pernas durante caminhada.
 */
export function updateWalkCycle(animState, dt, walkFps = 8, frameCount = 4) {
  animState.animTimer += dt;
  const frameInterval = 1.0 / (walkFps || 8);
  if (animState.animTimer >= frameInterval) {
    animState.animTimer = 0;
    animState.animFrame = (animState.animFrame + 1) % frameCount;
  }
}

/**
 * Restaura o estado neutro de repouso (idle com pés juntos).
 */
export function resetWalkCycle(animState) {
  animState.isMoving = false;
  animState.animFrame = 1;
  animState.animTimer = 0;
}
