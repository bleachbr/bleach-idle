// =======================================================================
// BLEACH: SOUL SURVIVOR - GERENCIADOR DE FX E PROJÉTEIS (FXManager)
// =======================================================================
// Responsável pelo ciclo de vida, física no mundo e renderização de:
// - Auras com intervalos periódicos (bursts) e atenuação suave
// - Projéteis balísticos que avançam pelo mapa (ex: Getsuga Tenshō)
// - Efeitos de combate e dissipação gradual
// =======================================================================

import * as THREE from 'three';
import { FX_BEHAVIORS } from './fxConfig.js';

export class FXManager {
  constructor(scene, spriteTextures) {
    this.scene = scene;
    this.spriteTextures = spriteTextures;

    // Estado da Aura do Jogador
    this.auraTimer = 0;
    this.auraActive = true;
    this.auraMesh = null;
    this.auraConfig = FX_BEHAVIORS.aura_shikai;

    // Pool de Projéteis Ativos (Getsuga Tenshō, Byakurai, etc.)
    this.projectiles = [];
    this.projectileGeo = new THREE.PlaneGeometry(1.0, 1.0);
    this.projectileGeo.translate(0, 0.5, 0); // Ancorado na base do efeito

    this.initAuraMesh();
  }

  // -------------------------------------------------------------------
  // 1. INICIALIZAÇÃO DA AURA COM PULSAÇÃO PERIÓDICA (BURST)
  // -------------------------------------------------------------------
  initAuraMesh() {
    const geo = new THREE.PlaneGeometry(1.0, 1.0);
    geo.translate(0, 0.45, 0);

    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0,
      side: THREE.DoubleSide
    });

    this.auraMesh = new THREE.Mesh(geo, mat);
    this.auraMesh.visible = false;
    this.scene.add(this.auraMesh);
  }

  setAuraConfig(config) {
    this.auraConfig = { ...this.auraConfig, ...config };
  }

  // -------------------------------------------------------------------
  // 2. ATUALIZAÇÃO DA AURA (SURGE EM INTERVALOS E DEPOIS DISSIPA)
  // -------------------------------------------------------------------
  updateAura(dt, playerX, playerZ, cameraQuaternion) {
    if (!this.auraMesh || !this.auraActive) {
      if (this.auraMesh) this.auraMesh.visible = false;
      return;
    }

    const cfg = this.auraConfig;
    this.auraTimer += dt;

    // Loop do ciclo periódico (ex: 4.2 segundos no total)
    const cycleTime = this.auraTimer % cfg.pulseInterval;

    if (cycleTime <= cfg.burstDuration) {
      // DENTRO DO INTERVALO ATIVO (SURTO DE REIATSU)
      this.auraMesh.visible = true;
      this.auraMesh.position.set(playerX, 0, playerZ);
      this.auraMesh.quaternion.copy(cameraQuaternion);

      // Curva de Fade In / Fade Out
      let alpha = 1.0;
      if (cycleTime < cfg.fadeInDuration) {
        alpha = cycleTime / cfg.fadeInDuration; // Suave entrada
      } else if (cycleTime > (cfg.burstDuration - cfg.fadeOutDuration)) {
        alpha = (cfg.burstDuration - cycleTime) / cfg.fadeOutDuration; // Suave dissipação
      }
      alpha = Math.max(0, Math.min(1.0, alpha)) * cfg.maxOpacity;
      this.auraMesh.material.opacity = alpha;

      // Pulsação suave da escala
      const progress = cycleTime / cfg.burstDuration;
      const pulseScale = cfg.minScale + Math.sin(progress * Math.PI) * (cfg.maxScale - cfg.minScale);
      this.auraMesh.scale.set(pulseScale, pulseScale, 1.0);

      // Animação de quadros da aura
      const frameIdx = Math.floor(cycleTime * cfg.fps) % 4;
      const tex = this.spriteTextures[`fx_aura_shikai_${frameIdx}`];
      if (tex && this.auraMesh.material.map !== tex) {
        this.auraMesh.material.map = tex;
        this.auraMesh.material.needsUpdate = true;
      }
    } else {
      // FORA DO INTERVALO (REIATSU ACALMADO - DISSIPADO)
      this.auraMesh.visible = false;
      this.auraMesh.material.opacity = 0;
    }
  }

  // -------------------------------------------------------------------
  // 3. SPAWN DE PROJÉTEIS (GETSUGA TENSHŌ, BYAKURAI, SHAKKAHŌ)
  // -------------------------------------------------------------------
  spawnSkillProjectile(fxKey, weaponType, startX, startZ, dirX, dirZ, damage, customConfig = {}) {
    const baseCfg = FX_BEHAVIORS[fxKey] || FX_BEHAVIORS.skill_getsuga;
    const cfg = { ...baseCfg, ...customConfig };
    const mat = new THREE.MeshBasicMaterial({
      map: this.spriteTextures[`fx_${fxKey}_0`] || null,
      transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, opacity: 0.95, side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(this.projectileGeo.clone(), mat);
    mesh.position.set(startX, 0.4, startZ);
    mesh.scale.set(cfg.startScale, cfg.startScale, 1.0);
    this.scene.add(mesh);
    const proj = {
      mesh, config: cfg, fxKey, weaponType,
      x: startX, z: startZ, dirX, dirZ, damage,
      distanceTraveled: 0, lifetime: 0,
      hitEnemies: new Set(), active: true
    };
    this.projectiles.push(proj);
    return proj;
  }

  spawnGetsuga(startX, startZ, dirX, dirZ, damage, customConfig = {}) {
    return this.spawnSkillProjectile('skill_getsuga', 'getsuga', startX, startZ, dirX, dirZ, damage, customConfig);
  }

  spawnByakurai(startX, startZ, dirX, dirZ, damage, customConfig = {}) {
    return this.spawnSkillProjectile('skill_byakurai', 'byakurai', startX, startZ, dirX, dirZ, damage, customConfig);
  }

  spawnShakkaho(startX, startZ, dirX, dirZ, damage, customConfig = {}) {
    return this.spawnSkillProjectile('skill_shakkaho', 'shakkaho', startX, startZ, dirX, dirZ, damage, customConfig);
  }

  // -------------------------------------------------------------------
  // 4. ATUALIZAÇÃO DA FÍSICA E COLISÃO DOS PROJÉTEIS
  // -------------------------------------------------------------------
  updateProjectiles(dt, enemyMeshes, onHitCallback, cameraQuaternion) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) continue;

      p.lifetime += dt;
      const step = p.config.speed * dt;
      p.x += p.dirX * step;
      p.z += p.dirZ * step;
      p.distanceTraveled += step;

      // 1. Atualizar Posição no Three.js
      p.mesh.position.set(p.x, 0.45, p.z);
      // Billboard virado para a câmera para máxima visibilidade
      p.mesh.quaternion.copy(cameraQuaternion);

      // 2. Crescimento da onda ao longo da viagem
      const travelRatio = Math.min(1.0, p.distanceTraveled / p.config.maxDistance);
      const currentScale = p.config.startScale + travelRatio * (p.config.endScale - p.config.startScale);
      p.mesh.scale.set(currentScale, currentScale, 1.0);

      // 3. Animação dos quadros do efeito (dinâmico por skill)
      const frameIdx = Math.floor(p.lifetime * p.config.fps) % 4;
      const fxName = p.fxKey || 'skill_getsuga';
      const tex = this.spriteTextures[`fx_${fxName}_${frameIdx}`];
      if (tex && p.mesh.material.map !== tex) {
        p.mesh.material.map = tex;
        p.mesh.material.needsUpdate = true;
      }

      // 4. Atenuação e Dissipação suave perto do limite
      const remainingDist = p.config.maxDistance - p.distanceTraveled;
      if (remainingDist < p.config.fadeOutDist) {
        p.mesh.material.opacity = Math.max(0, remainingDist / p.config.fadeOutDist);
      }

      // 5. Verificação de Colisão com Inimigos (Hollows)
      for (const en of enemyMeshes) {
        const enemyKey = en.id !== undefined ? en.id : en;
        if (!en.active || p.hitEnemies.has(enemyKey)) continue;

        const dist = Math.hypot(en.x - p.x, en.z - p.z);
        if (dist <= p.config.hitRadius + (en.radius || 0.8)) {
          p.hitEnemies.add(enemyKey);
          onHitCallback && onHitCallback(en, p.damage, p.weaponType || 'getsuga', p.x, p.z);

          // Se não perfura, encerra o projétil no primeiro impacto
          if (!p.config.pierce) {
            p.active = false;
            break;
          }
        }
      }

      // 6. Despawn por distância máxima ou limite da arena (75m)
      const arenaDist = Math.hypot(p.x, p.z);
      if (p.distanceTraveled >= p.config.maxDistance || arenaDist >= 74.0 || !p.active) {
        p.active = false;
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }

  // Limpeza geral para troca de fases ou restart
  reset() {
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    }
    this.projectiles = [];
    this.auraTimer = 0;
  }
}
