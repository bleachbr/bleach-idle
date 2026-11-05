# ADR-003: Teclas configuráveis e toque para uma mão (R-14)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Proposto. Rascunho do Rafael em 01/11/2026 |
| **Contexto** | [PRD Acessibilidade e QoL](../PRD-acessibilidade-qol.md) §3.5 e §3.6, RF-07 a RF-10 |

---

## 1. Contexto

- **Teclado.** `GameScene.bindKeys` tem o mapa local `dirOf` (WASD e setas) e uma sequência de `if` com Tab (`nextTarget`), Esc (`target` vazio), T (`transform`), R (`recall`) e `Digit1` a `Digit9` (`skill` com o número). O servidor só trata os slots 0 a 6: 1, 4, 5 e 6 são técnicas (`TECH_SLOTS` em `shared/src/evolution.ts`), 2 e 3 são poções, 0 é o botão único do celular; 7 a 9 não fazem nada. Fora da cena, `main.ts` trata Esc (fecha janelas) e Enter (foco no chat), e `inventory.ts` trata Esc no `#modal`.
- **Foco.** `bindKeys` ignora a tecla só com foco em `HTMLInputElement`: o `<select id="hunt-spot">` deixa passar setas, dígitos, T e R, e os `range` do Auto Helper bloqueiam os atalhos até perder o foco. O handler do `#chatin` tira o foco antes de o evento subir até `window`: no Esc, o ouvinte de `main.ts` fecha as janelas; no Enter que envia, o outro ouvinte de `main.ts` foca o chat de novo (deduzido da ordem de propagação).
- **Legenda.** "Atalhos" é texto fixo em `index.html`; o `<kbd>` de cada técnica sai de `TECH_SLOTS` em `renderTechs`.
- **Toque.** `touch.ts` mostra `#touch` com `pointer: coarse` ou `?toque`. Joystick à esquerda (`#stick` 120 px, 4 direções, zona morta de 16 px) e 6 botões à direita (`#actions`, 52 px), posições fixas no CSS. Tocar no chão já anda (`move`) e tocar num monstro já o escolhe como alvo (`GameScene.onClick`).

## 2. Decisão

### 2.1. Módulo `client/src/keymap.ts`, puro
- `ACTIONS`: lista fixa de ações, cada uma com o que envia ao servidor:
  - `up`, `down`, `left`, `right` → direção 3, 0, 1, 2 (o `held` e o `tryStep` de hoje);
  - `tech1` a `tech4` → `skill` com `TECH_SLOTS[i]`;
  - `potionHp`, `potionRei` → `skill` 2 e 3;
  - `nextTarget`, `clearTarget`, `transform`, `recall`.
- `DEFAULT_KEYS`: o de hoje (setas e WASD; `Digit1`, `Digit4`, `Digit5`, `Digit6`; `Digit2`, `Digit3`; `Tab`, `Escape`, `KeyT`, `KeyR`). Proposta do PRD §7, ponto 4: as teclas 7 a 9, que o servidor ignora, saem do padrão.
- Até duas teclas por ação, identificadas por `KeyboardEvent.code` (não depende do idioma do teclado; a legenda mostra o `code` traduzido, por exemplo `KeyQ` → "Q").
- `RESERVED = ["Enter", "Escape"]`: não podem ser atribuídas a outra ação. O Esc continua como hoje: fecha as janelas (`main.ts`) e solta o alvo (`bindKeys`) no mesmo toque. "Soltar alvo" aceita uma tecla extra.
- `assign(keys, action, code)` devolve o mapa novo e a ação que perdeu a tecla (conflito), sem mudar o original. A janela usa isso para perguntar antes de trocar.
- `actionOf(keys, code)`: busca numa tabela invertida (`Map`) montada uma vez a partir do mapa já validado. O `code` vem do evento do navegador e o mapa vem do `localStorage`, então nenhum dos dois indexa objeto comum.
- `parseKeys(raw)`: valida o que veio do armazenamento (ação desconhecida ignorada, `code` fora do formato `Key[A-Z]`, `Digit[0-9]`, `Arrow*`, `Numpad*`, `F1`–`F12` e alguns símbolos é descartado, ação sem tecla volta ao padrão).

