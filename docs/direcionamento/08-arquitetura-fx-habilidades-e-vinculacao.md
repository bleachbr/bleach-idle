# 08 - Arquitetura de FX, Habilidades e Vinculação com Personagens

Este documento detalha o modelo arquitetural para **efeitos visuais (FX), auras de Reiatsu, golpes de combate e habilidades especiais** no projeto **Bleach: Soul Survivor**, estabelecendo as diretrizes dos geradores e o roteiro de refatoração para a versão completa.

---

## 1. O Desafio: Ações e Poderes Além da Caminhada

Em jogos de ação estilo *survivor / RPG*, os personagens não se limitam ao ciclo de caminhada (`walk`). Eles interagem com o mundo por meio de:
1. **Auras e Transformações**: Pressão espiritual (*Reiatsu*), modo Bankai, Hollowficação.
2. **Golpes de Combate**: Arcos de corte da lâmina (*katana slashes*), impactos de impacto físico, faíscas de colisão.
3. **Projéteis e Habilidades Mágicas**: *Getsuga Tenshō*, *Hadō #4 Byakurai*, *Cero*, ondas de choque.

Se tentarmos incorporar esses efeitos diretamente no sprite do personagem, geramos dois problemas graves:
- **Explosão combinatória de assets**: Teríamos que redesenhar o personagem andando com aura, sem aura, cortando, atirando em 4 direções.
- **Perda de dinamismo**: A lâmina ou projétil não poderia ter escala independente, blend modes aditivos ou rotação livre de 360°.

### Solução Arquitetural: Camadas Modulares (Decoupled FX Layers)
O personagem permanece limpo (apenas corpo e animação mecânica), e os **efeitos visuais são tratados como entidades modulares sobrepostas ou disparadas**:

```
                  [ CÂMERA ORBITAL 360° ]
                             |
         +-------------------+-------------------+
         |                   |                   |
  [ LAYER 1: AURA ]   [ LAYER 2: CORPO ]   [ LAYER 3: SLASH/SKILL ]
    Mesh Additive      Billboard Opaco       Mesh Direcional
   (Pulsando no pé)     (8-frame walk)      (Animando no ataque)
```

---

## 2. Taxonomia dos Efeitos Visuais (Os 3 Tipos de FX)

Com base nos assets analisados (`arts/64_fx_aura.png`, `arts/62_fx_combat.png`, `arts/63_fx_skills.png`), definimos 3 categorias fundamentais:

| Tipo de FX | Comportamento | Blend Mode | Ciclo de Vida | Exemplo no Bleach |
| :--- | :--- | :--- | :--- | :--- |
| **1. Attached Aura** | Segue a posição $[x, y, z]$ do jogador | `THREE.AdditiveBlending` | Loop contínuo (8-10 FPS) | `aura_shikai` (Reiatsu azul), `aura_hollow` (Reiatsu carmesim) |
| **2. Combat Slash** | Surge à frente do personagem no ângulo do golpe | `THREE.AdditiveBlending` | Oneshot rápido (4 quadros a 14-16 FPS) | `slash_combat` (Corte da Zangetsu) |
| **3. World Projectile** | Entidade independente com velocidade e colisão | `THREE.AdditiveBlending` | Viaja no mundo até colidir ou expirar | `skill_getsuga` (Onda de choque Getsuga) |

---

## 3. Pipeline no Gerador (`geradores/sprite_processor.py`)

O processador genérico suporta a categoria `--category fx`:
```bash
python3 geradores/sprite_processor.py \
  --input arts/64_fx_aura.png \
  --name aura_shikai \
  --category fx \
  --row 1 \
  --fx-type aura \
  --approve
```

