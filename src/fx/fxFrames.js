// =======================================================================
// QUADROS DOS EFEITOS EM LAÇO (aura e voo dos projéteis)
// Regra pura, sem Three.js. Quantos quadros um FX tem vem das texturas carregadas
// (fx_<id>_<n>, a partir do FX_REGISTRY), não de um número fixo no laço.
// =======================================================================

export function fxFrameCount(textures, fxId) {
  let count = 0;
  while (textures[`fx_${fxId}_${count}`]) count++;
  return Math.max(1, count);
}

export function fxFrameIndex(t, fps, count) {
  return Math.floor(t * fps + 1e-9) % count;
}
