# 05 - Câmera Orbital 360°, Movimentação Relativa e Billboarding Multidirecional

Este documento registra a fundamentação matemática, decisões de engenharia e implementação prática do sistema de câmera, movimentação do jogador e renderização de sprites 2.5D multidirecionais do projeto **Bleach: Soul Survivor**, espelhado na arquitetura do **PokéBonk** (https://pokebonk.com).

---

## 1. O Problema Resolvido

Em jogos Survivor 3D baseados em sprites 2D com Billboarding (onde cada sprite é um plano `THREE.Mesh` que gira para encarar a câmera), dois desafios clássicos ocorrem:
1. **Perda de Referência de Movimento:** Se a câmera gira livremente em 360° mas o teclado move em coordenadas absolutas de mundo (`W` sempre move para $-Z$), pressionar `W` quando a câmera gira 180° faria o personagem vir em direção à tela em vez de avançar.
2. **"Efeito Papel Plano" (Paper Cutout):** Se os inimigos ou o jogador possuírem apenas um sprite frontal, ao girar a câmera para trás deles eles continuam encarando o observador de frente, quebrando a ilusão de profundidade tridimensional.

---

## 2. Base Matemática da Câmera Orbital

A câmera orbita a posição atual do jogador $(P_x, P_y, P_z)$ com base em duas coordenadas esféricas:
* $\text{yaw} \in (-\infty, +\infty)$: Ângulo de rotação horizontal (azimute).
* $\text{pitch} \in [0.15, 1.15] \text{ rad}$: Inclinação vertical calibrada para visão aérea/isométrica.
* $\text{dist} \in [7.0, 24.0]$: Distância do foco.

```javascript
const h = Math.cos(cameraState.pitch);
const g = Math.sin(cameraState.pitch);
const dist = cameraState.dist;

const camX = player.x + Math.sin(cameraState.yaw) * h * dist;
const camY = player.y + g * dist + 0.8;
const camZ = player.z + Math.cos(cameraState.yaw) * h * dist;

camera.position.set(camX, camY, camZ);
camera.lookAt(player.x, 1.2, player.z);
```

---

## 3. Movimentação do Teclado Relativa à Câmera

Para que o teclado responda intuitivamente em qualquer ângulo de câmera:
* **`W` / `↑`**: Sempre caminha para o **fundo da tela** ($\mathbf{camFwd}$).
* **`S` / `↓`**: Sempre caminha para a **frente da câmera** ($-\mathbf{camFwd}$).
* **`D` / `→`**: Sempre caminha para a **direita da tela** ($\mathbf{camRight}$).
* **`A` / `←`**: Sempre caminha para a **esquerda da tela** ($-\mathbf{camRight}$).

### Vetores de Base da Câmera no Plano Horizontal ($XZ$):
$$\mathbf{camFwd} = (-\sin(\text{yaw}), -\cos(\text{yaw}))$$
$$\mathbf{camRight} = (\cos(\text{yaw}), -\sin(\text{yaw}))$$

### Combinação Linear de Entrada:
```javascript
const len = Math.hypot(rightInput, fwdInput);
rightInput /= len;
fwdInput /= len;

const worldDx = rightInput * camRightX + fwdInput * camFwdX;
const worldDz = rightInput * camRightZ + fwdInput * camFwdZ;

player.dirX = worldDx;
player.dirZ = worldDz;
player.x += worldDx * speed * dt;
player.z += worldDz * speed * dt;
```

---

## 4. Projeção de Perspectiva do Sprite (`getSpriteDirection`)

Para determinar se a câmera deve renderizar **Frente**, **Costas**, **Perfil Direito** ou **Perfil Esquerdo** para qualquer entidade (seja o jogador ou qualquer monstro Hollow):

Projetamos o vetor de deslocamento da entidade $(\text{facingX}, \text{facingZ})$ sobre os eixos da câmera:
```javascript
const rightProj = facingX * camRightX + facingZ * camRightZ;
const fwdProj   = facingX * camFwdX   + facingZ * camFwdZ;
const angle = Math.atan2(rightProj, fwdProj);
```

### Mapeamento dos 4 Quadrantes Angulares:
| Setor Angular | Direção Retornada | Significado Visual |
| :--- | :--- | :--- |
| $[-\pi/4, +\pi/4]$ | `'back'` | Entidade se afasta da câmera $\to$ **Visto de Costas** |
| $[+\pi/4, +3\pi/4]$ | `'side'` | Entidade se move para a direita $\to$ **Perfil Direito** |
| $[-3\pi/4, -\pi/4]$ | `'side_l'` | Entidade se move para a esquerda $\to$ **Perfil Esquerdo** |
| Restante ($> 3\pi/4$ ou $< -3\pi/4$) | `'front'` | Entidade vem em direção à câmera $\to$ **Visto de Frente** |

---

## 5. Atlas de Texturas de Hollows e Jogador

O gerador procedural em [`src/spritesheet.js`](../../src/spritesheet.js) renderiza todas as 4 perspectivas para todas as criaturas:

1. **Recruta Shinigami (`player`):**
   * `player_back`: Quimono preto traseiro com nó branco do Obi e katana embainhada nas costas.
   * `player_front`: Gola branca cruzada, rosto, olhos e lâmina empunhada à frente.
   * `player_side` / `player_side_l`: Perfil esguio em marcha com lâmina apontada para a direção do passo.
2. **Hollow Fishbone D (`fishbone`):**
   * `fishbone_front`: Máscara frontal com chifres e boca de dentes serrilhados.
   * `fishbone_back`: Coluna vertebral exposta de vértebras brancas e nuca escura.
   * `fishbone_side` / `fishbone_side_l`: Perfil curvado com mandíbula projetada e garras.
3. **Hollow Shrieker (`shrieker`):**
   * Asas de morcego que se abrem nas laterais e aparecem tanto de frente quanto de costas e dobradas de perfil.
4. **Hollow Acidwire (`acidwire`):**
   * Corpo serpentino com crista dorsal ácida e cauda sinuosa.
5. **Menos Grande Gillian (`menos`):**
   * Manto negro colossal cônico.
   * Nariz pontudo icônico projetado para a frente de perfil, e costura central vista de costas.

---

## 6. Ciclo de Vida do Pointer Lock API e Tecla ESC

No PokéBonk, o mouse não necessita de clique contínuo:
* **Entrada no Jogo:** Clicar no canvas ativa `canvas.requestPointerLock()`.
* **Movimentação do Mouse:** Evento `mousemove` lê `e.movementX` e `e.movementY` para girar a câmera suavemente.
* **Tecla `ESC`:** O navegador libera o ponteiro, o evento `pointerlockchange` pausa a partida e abre o modal `#pause-modal`.
* **Retomada:** Clicar em "RETOMAR MISSÃO" ou na tela reativa o Pointer Lock e continua a batalha.
* **Level Up & Fim de Jogo:** Liberam o ponteiro automaticamente para permitir a seleção de cartas de habilidades.
