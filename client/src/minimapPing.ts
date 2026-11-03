// Feedback visual e animação de destino/rota ao clicar no minimapa (F-25, #68, #70, #194, #195).
// Puro e desacoplado para testes determinísticos sem Phaser.

export interface MinimapPing {
  x: number;
  y: number;
  until: number;
}

/** Cria um marcador temporário de destino de movimentação no minimapa. */
export function createMinimapPing(x: number, y: number, now: number, durationMs = 2500): MinimapPing {
  return {
    x: Math.round(x),
    y: Math.round(y),
    until: now + durationMs,
  };
}

/** Retorna true se o ping ainda está ativo (não expirou e o jogador não chegou no tile). */
export function isPingActive(ping: MinimapPing | null, meX: number, meY: number, now: number): boolean {
  if (!ping) return false;
  if (now >= ping.until) return false;
  if (Math.round(meX) === ping.x && Math.round(meY) === ping.y) return false;
  return true;
}

/** Calcula o raio oscilante do anel de pulso no destino para renderização. */
export function pingPulseRadius(ping: MinimapPing, now: number, baseRadius = 6): number {
  const elapsed = Math.max(0, ping.until - now);
  // Onda senoidal de 400ms oscilando entre base e base + 3px
  const phase = (elapsed % 400) / 400;
  const pulse = Math.sin(phase * Math.PI) * 3;
  return Math.max(baseRadius, baseRadius + pulse);
}
