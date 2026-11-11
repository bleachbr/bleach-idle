// =======================================================================
// Gatilhos de SFX no combate — main só chama, não sintetiza.
// =======================================================================

import { playSfx, playFxFireSfx, playHitSfx } from './sfx.js';

export function onSlashFire() {
  playSfx('slash');
}

export function onSkillFire(fxId) {
  playFxFireSfx(fxId);
}

export function onEnemyHit() {
  playHitSfx();
}

export function onEnemyDeath() {
  playSfx('death');
}

export function onPlayerHurtSfx() {
  playSfx('player_hurt');
}
