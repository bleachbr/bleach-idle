# ADR-002: Escala de texto, alto contraste e menos movimento (R-14)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Proposto. Rascunho do Rafael em 01/11/2026 |
| **Contexto** | [PRD Acessibilidade e QoL](../PRD-acessibilidade-qol.md) §3.2 a §3.4, RF-04 a RF-06 |

---

## 1. Contexto

- **DOM:** todos os `font-size` estão em px em `style.css` e `theme.css`, e várias larguras também (`#side` 292 px pelo `theme.css`, grade do inventário com espaços de 40 px).
- **Canvas:** os textos do Phaser também têm px fixos: nome 11 px e título 9 px (`addView`, `setCosmetics`), nome do NPC 11 px, texto flutuante `size + 1` ou `size + 6` em `float()`. O canvas usa `Scale.FIT`; o modo HD multiplica a resolução por `HD_K = 3` com `setGameSize` e `setZoom`, sem mudar o tamanho do mundo.
- **Cor:** variáveis em `:root` (`style.css`) sobrescritas em `theme.css`. As cores do canvas e do minimapa são literais em `GameScene.ts`.
- **Movimento:** `cameras.main.shake` em 4 lugares e `cameras.main.flash` em 2, todos em `GameScene.onFx`; animação CSS `rebirth-glow` infinita.

## 2. Decisão

### 2.1. Escala de texto
- **DOM:** variável `--text-scale` (1, 1.25 ou 1.5) aplicada com `zoom: var(--text-scale)` em `#side`, `#chat` e nas janelas e barras: `#modal`, `#ranking`, `#book`, `#shop`, `#pass`, `#dev`, `#options`, `#ctx`, `#death`, `#dangai`, `#bossbar` e `#event-banner`. O `zoom` aumenta texto, ícones e espaços juntos, então nada se sobrepõe; a barra lateral rola mais.
- **Dois ajustes que o `zoom` exige:**
  - `zoom` também multiplica `left` e `top`. O `#ctx` é `position: fixed` e posicionado por JS no `clientX`/`clientY` do clique (`playerMenu`), então `playerMenu` divide `x` e `y` pela escala, e o limite da borda (hoje `innerWidth - 200`) passa a contar a largura já escalada.
  - No toque, o `#touch` fica logo acima do chat (`body.touch #touch { bottom: 120px }`, com o chat de 110 px). Com o chat escalado, o `bottom` passa a `calc(110px * var(--text-scale) + 10px)`, para o joystick não cobrir o chat.
- O joystick e o minimapa ficam fora dos contêineres com `zoom` (estão direto em `<main>`), então o `getBoundingClientRect` deles não muda.
- **Canvas:** a `GameScene` guarda `textScale` e o usa ao criar os textos (`fontSize` do nome, título e `float()`). Ao trocar a preferência, os nomes e títulos já criados recebem `setFontSize` uma vez; os textos flutuantes novos já nascem no tamanho certo.
- O mapa, os sprites e o minimapa não mudam.

### 2.2. Alto contraste
- `body.contrast` sobrescreve as variáveis: `--text` branco, `--muted` mais claro, `--line` mais clara, `--accent` numa versão que passe de 4,5:1 sobre o painel. Botões, campos e espaços do inventário ganham borda de 1 px visível. `:focus-visible` com contorno de 2 px em tudo que é clicável.
- Valores escolhidos com a conta de contraste da WCAG 2.x, e a tabela final entra no PR com os números.
- **Canvas:** com o contraste ligado, `update()` monta o nome com o prefixo "◆ " (party) e "⚔ " (PvP), no mesmo ponto em que já põe "☠ " e "✦N " (`GameScene.update`, "cor do nome"). No minimapa, `drawMinimap` marca a party com uma forma diferente do ponto cheio dos outros jogadores (por exemplo, uma cruz de 3 px). O minimapa tem 1 pixel por tile e aparece com 96 px no celular, então a forma escolhida se confere nesse tamanho; um quadrado vazado de 3 px pode perder o furo.
- `"auto"` lê `matchMedia("(prefers-contrast: more)")` e escuta a mudança.

### 2.3. Menos movimento
- Uma função `shake(ms, força)` e uma `flash(ms)` na `GameScene` substituem as chamadas diretas a `cameras.main.shake` e `cameras.main.flash`. Com movimento reduzido, as duas não fazem nada.
- `float()` pula o tween de escala (o texto já nasce na escala 1) e mantém a subida e o esmaecer.
- `body.reduced-motion` desliga a animação `rebirth-glow` e as transições de CSS longas (`#side` no celular abre sem deslizar).
- `"auto"` lê `matchMedia("(prefers-reduced-motion: reduce)")`.
- **Como ficou (PR 2):** a fonte da decisão é a classe `reduced-motion` no `body`, ligada por `options.ts` com a função pura `reducedMotion(motion, sistema)` (`client/src/motion.ts`). A `GameScene` lê a classe a cada efeito, então não há ligação entre a janela e a cena, e "Seguir o sistema" reage na hora a uma mudança no aparelho. O controle é uma lista (`select`) com Seguir o sistema, Reduzido e Completo, na seção Visual, e o "Voltar ao padrão" da seção também o restaura.

## 3. Alternativas

- **Escala por `rem`:** trocar as ~70 linhas de CSS com tamanho de fonte em px por `rem` e mudar o `font-size` da raiz. É o caminho clássico e escala só o texto, mas é uma reescrita grande de CSS que encosta em tudo o que o Waldir também mexe (`theme.css`) e deixa larguras em px desalinhadas (texto maior em caixa do mesmo tamanho). Rejeitado para a R-14; se o `zoom` mostrar problema no teste à mão, volta como alternativa.
- **Escala do canvas inteiro** (`setZoom` maior): aumenta o texto, mas mostra menos mapa, o que muda o jogo. Rejeitado.
- **Marcadores sempre ligados:** ver PRD §7, ponto 2.

## 4. Consequências

- **Positivas:** poucas linhas de CSS por contêiner; o canvas muda em pontos já existentes (criação de texto, montagem do nome, minimapa, efeitos de câmera).
- **Negativas:** `zoom` também aumenta imagens de fundo e bordas, o que é aceitável para pixel art (`image-rendering: pixelated` já está nos ícones). Em 150%, a barra lateral de 292 px vira 438 px; no celular ela é uma gaveta e cobre mais a tela quando aberta.
- **Testes:** a regra de prefixo do nome e a resolução de `"auto"` (com o valor da media query passado como parâmetro) ficam em funções puras com teste. O visual se confere à mão em 100%, 125% e 150%, com e sem contraste, no desktop e no celular, incluindo o menu de jogador (`#ctx`) aberto perto da borda direita e de baixo, e o chat com os controles de toque.
