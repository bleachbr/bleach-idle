# 02 - Extração e Espelhamento de Mapas: Do PokéBonk para o Bleach

Este documento detalha o funcionamento exato do sistema de mapas do **PokéBonk** e o método para extrair seus padrões ou espelhar a mesma tecnologia no desenvolvimento dos cenários de **Bleach**.

---

## 1. Como o PokéBonk Constrói os Mapas

A análise do código revelou que o mapa **NÃO** é uma modelagem 3D estática gigante (`.glb`/`.gltf`), mas sim um **terreno procedural estruturado em malha de altura (Heightmap)** combinado com **texturas de terreno (Splatting)** e **props decorativos em atlas 2D billboard**.

### 1.1. Estrutura de Arquivos de um Bioma
Cada bioma no PokéBonk é servido em um pacote padronizado:
```
assets/env/<nome_bioma>/
  ├── atlas.json       # Coordenadas UV de todos os objetos decorativos
  ├── atlas.png        # Imagem atlas com árvores, pedras, grama, postes
  ├── ground.png       # Textura do chão plano (grama, asfalto ou terra)
  ├── cliff.png        # Textura das paredes/penhascos rochosos
  └── path.png         # Textura de caminhos/trilhas centrais
```

Exemplo real inspecionado do `atlas.json` do PokéBonk:
```json
{
  "w": 2048, "h": 128,
  "sprites": {
    "tree0": { "x": 0, "y": 0, "w": 43, "h": 61 },
    "boulder": { "x": 393, "y": 0, "w": 42, "h": 35 },
    "tallgrass": { "x": 318, "y": 0, "w": 33, "h": 32 }
  }
}
```

### 1.2. Tipos de Mapa: Abertos vs Arenas Fechadas
No PokéBonk existem dois modos:
1. **Mundo Aberto:** Terreno infinito gerado por blocos de ruído.
2. **Arena Fechada (`arenaR = radius - 1`):** Uma cúpula ou clareira com raio definido (ex: $140\text{ a }280$ unidades de diâmetro), limitada por barreiras físicas (penhascos ou paredes invisíveis). **É exatamente este formato que utilizaremos na Versão 1 de Bleach.**

---

## 2. O Pipeline de Renderização do Terreno

### 2.1. Malha de Altura (Heightmap Mesh)
* É gerada uma grade de vértices `THREE.PlaneGeometry(worldSize, worldSize, segments, segments)` orientada horizontalmente no plano XZ.
* Um array `heights = new Float32Array((res + 1) * (res + 1))` armazena a elevação Y de cada vértice.
* Para uma **Arena Fechada**, as bordas externas possuem elevação alta súbita (paredes/barricadas) ou delimitação de colisão circular `sqrt(x² + z²) > arenaR`.

### 2.2. Shader do Terreno (Multi-Texture Splatting)
O shader do terreno mistura dinamicamente as texturas sem costuras:
* **Planície (Normal Y alta):** Aplica `ground.png`.
* **Declives / Penhascos (Normal Y baixa / declive > 35°):** Mistura automaticamente para `cliff.png`.
* **Caminhos Centrais:** Usa uma máscara `pathMask` para pintar `path.png`.

### 2.3. Dispersão de Props Decorativos (Scatter Props)
Com base em uma semente determinística (`seed`):
* Objetos do `atlas.png` são instanciados em posições aleatórias válidas (fora de caminhos e com colisão registrada).
* Cada árvore/poste possui propriedades:
  * `scale`: tamanho no mundo 3D.
  * `sway`: balanço sutil com o vento no vertex shader (`sin(uTime * 2.0 + pos.x) * sway`).
  * `collider`: raio de colisão física para o jogador e inimigos não atravessarem.
  * `shadow`: raio da mancha de sombra projetada no chão.

---

## 3. Espelhamento do Mapa para a Versão 1 de Bleach (Arena de Karakura)

Para a **Versão 1**, construiremos o mapa fechado: **Distrito Residencial de Karakura Town**:

### 3.1. Equivalência de Assets
| Asset no PokéBonk | Equivalente no Bleach (Karakura Town) |
| :--- | :--- |
| `ground.png` | **Asfalto urbano com demarcações e calçadas de concreto cinza.** |
| `cliff.png` | **Muros de concreto, paredes de tijolo e barricadas urbanas.** |
| `path.png` | **Faixa de pedestres, meio-fio e calçadão de pedra.** |
| `atlas.png` (Props) | **Postes elétricos japoneses com fiação, máquinas de venda automática (vending machines), hidrantes, placas de trânsito, cercas de arame, lixeiras e crateras de destruição espiritual.** |

### 3.2. Estrutura de Delimitação da Arena Fechada
* **Raio da Arena:** 90 metros de raio circular ($180\text{ m}$ de diâmetro).
* **Limites:** Muros altos com fitas de isolamento espiritual e postes delimitando a barreira da Associação de Shinigamis.
* **Barreira Invisível / Física:**
  ```javascript
  const ARENA_RADIUS = 85.0;
  function constrainToArena(pos) {
    const distSq = pos.x * pos.x + pos.z * pos.z;
    if (distSq > ARENA_RADIUS * ARENA_RADIUS) {
      const angle = Math.atan2(pos.z, pos.x);
      pos.x = Math.cos(angle) * ARENA_RADIUS;
      pos.z = Math.sin(angle) * ARENA_RADIUS;
    }
  }
  ```

### 3.3. Clima e Atmosfera
* Céu noturno com iluminação de luar e névoa leve (`uFogColor: #0f1320`, `uFogNear: 35.0`, `uFogFar: 85.0`).
* Postes de luz emitindo iluminação suave no chão em pontos estratégicos.
