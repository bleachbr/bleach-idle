# Direcionamento 15 — Joystick Virtual no Mobile e Hollow Elite (V1)

**Data:** 2026-11-07  
**Status:** Implementado e Validado via E2E Playwright Mobile  
**Arquivos Principais:** `src/joystick.js`, `src/movement.js`, `src/main.js`, `src/style.css`, `index.html`

---

## 1. Contexto e Motivação

Para fechar com excelência e máximo detalhamento a **Versão 1** do *Bleach: Soul Survivor* antes de avançar para a Versão 2, o usuário requisitou duas frentes de recursos imediatas:
1. **Controles Virtuais Mobile (Touch):** Joystick analógico flutuante no lado esquerdo da tela, rotação de câmera orbital no lado direito via touch drag e botão dedicado de salto Shinigami.
2. **Hollow Elite:** Entidade especial mutante com escala expandida (2.2m), aura carmesim de alta densidade espiritual, 200 HP, dano por contato aumentado e drop enriquecido de 6 orbs de Reishi.

---

## 2. Arquitetura dos Controles Touch (`src/joystick.js`)

Para respeitar os limites de código da catraca de governança (`scripts/lint/js_size.py`), toda a captura e cálculo analógico dos controles touch foram desacoplados em `src/joystick.js` (mantendo funções $\le 20$ linhas de código):

1. **Detecção Inteligente de Dispositivo Touch:**
   - Detecta `maxTouchPoints > 0`, `'ontouchstart' in window` ou telas estreitas ($\le 900\text{px}$).
   - No menu principal Pok\u00e9Bonk (`state.inMenu`), os controles virtuais permanecem ocultos.
   - Ao clicar em "ENTRAR NO HUECO MUNDO" (`startGame()`), o HUD ativa `#virtual-controls`.
2. **Isolamento de Toque Multi-touch:**
   - Metade esquerda da tela gerencia o polegar de movimentação (`joystickTouchId`).
   - Metade direita da tela gerencia o olhar de câmera (`cameraTouchId`), permitindo correr e olhar a 360° em simultâneo.
   - O botão flutuante `#btn-virtual-jump` dispara o pulo (`jumpPlayer`) via clique/toque dedicado com feedback tátil de escala e brilho.
3. **Vetor Analógico no `computePlayerDisplacement`:**
   - O módulo `src/movement.js` foi estendido com teste unitário automatizado (`test_compute_displacement_with_virtual_joystick`), suportando vetores contínuos com deadzone de $0.08$ e normalização em relação ao `yaw` da câmera.

---

## 3. Especificação do Hollow Elite (Entidade V1)

O Hollow Elite atua como uma ameaça tática intermediária entre o Fishbone D comum e o chefão Menos Grande Gillian:

| Parâmetro | Fishbone D Comum | Hollow Elite (Mutante) | Menos Grande (Gillian) |
|---|---|---|---|
| **Tipo (`type`)** | `fishbone` | `elite` | `menos` |
| **Escala 3D** | $1.4\text{m}$ | $2.2\text{m}$ | $3.8\text{m}$ |
| **Pontos de Vida (HP)** | 45 HP | 200 HP | 2000 HP |
| **Velocidade de Deslocamento** | $3.2$ | $3.4$ | $2.0$ |
| **Dano por Contato** | 12 | 22 | 35 |
| **Aparência Visual** | Branco/Cinza canônico | Desenho próprio em `src/assets/monsters/elite` (brutamontes negro com armadura carmesim e máscara de chifres), sem tinta. Até 2026-11-12 era o Fishbone tingido de `0xff3355` | Manto Negro & Máscara pontiaguda |
| **Recompensa ao Purificar** | 1 Reishi | 6 Reishi (explosão de XP) | 20 Reishi |
| **Frequência de Spawn** | Onda contínua a cada $0.3\text{s}$–$1.0\text{s}$ | Spawn periódico a cada $35\text{s}$ | Nv. 60 kills ou $120\text{s}$ |
| **Censo no Fim de Jogo** | Contabilizado | `state.census.elite` | Contabilizado |

---

## 4. Validação Automatizada (Playwright Mobile)

A suíte em `scratch/test_mobile_and_elite.py` executou em emulação iPhone 13 com touch nativo:
- **Screenshot 01:** Tela de Login Mobile Pok\u00e9Bonk.
- **Screenshot 02:** Entrada no Hueco Mundo com joystick analógico e botão de pulo visíveis.
- **Screenshot 03:** Arrasto analógico do joystick para nordeste (`vector: { x: 0.7, y: 0.7 }`), deslocando o jogador em $12.06\text{m}$.
- **Screenshot 04:** Salto do Shinigami no ápice a $0.78\text{m}$ de altura via botão virtual.
- **Screenshot 05:** Spawn do Hollow Elite com escala $2.2\text{m}$, 200 HP e aura carmesim `0xff3355`.
- **Screenshot 06:** Tela de relatório pós-combate listando `Hollow Mutante (Elite): 1 (PURIFICADO)`.
