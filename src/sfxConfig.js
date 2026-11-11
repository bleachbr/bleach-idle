// =======================================================================
// SFX DE COMBATE — REGISTRY DECLARATIVO
// Procedural agora (campo kind). Sample depois: acrescente `sample: '/arts/...'`
// sem mudar quem chama playSfx / playFxFireSfx.
// Poder/FX novo: entre em SFX_BY_FX ou o make sfx-test quebra.
// =======================================================================

export const SFX_GLOBAL_IDS = ['slash', 'hit', 'death', 'player_hurt'];

export const SFX_PRESETS = {
  slash: { kind: 'slash', gain: 0.22 },
  hit: { kind: 'hit', gain: 0.14 },
  death: { kind: 'death', gain: 0.26 },
  player_hurt: { kind: 'hurt', gain: 0.28 },
  wave: { kind: 'wave', gain: 0.22 },
  zap: { kind: 'zap', gain: 0.18 },
  boom: { kind: 'boom', gain: 0.24 },
  punch: { kind: 'punch', gain: 0.22 },
  arrow: { kind: 'arrow', gain: 0.18 },
  roar: { kind: 'roar', gain: 0.24 }
};

// Todo fx usado por arsenalShot(...).fx precisa de chave aqui.
export const SFX_BY_FX = {
  skill_getsuga: 'wave',
  skill_byakurai: 'zap',
  skill_shakkaho: 'boom',
  skill_cero: 'roar',
  skill_directo: 'punch',
  skill_muerte: 'boom',
  skill_quincy_arrow: 'arrow',
  slash_combat: 'slash'
};

export function sfxPreset(id) {
  return SFX_PRESETS[id] || null;
}

export function sfxPresetForFx(fxId) {
  const key = SFX_BY_FX[fxId];
  return key ? SFX_PRESETS[key] : null;
}
