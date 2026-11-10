// =======================================================================
// BLEACH: SOUL SURVIVOR - SISTEMA DE ATRIBUTOS RPG & SINERGIAS DE BUILD
// Motor matemático puro para cálculo de atributos, sinergias e limites
// =======================================================================

export const MAX_WEAPONS_SLOTS = 3;
export const MAX_PASSIVES_SLOTS = 4;
export const MAX_ITEM_LEVEL = 5;

export const BASE_PLAYER_STATS = {
  maxHp: 100,
  speed: 6.2,
  attackPowerMult: 1.0,
  haste: 0,
  hierroDef: 0,
  kaidoRegen: 0.0,
  magnetRadius: 3.5
};

export const WEAPON_DEFINITIONS = {
  asauchi: { id: 'asauchi', name: 'Corte de Asauchi', icon: '⚔️', type: 'melee', baseDamage: 35, baseCd: 1.0, dmgPerLevel: 15, cdPerLevel: -0.05 },
  getsuga: { id: 'getsuga', name: 'Getsuga Tenshō', icon: '🌙', type: 'ranged', baseDamage: 180, baseCd: 2.8, dmgPerLevel: 45, cdPerLevel: -0.15 },
  byakurai: { id: 'byakurai', name: 'Hadō #4 Byakurai', icon: '⚡', type: 'ranged', baseDamage: 45, baseCd: 2.2, dmgPerLevel: 20, cdPerLevel: -0.12 },
  shakkaho: { id: 'shakkaho', name: 'Hadō #31 Shakkahō', icon: '🔥', type: 'aoe', baseDamage: 70, baseCd: 3.5, dmgPerLevel: 25, cdPerLevel: -0.18 }
};

// Cada personagem chama as quatro armas por outro nome e ícone (src/arsenal.js).
export function applyWeaponLabels(labels) {
  for (const [key, label] of Object.entries(labels)) {
    if (WEAPON_DEFINITIONS[key]) Object.assign(WEAPON_DEFINITIONS[key], label);
  }
}

export const PASSIVE_DEFINITIONS = {
  reiatsu: { id: 'reiatsu', name: 'Pressão Espiritual', icon: '💎', stat: 'FOR', desc: '+20% dano espiritual por nível', valuePerLevel: 0.20 },
  shunpo: { id: 'shunpo', name: 'Passo Relâmpago', icon: '👟', stat: 'DES', desc: '+12% velocidade e +15 Aceleração (CDR)', valuePerLevel: 0.12, hastePerLevel: 15 },
  hierro: { id: 'hierro', name: 'Armadura de Hierro', icon: '🛡️', stat: 'DEF', desc: '+25 Hierro (mitigação com retornos decrescentes)', valuePerLevel: 25 },
  kaido: { id: 'kaido', name: 'Arte Curativa Kaidō', icon: '💚', stat: 'REG', desc: '+1.5 HP/s de regeneração contínua', valuePerLevel: 1.5 },
  magnet: { id: 'magnet', name: 'Vórtice de Reishi', icon: '🧲', stat: 'MAG', desc: '+2.5m alcance magnético de esferas', valuePerLevel: 2.5 }
};

export function createInitialBuildState() {
  return {
    weapons: {
      asauchi: { level: 1, timer: 0, totalDamage: 0 },
      getsuga: { level: 1, timer: 0.8, totalDamage: 0 },
      byakurai: { level: 0, timer: 0, totalDamage: 0 },
      shakkaho: { level: 0, timer: 0, totalDamage: 0 }
    },
    passives: {
      reiatsu: 0,
      shunpo: 0,
      hierro: 0,
      kaido: 0,
      magnet: 0
    }
  };
}

export function getEquippedWeaponsCount(weaponsState) {
  return Object.values(weaponsState).filter(w => w.level > 0).length;
}

export function getEquippedPassivesCount(passivesState) {
  return Object.values(passivesState).filter(lvl => lvl > 0).length;
}

export function calculateAbilityHaste(passivesState) {
  const shunpoLevel = passivesState.shunpo || 0;
  return shunpoLevel * (PASSIVE_DEFINITIONS.shunpo.hastePerLevel || 15);
}

export function calculateCdrPercent(haste) {
  const rawCdr = (haste / (100 + haste)) * 100;
  return Math.min(65.0, Math.round(rawCdr * 10) / 10);
}

export function getEffectiveCooldown(baseCd, haste) {
  const cdMultiplier = Math.max(0.35, 100 / (100 + haste));
  return Math.max(0.25, baseCd * cdMultiplier);
}

