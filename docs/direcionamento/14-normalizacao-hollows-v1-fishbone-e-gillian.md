# Direcionamento 14 — Normalização Visual dos Hollows da Versão 1: Fishbone D e Menos Grande Gillian

**Data:** 2026-11-07  
**Contexto:** Entrega 1 — Resolução Visual dos Monstros, Unificação de Horda e Eliminação de Placeholders

---

## 1. Visão Geral e Decisão de Escopo

Na versão anterior, os inimigos eram gerados proceduramente em tempo de execução via HTML5 Canvas 2D (`src/spritesheet.js`), resultando em figuras primitivas de baixa fidelidade (*Fishbone*, *Shrieker* e *Acidwire*) que destoavam da qualidade visual do Ichigo Shikai e do cenário 3D do Hueco Mundo.

Para entregar uma Versão 1 sólida, canônica e polida sem inflar a complexidade:
1. **Consolidação em 2 Tipos Canônicos:**
   - **Hollow Comum (Horda):** **Fishbone D** (`arts/walk8/fishbone_sheet.png`), o monstro inaugural do primeiro capítulo/episódio de Bleach.
   - **Chefão (Boss Clímax):** **Menos Grande / Gillian** (`arts/walk8/gillian_sheet.png`), o colossal Hollow de manto negro e máscara pontiaguda.
2. **Eliminação de Placeholders:**
   - Remoção dos mobs provisórios desenhados com formas geométricas simples.
   - Migração dos inimigos especializados com comportamentos adicionais (*Shrieker* voador e *Acidwire* com cuspe ácido) para a **Frente 2 do Roadmap**.

---

## 2. Pipeline de Processamento e Qualidade Gráfica (`walk8`)

Ambos os monstros foram processados através de `geradores/sprite_processor.py` a partir das folhas mestres oficiais em alta resolução ($2512 \times 2508\text{ px}$):

### 2.1 Fishbone D (Hollow Comum)
- **Destino Oficial:** `src/assets/monsters/fishbone/`
- **Ciclo de Caminhada:** 8 frames por direção em 4 direções (`front`, `side_l`, `side`, `back`).
- **Dimensões do Quadro:** $128 \times 128\text{ px}$
- **Variação de Altura 360°:** **3.77%** (teto permitido: 15%)
- **Ancoragem de Solo (Baseline):** $y = 117\text{ px}$ com variação (*jitter*) de **0px**.
- **Escala no Jogo:** $1.4\text{m} \times 1.4\text{m}$, destacando as garras e a máscara com orifícios canônicos sobre as dunas.

### 2.2 Menos Grande / Gillian (Chefão da Entrega 1)
- **Destino Oficial:** `src/assets/monsters/menos_grande/`
- **Ciclo de Caminhada:** 8 frames por direção em 4 direções (`front`, `side_l`, `side`, `back`).
- **Dimensões do Quadro:** $128 \times 128\text{ px}$
- **Variação de Altura 360°:** **1.87%** (teto permitido: 15%)
- **Ancoragem de Solo (Baseline):** $y = 117\text{ px}$ com variação (*jitter*) de **0px**.
- **Escala no Jogo:** $3.8\text{m} \times 3.8\text{m}$, criando a silhueta colossal de Gillian sobre o relevo noturno do Hueco Mundo.

---

## 3. Integração na Engine e Billboards 360° (`src/main.js`)

1. **Carregamento Otimizado (`loadMonsterTextures`):**
   - Sub-rotina modular que carrega as texturas neutras e os 8 quadros de animação para as 4 direções, mantendo as funções abaixo de 15 linhas de código para atender à governança `make size-check`.
2. **Spawns Limpos:**
   - `spawnHollow()`: Gera exclusivamente o Fishbone D com atributos padronizados ($45\text{ HP}$, velocidade $3.2$, escala $1.4$).
   - `spawnBossMenosGrande()`: Gera a instância individual do Menos Grande Gillian ($2000\text{ HP}$, escala $3.8$).
3. **Billboarding Dinâmico com Animação de Passos:**
   - A função `updateEnemyBillboard(en, walkFrame)` calcula a orientação vetorial do Hollow em relação ao ângulo horizontal da câmera (`getSpriteDirection`) e atualiza o quadro da animação de caminhada (`en.type + '_' + eDir + '_' + walkFrame`) a 8 FPS.

---

## 4. Integração no 360° Sprite Studio (`preview.html`)

O Estúdio 360° de Sprites (`/preview.html`) foi atualizado para inspecionar os dois monstros em tempo real:
- Seleção de `fishbone` e `menos_grande` no menu suspenso.
- Rotação livre de câmera em 360° com slider e atalhos rápidos (Frente, Lado, Costas).
- Reprodução contínua da passada de 8 quadros com controle de FPS.
