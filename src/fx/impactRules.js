// =======================================================================
// REGRA DOS EFEITOS DE IMPACTO: qual estouro cada golpe deixa no hollow
// Regra pura, sem Three.js. O desenho está em impactFx.js.
// =======================================================================

// Chave do FX que voou (ou do corte) -> estouro e tamanho no mundo. O tamanho acompanha o peso do golpe.
export const IMPACT_FOR = {
  skill_getsuga: { id: 'hit_getsuga', size: 3.2 },
  skill_byakurai: { id: 'hit_byakurai', size: 2.2 },
  skill_shakkaho: { id: 'hit_shakkaho', size: 3.0 },
  skill_cero: { id: 'hit_cero', size: 3.4 },
  skill_quincy_arrow: { id: 'hit_quincy_arrow', size: 2.0 },
  skill_directo: { id: 'hit_directo', size: 3.2 },
  skill_muerte: { id: 'hit_muerte', size: 3.6 },
  slash_combat: { id: 'hit_slash', size: 2.6 }
};

// Um Getsuga que atravessa a horda acerta dezenas de hollows; acima do teto, o estouro mais velho dá a vez.
export const IMPACT_LIMIT = 48;

export function impactFor(fxKey) {
  return Object.hasOwn(IMPACT_FOR, fxKey) ? IMPACT_FOR[fxKey] : null;
}

// Quadro do estouro no instante t, ou -1 quando ele já terminou: toca uma vez e some.
export function impactFrame(t, fps, frames) {
  const frame = Math.floor(t * fps + 1e-9);
  return frame < frames ? frame : -1;
}