### 2.2. `bindKeys` e foco
- `bindKeys` troca `dirOf` e a sequência de `if` por `actionOf`. O envio é o mesmo de hoje, então o servidor não muda.
- `typing(e)` passa a cobrir campos de texto (`input` exceto `range`, `checkbox`, `radio` e `button`), `select`, `textarea`, `[contenteditable]` e o modo de captura da janela de teclas.
  - O `range` fica só com as teclas que o movem (setas, Home, End, PageUp e PageDown); WASD, dígitos, T, R e Tab seguem para o jogo. Sem isso, o `preventDefault` das setas no `bindKeys` tiraria do teclado o controle do deslizante (achado da revisão do PR 1).
- Os handlers de Esc e de Enter do `#chatin` chamam `stopPropagation` depois de tirar o foco, para o mesmo evento não fechar as janelas nem focar o chat de novo.

### 2.3. Legenda gerada
- A seção "Atalhos" de `index.html` vira um contêiner vazio preenchido por `renderShortcuts(keys)` com `textContent`. `renderTechs` usa a tecla configurada no `<kbd>`.
- O texto de cada tecla sai de uma tabela fixa `code → rótulo` (`KeyQ` → "Q", `ArrowUp` → "↑"), nunca do `code` cru. `renderTechs` hoje monta o HTML por `innerHTML`: o rótulo entra por `escHtml` ou o `<kbd>` passa a ser criado com `textContent` (ADR-001 §4).

### 2.4. Toque
- `body.touch-right`: `#stick` vai para a direita e `#actions` para a esquerda (troca de `left`/`right` no CSS).
- `--touch-size` (52, 64 ou 76 px) define o tamanho dos botões de `#actions` e a coluna da grade.
- `body.one-hand`: esconde `#stick` e põe `#actions` numa coluna do lado escolhido, a partir de 40% da altura da tela. Se os 6 botões não couberem na altura (76 px com o celular deitado somam cerca de 500 px), a coluna quebra em duas. Andar fica pelo toque no chão, que já existe.
- Os botões ganham `aria-label` com o mesmo texto do `title`.

## 3. Alternativas

- **Usar o teclado do Phaser** (`this.input.keyboard.addKey`): ficaria dentro da cena, mas os atalhos de `main.ts` (Enter, Esc) continuam no `window`, e o Phaser também precisaria da regra de foco. Rejeitado: o mapa puro serve aos dois lugares.
- **`KeyboardEvent.key` em vez de `code`:** mostraria a letra do layout do jogador, mas muda com Shift e com o idioma, e quebra o padrão WASD em teclado AZERTY de forma diferente a cada tecla. Rejeitado; a legenda traduz o `code`.
- **Joystick flutuante** (nasce onde o dedo toca): bom para uma mão, mas muda o toque no chão, que hoje anda até o ponto. Fica como ponto aberto para depois da R-14.

## 4. Consequências

- **Positivas:** o mapa de teclas tem teste sem DOM; o servidor e o protocolo não mudam; os três vazamentos de atalho somem.
- **Negativas:** quem configurar uma tecla que o navegador já usa (por exemplo, F5) perde o atalho do navegador dentro do jogo. A janela avisa para teclas de função.
- **Segurança:** nada muda no servidor. Uma tecla configurada só escolhe qual mensagem já existente o cliente envia, e o servidor valida tudo como antes (recarga, reiatsu, alcance, nível).
- **Testes:** padrão igual ao comportamento de hoje, tirando as teclas 7 a 9 (teste de regressão); `assign` com e sem conflito; `RESERVED`; `parseKeys` com lixo e com `__proto__` vindo de `JSON.parse`; `actionOf` com `code` desconhecido; e `typing` com cada tipo de alvo, inclusive `range` e `select`.