### O que o gerador executa automaticamente:
1. **Fatiamento de Linha (`process_fx_animation`)**: Extrai os 4 quadros da linha selecionada (0 a 3).
2. **Limpeza de Fundo e Despill**: Remove o fundo magenta `#FF00FF` e atenua bordas roxas.
3. **Normalização Centralizada**: Centraliza o efeito no quadro de 128x128 sem ancoragem no solo (efeitos flutuam ou envolvem o centro).
4. **Geração de Manifesto (`manifest.json`)**: Salva metadados de Three.js (`blendMode: additive`, `worldScale: [2.6, 2.6]`, `frameCount: 4`).
5. **Atualização Automática**: Registra em `FX_REGISTRY` em [src/characters.js](../../src/characters.js).

---

## 4. Modelo de Vinculação (Character-to-FX Binding)

A vinculação entre personagens e seus poderes é declarativa no arquivo [src/characters.js](../../src/characters.js):

```javascript
export const PLAYABLE_CHARACTERS = {
  "ichigo_shikai": {
    "id": "ichigo_shikai",
    "name": "Ichigo Shikai",
    "format": "walk8",
    "frameCount": 8,
    "fps": 10,
    "worldScale": [2.2, 2.2],
    // Vínculo oficial de FX:
    "fx": {
      "aura": "aura_shikai",           // Row 1 de 64_fx_aura.png
      "attack": "slash_combat",        // Row 0 de 62_fx_combat.png
      "skill": "skill_getsuga"         // Row 0 de 63_fx_skills.png
    }
  }
};

export const FX_REGISTRY = {
  "aura_shikai": {
    "id": "aura_shikai",
    "category": "fx",
    "type": "aura",
    "frameCount": 4,
    "fps": 10,
    "blendMode": "additive",
    "worldScale": [2.6, 2.6]
  },
  "slash_combat": {
    "id": "slash_combat",
    "category": "fx",
    "type": "combat",
    "frameCount": 4,
    "fps": 14,
    "blendMode": "additive",
    "worldScale": [3.2, 3.2]
  }
};
```

---

## 5. Implementação no Three.js ([src/main.js](../../src/main.js))

1. **Aura de Reiatsu**:
   - Mesh: `playerAuraMesh` (`PlaneGeometry(2.6, 2.6)`).
   - Material: `MeshBasicMaterial` com `blending: THREE.AdditiveBlending` e `opacity: 0.65`.
   - Orientação: `quaternion.copy(camera.quaternion)` (sempre visível em 360°).
   - Animação: `Math.floor(state.time * 8) % 4`.

2. **Corte de Combate (*Slash*)**:
   - Mesh: `slashMesh` (`PlaneGeometry(3.2, 3.2)` rotacionado no plano XZ).
   - Posicionamento dinâmico: `player.x + player.dirX * 1.2, 0.45, player.z + player.dirZ * 1.2`.
   - Orientação: `rotation.y = -Math.atan2(player.dirZ, player.dirX)`.
   - Avanço de quadros: Cicla de `frame_0` a `frame_3` em 0.2 segundos e apaga.

---

## 6. Aprendizados e Caminhos de Refatoração para a Versão Oficial

Para a evolução além deste protótipo, os seguintes pilares devem ser refatorados:

### A) Pool de Projéteis e Entidades FX (Object Pooling)
- **Problema no protótipo:** Usamos 1 malha estática de slash.
- **Refatoração para versão final:** Criar uma classe `FXSystem` com pool pré-alocado de 50 instâncias reutilizáveis (`Particle/Billboard Pool`), evitando *garbage collection* durante batalhas intensas contra centenas de Hollows.

### B) Sistema de Habilidades Orientado a Dados (Ability System)
- Criar pasta `src/abilities/` onde cada habilidade (ex: `getsuga_tenshou.js`) define:
  - Custo de Reiatsu / Cooldown.
  - Comportamento de spawn do projétil (velocidade, trajetória em linha reta ou parábola).
  - Caixa de colisão e efeitos sonoros vinculados.

### C) Sincronização Multiplayer (Netcode)
- Efeitos visuais puramente cosméticos (auras, faíscas) **não devem trafegar pelo servidor de rede**.
- O servidor de jogo apenas envia: `Event: SkillFired { charId: 1, skillId: 'slash', angle: 1.57 }`.
- Cada cliente local instancia a animação visual correspondente de forma desacoplada e fluida.
