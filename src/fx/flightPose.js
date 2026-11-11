// =======================================================================
// POSE DO DESENHO DO PROJÉTIL NA TELA
// Todo desenho de projétil aponta para a direita. Dada a direção do voo no chão e a rotação da
// câmera, devolve o giro no plano da tela e se o desenho espelha. Voando para a esquerda, espelha
// em vez de girar 180°, para nada ficar de cabeça para baixo. orient 'flip' só espelha (desenho
// que não deve inclinar, como a caveira). Regra pura: o FXManager aplica no plano do Three.js.
// =======================================================================

// Leva o vetor do mundo para o espaço da câmera (x para a direita, y para cima): gira pelo
// inverso do quatérnio, que para quatérnio unitário é o conjugado.
function toCameraSpace(vx, vy, vz, q) {
  const qx = -q.x, qy = -q.y, qz = -q.z, qw = q.w;
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  return {
    x: vx + qw * tx + (qy * tz - qz * ty),
    y: vy + qw * ty + (qz * tx - qx * tz)
  };
}

export function flightPose(dirX, dirZ, cameraQuaternion, orient) {
  const view = toCameraSpace(dirX, 0, dirZ, cameraQuaternion);
  const mirrored = view.x < 0;
  const angle = orient === 'flip' ? 0 : Math.atan2(view.y, Math.abs(view.x));
  return { mirrored, angle: mirrored ? -angle : angle };
}