export function calculateHierroMitigationPercent(hierroValue) {
  if (hierroValue <= 0) return 0.0;
  const reduction = 1.0 - (100 / (100 + hierroValue));
  const capped = Math.min(0.75, reduction);
  return Math.round(capped * 1000) / 10;
}

export function applyHierroDamageMitigation(incomingDamage, hierroValue) {
  if (hierroValue <= 0) return incomingDamage;
  const reduction = 1.0 - (100 / (100 + hierroValue));
  const multiplier = Math.max(0.25, 1.0 - Math.min(0.75, reduction));
  return Math.max(1, Math.round(incomingDamage * multiplier));
}

export function calculateKaidocappedRegen(level, maxHp) {
  if (level <= 0) return 0.0;
  const rawRegen = level * PASSIVE_DEFINITIONS.kaido.valuePerLevel;
  const maxAllowedRegen = maxHp * 0.04;
  return Math.min(rawRegen, maxAllowedRegen);
}

export function calculateEffectiveStats(baseStats, passivesState) {
  const p = passivesState || {};
  const haste = calculateAbilityHaste(p);
  const cdrPercent = calculateCdrPercent(haste);
  const hierroPoints = (p.hierro || 0) * PASSIVE_DEFINITIONS.hierro.valuePerLevel;
  const defMitigation = calculateHierroMitigationPercent(hierroPoints);
  const speedBonus = 1.0 + (p.shunpo || 0) * PASSIVE_DEFINITIONS.shunpo.valuePerLevel;
  const atkMult = 1.0 + (p.reiatsu || 0) * PASSIVE_DEFINITIONS.reiatsu.valuePerLevel;
  const regen = calculateKaidocappedRegen(p.kaido || 0, baseStats.maxHp);
  const magnet = baseStats.magnetRadius + (p.magnet || 0) * PASSIVE_DEFINITIONS.magnet.valuePerLevel;
  return {
    atkMult, speed: baseStats.speed * speedBonus, haste,
    cdrPercent, hierroPoints, defMitigation, regenHpSec: regen, magnetRadius: magnet
  };
}

export function detectActiveSynergies(weaponsState, passivesState) {
  const synergies = [];
  const w = weaponsState;
  const p = passivesState;
  if (w.getsuga?.level > 0 && p.reiatsu >= 2) {
    synergies.push({ id: 'getsuga_reiatsu', name: 'Getsuga Devastador', icon: '🌙💥', desc: 'Getsuga ampliado com +30% dano crítico adicional e corte mais largo.' });
  }
  if (w.byakurai?.level > 0 && p.shunpo >= 2) {
    synergies.push({ id: 'byakurai_shunpo', name: 'Relâmpago Instantâneo', icon: '⚡👟', desc: 'Hadō #4 Byakurai dispara em linha com recarga super acelerada.' });
  }
  if (w.shakkaho?.level > 0 && p.magnet >= 2) {
    synergies.push({ id: 'shakkaho_vortex', name: 'Vórtice Incandescente', icon: '🔥🧲', desc: 'Explosões de Shakkahō sugam almas e Hollows para o epicentro.' });
  }
  if (p.hierro >= 2 && p.kaido >= 2) {
    synergies.push({ id: 'hierro_kaido', name: 'Muralha Espiritual', icon: '🛡️💚', desc: 'Resistência de Hierro e Kaidō concedem sobrevivência máxima em combate.' });
  }
  return synergies;
}

export function determineBuildOrientation(weaponsState, passivesState) {
  const p = passivesState;
  const offensivePoints = (p.reiatsu || 0) * 2 + (weaponsState.getsuga?.level || 0) + (weaponsState.shakkaho?.level || 0);
  const agilityPoints = (p.shunpo || 0) * 2 + (weaponsState.byakurai?.level || 0) + (weaponsState.asauchi?.level || 0);
  const defensivePoints = (p.hierro || 0) * 2 + (p.kaido || 0) * 2;
  if (defensivePoints >= 4 && defensivePoints >= offensivePoints && defensivePoints >= agilityPoints) {
    return { name: '🛡️ HIERRO DEFENSIVO', class: 'defensive', desc: 'Foco em mitigação, regeneração e sobrevivência.' };
  }
  if (agilityPoints >= 4 && agilityPoints >= offensivePoints) {
    return { name: '⚔️ MELEE & SHUNPO', class: 'agility', desc: 'Foco em combate ágil, golpes rápidos e mobilidade.' };
  }
  if (offensivePoints >= 4) {
    return { name: '🔮 KIDŌ DESTRUIDOR', class: 'offensive', desc: 'Foco em alto dano espiritual à distância e em área.' };
  }
  return { name: '⚖️ SHINIGAMI EQUILIBRADO', class: 'balanced', desc: 'Desenvolvimento balanceado de atributos e artes.' };
}
