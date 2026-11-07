# 01 - Engenharia Reversa Completa do PokéBonk (https://pokebonk.com)

Este documento registra a análise técnica e aprofundada da arquitetura do jogo **PokéBonk**, obtida através da descompilação e análise dos bundles de produção (`main.js`, `menus.js`, `defineProperty.js`, shaders e assets).

---

## 1. Visão Geral da Arquitetura

O PokéBonk é um **Survivor Roguelite 3D** (no estilo *Vampire Survivors*) que roda diretamente no navegador via **WebGL 2.0 / WebGL 1.0**.

* **Engine:** Three.js customizado / tree-shaken (`three.js`).
* **Paradigma de Dados:** **Data-Oriented Design (DoD) / Structure of Arrays (SoA)** com TypedArrays para cálculo de física, movimento e separação de hordas.
* **Capacidade de Entidades:** Gerencia com estabilidade até **2.200 inimigos simultâneos a 60 FPS** (`Eh = 2200`).
* **Estilo Visual:** Personagens em **Pixel Art 2.5D com Billboarding 8-direcional** posicionados sobre um terreno 3D com malha de altura (heightmap), texturas mescladas (splatting) e props decorativos em atlas.

---

## 2. Configuração de Câmera e Viewport

A perspectiva do jogo não é nem ortográfica pura nem isométrica clássica, mas sim uma perspectiva 3D calibrada para valorizar os sprites em pixel art:

| Parâmetro | Valor no Código | Descrição |
| :--- | :--- | :--- |
| **Tipo de Câmera** | `THREE.PerspectiveCamera` | Projeção em perspectiva com profundidade real. |
| **FOV (Campo de Visão)** | `70.0°` | Ajustável nas configurações entre $60^\circ$ e $100^\circ$. |
| **Pitch (Inclinação)** | `0.45 rad` (~$26^\circ$) | Ângulo de inclinação vertical apontado para o chão. |
| **Yaw (Rotação Horizontal)**| `0.0 rad` | Segue o jogador suavemente. |
| **Distância (`camDist`)** | `9.0 unidades` | Distância padrão do alvo (ajustável de $4.5$ a $26.0$). |
| **Suavização (Lerp)** | `camTarget` | Interpolação suave em direção à posição do jogador (`player.pos`). |

---

## 3. Sistema de Billboarding e Shaders de Sprite

Em vez de renderizar planos perpendiculares à câmera a $90^\circ$ (o que causaria achatamento excessivo e problemas de corte com o chão), o PokéBonk utiliza um **Shader Customizado de Billboard com Inclinação (`uLean`)**:

### 3.1. Vertex Shader (`Rp`)
```glsl
attribute vec3 iPos;
attribute vec2 iSize;
attribute vec4 iUV;
attribute vec4 iFx;     // x: hitFlash, y: dissolve, z: outlineCode, w: squash
attribute vec4 iTint;
attribute vec2 iLook;

uniform float uLean;    // Valor padrão: 0.35
uniform vec2 uTexel;

varying vec2 vUv;
varying vec4 vFx;
varying vec4 vTint;
varying float vFogDepth;
varying vec4 vRect;
varying vec2 vLocal;

void main() {
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 up    = normalize(mix(vec3(0.0, 1.0, 0.0), camUp, uLean));

  // iFx.w: squash & stretch dinâmico (-1.0 a 1.0)
  float sq = iFx.w;
  vec2 size = iSize * vec2(1.0 + sq * 0.35, 1.0 - sq * 0.3);

  vec3 world = iPos + right * (position.x * size.x) + up * (position.y * size.y);
  vec4 mv = viewMatrix * vec4(world, 1.0);

  // Offset contra z-fighting e corte dos pés no relevo
  mv.z += 0.25 + iSize.y * 0.05;

  gl_Position = projectionMatrix * mv;
  vUv = vec2(mix(iUV.x, iUV.z, uv.x), mix(iUV.y, iUV.w, uv.y));
  vRect = vec4(min(iUV.x, iUV.z), min(iUV.y, iUV.w), max(iUV.x, iUV.z), max(iUV.y, iUV.w));
  vLocal = uv;
  vFx = iFx;
  vTint = iTint;
  vFogDepth = -mv.z;
}
```

### 3.2. Fragment Shader (`zp`) - Efeitos Integrados
1. **Contorno por Amostragem de Texels:** Detecta bordas transparentes sem necessidade de passagens extras na GPU:
   * `0.0`: Sem contorno (mobs comuns).
   * `1.0`: Dourado (Inimigos Elites).
   * `2.0`: Vermelho Carmesim (Chefes/Alphas).
   * `3.0`: Branco Brilhante (Jogador).
   * `4.0`: Ciano (Invocados/Aliados).
   * `5.0+`: Arco-íris / Shinies.
2. **Dissolvência de Morte com Borda Brilhante:**
   ```glsl
   float diss = vFx.y;
   if (diss > 0.0) {
     float n = hash(floor(vUv / uTexel));
     if (n < diss) discard;
     if (n < diss + 0.12) {
       gl_FragColor = vec4(vec3(1.0, 0.95, 0.7) * 2.2, 1.0); // HDR que aciona Bloom
       return;
     }
   }
   ```
3. **Hit Flash:** Quando o inimigo toma dano, `vFx.x` vai para `1.0` por ~80ms, transformando o sprite em branco puro (`mix(col, vec3(1.0), vFx.x)`).
4. **Filtro de Textura:** `magFilter = NearestFilter` e `minFilter = NearestFilter` sem mipmaps, garantindo fidelidade pixel-perfect.

---

## 4. O Sistema de Hordas e Flocking (SoA)

Para processar milhares de monstros sem queda de frames:
* **Array Plano de Entidades (`Eh = 2200`):**
  * `posX[2200]`, `posY[2200]`, `posZ[2200]`
  * `dirX[2200]`, `dirZ[2200]` (direção de perseguição até o jogador)
  * `sepX[2200]`, `sepZ[2200]` (força de repulsão entre monstros adjacentes)
  * `hp[2200]`, `maxHp[2200]`, `speed[2200]`, `typeIdx[2200]`
* **Loop de Física:** O cálculo de proximidade e separação roda em passos fixos (`delta`), atualizando diretamente os atributos da geometria instanciada (`iPos.needsUpdate = true`).

---

## 5. Áudio Procedural (Web Audio API)

O PokéBonk não carrega centenas de arquivos `.mp3` para efeitos sonoros de ataques e acertos. Ele utiliza **síntese procedural** com osciladores Web Audio API (`OscillatorNode` tipo `square` e `triangle`, somados a buffers de ruído branco para explosões), reduzindo a latência a zero e economizando dezenas de megabytes de download.
