// =======================================================================
// BLEACH: SOUL SURVIVOR - SISTEMA DE CONFIGURAÇÃO ESCALÁVEL DE FX
// =======================================================================
// Este arquivo desacopla a arte visual das regras comportamentais de cada efeito.
// Permite que milhares de personagens e itens customizem intervalos, velocidade,
// raio de impacto e dissipação sem tocar nos geradores ou no código central.
// =======================================================================

export const FX_BEHAVIORS = {
  // 1. AURA DE REIATSU (Attached Burst: Pulsa periodicamente e dissipa)
  aura_shikai: {
    type: 'attached_burst',
    pulseInterval: 4.2,   // Período total entre ciclos (surge a cada 4.2 segundos)
    burstDuration: 1.5,   // Tempo total visível durante o surto de energia
    fadeInDuration: 0.25, // Transição suave de entrada
    fadeOutDuration: 0.50,// Dissipação suave
    maxOpacity: 0.85,
    minScale: 2.3,
    maxScale: 2.9,
    fps: 10,
    blendMode: 'additive'
  },

  // 2. CORTE DE COMBATE MELEE (Oneshot rápido no arco frontal)
  slash_combat: {
    type: 'melee_arc',
    duration: 0.24,
    offsetDist: 1.3,
    baseScale: [3.4, 3.4],
    fps: 16,
    blendMode: 'additive'
  },

  // 3. GETSUGA TENSHŌ (Projétil que viaja pelo mapa rasgando o solo)
  skill_getsuga: {
    type: 'traveling_projectile',
    speed: 18.5,          // Velocidade em unidades/segundo
    maxDistance: 32.0,    // Distância máxima até dissipação completa
    hitRadius: 2.2,       // Raio de dano circular
    pierce: true,         // Atravessa múltiplos Hollows em linha
    startScale: 2.0,      // Começa na ponta da espada
    endScale: 3.8,        // Cresce conforme viaja pelo mapa
    fadeInDist: 1.5,
    fadeOutDist: 6.0,     // Começa a dissipar suavemente no final do trajeto
    fps: 12,
    blendMode: 'additive'
  },

  // 4. HADŌ #4 BYAKURAI (Raio Perfurante de alta velocidade)
  skill_byakurai: {
    type: 'traveling_projectile',
    speed: 28.0,
    maxDistance: 30.0,
    hitRadius: 1.6,
    pierce: true,
    startScale: 1.8,
    endScale: 2.2,
    fadeInDist: 1.0,
    fadeOutDist: 4.0,
    fps: 12,
    blendMode: 'additive'
  },

  // 5. HADŌ #31 SHAKKAHŌ (Esfera Explosiva de Fogo)
  skill_shakkaho: {
    type: 'traveling_projectile',
    speed: 16.0,
    maxDistance: 25.0,
    hitRadius: 2.8,
    pierce: false,
    startScale: 2.0,
    endScale: 3.2,
    fadeInDist: 1.0,
    fadeOutDist: 5.0,
    fps: 10,
    blendMode: 'additive'
  },

  // 6. CUSPE ÁCIDO DO ACIDWIRE (projétil inimigo em arco, mira onde o jogador estava)
  hollow_acid_spit: {
    type: 'enemy_projectile',
    speed: 10.0,
    maxDistance: 16.0,
    hitRadius: 0.8,
    startHeight: 1.4,     // Sai da boca, não do chão
    arcHeight: 1.1,       // Altura extra no meio do trajeto
    scale: 0.9,
    popDuration: 0.25,    // Estouro ao bater ou ao fim do alcance
    popScale: 2.2,
    blendMode: 'additive'
  }
};
