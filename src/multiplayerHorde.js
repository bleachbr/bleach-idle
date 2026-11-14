// Client shared-horde synchronization bridge.
import { configureHollow } from './hollowTypes.js';
import { reconcileSharedHollows, reconcileSharedReishi } from './multiplayerHordeLogic.js';
import { registerSharedHordeHandler } from './multiplayerPresence.js';

let hordeCtx = null;

function spawnSharedEnemy(snap) {
  const en = hordeCtx.enemyMeshes.find((e) => !e.active && !e.dying);
  if (!en) return;
  en.serverId = snap.id;
  en.x = snap.x;
  en.z = snap.z;
  en.active = true;
  configureHollow(en, snap.type || 'fishbone', Boolean(snap.isElite), { hpMult: 1, speedMult: 1, dmgMult: 1 });
  en.hp = snap.hp;
  en.maxHp = snap.maxHp;
  en.isBoss = Boolean(snap.isBoss);
  en.targetPlayerId = null;
  en.damageContributions = {};
  hordeCtx.setupHollowMesh(en);
}

function updateSharedEnemy(en, snap) {
  en.x += (snap.x - en.x) * 0.45;
  en.z += (snap.z - en.z) * 0.45;
  en.hp = snap.hp;
  en.maxHp = snap.maxHp;
  en.mesh.position.set(en.x, hordeCtx.getTerrainHeight(en.x, en.z), en.z);
}

function despawnSharedEnemy(en) {
  en.active = false;
  en.serverId = null;
  en.mesh.visible = false;
}

function removeReishiDrop(idx) {
  const r = hordeCtx.reishiDrops[idx];
  if (!r) return;
  hordeCtx.reishiGroup.remove(r.mesh);
  r.mesh.geometry.dispose();
  r.mesh.material.dispose();
  hordeCtx.reishiDrops.splice(idx, 1);
}

export function bindSharedHordeContext(ctx) {
  hordeCtx = ctx;
  registerSharedHordeHandler((sharedHollows) => {
    if (!hordeCtx || !sharedHollows) return;
    reconcileSharedHollows(hordeCtx.enemyMeshes, sharedHollows.hollows, {
      onSpawn: spawnSharedEnemy,
      onUpdate: updateSharedEnemy,
      onDespawn: despawnSharedEnemy
    });
    reconcileSharedReishi(hordeCtx.reishiDrops, sharedHollows.reishiDrops, {
      onSpawn: (d) => hordeCtx.spawnReishi(d.x, d.z, d.amount, d.ownerPlayerId, d.id),
      onRemove: removeReishiDrop
    });
  });
}
