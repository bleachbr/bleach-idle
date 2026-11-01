# PRD: Acessibilidade e QoL do cliente (R-14)

| Metadado | Detalhe |
| :--- | :--- |
| **Feature** | Janela de opções, escala de texto, alto contraste, menos movimento, teclas configuráveis e controles de toque para uma mão |
| **Status** | Proposto. Rascunho do Rafael em 01/11/2026; falta a aprovação das duas pessoas para "Aceito" |
| **Item do roadmap** | R-14 (fila do Rafael, `roadmap-duplas.md`) |
| **ADRs** | [ADR-001 preferências e janela de opções](adrs/ADR-001-preferencias-e-janela-de-opcoes.md) · [ADR-002 escala, contraste e movimento](adrs/ADR-002-escala-contraste-e-movimento.md) · [ADR-003 teclas e toque](adrs/ADR-003-teclas-e-toque.md) |

---

## 1. Problema

Conferido no código da `main` em 01/11/2026 (`client/src/GameScene.ts`, `main.ts`, `touch.ts`, `style.css`, `theme.css`, `index.html`):

- **O texto tem tamanho fixo.** Todo `font-size` do CSS está em px (texto corrido 14 px, `.hint` 12 px, rótulo das barras 11 a 12 px, quantidade no inventário 11 px, nome no espaço de equipamento vazio 9 px). No canvas, o nome sobre o personagem tem 11 px e o título cosmético 9 px (`GameScene.addView`, `setCosmetics`). No celular, o Phaser reduz o canvas inteiro (`Scale.FIT`), e esses 9 a 11 px ficam ainda menores. Não há opção para aumentar.
- **Cor sozinha carrega informação.** O nome verde (`#7dff8a`) marca a party e o vermelho (`#ff6a5a`) marca quem atacou um jogador; só o assassino ganha um símbolo (☠). No minimapa, a party (`#7dff8a`) e os outros jogadores (`#6cc0ff`) diferem só na cor, com contraste de 1,56:1 entre as duas. O texto em `--accent` (`#e8333a`) sobre o painel (`#14121c`) tem 4,38:1, abaixo dos 4,5:1 da WCAG para texto normal (são as estrelas do bestiário e os subtítulos do livro, `#book .stars` e `#book h3`).
- **A tela treme e pisca sem opção.** `cameras.main.shake` roda no evento, no golpe forte, na liberação de forma e na técnica de nível 3 ou mais; `cameras.main.flash` branco roda na forma de nível 3 ou mais e na técnica de nível 3 ou mais. Não há leitura de `prefers-reduced-motion`.
- **As teclas são fixas e estão espalhadas.** O jogo lê `KeyboardEvent.code` em quatro ouvintes de `window` (`GameScene.bindKeys`, dois em `main.ts`, um em `inventory.ts`), sem mapa central. Quem usa outro layout de teclado ou só uma mão não consegue trocar nada. A legenda "Atalhos" em `index.html` é texto fixo.
- **Três vazamentos de atalho**, achados na leitura dos handlers (os dois últimos deduzidos da ordem de propagação, sem teste no navegador):
  - `bindKeys` só ignora a tecla quando o foco está num `HTMLInputElement`. Com o `<select id="hunt-spot">` focado, setas, dígitos, T e R chegam ao jogo. Pelo mesmo motivo, depois de arrastar o controle de cura ou de reiatsu (`input type="range"`), o jogo ignora WASD, dígitos e Tab até o foco sair dele.
  - O Escape no chat tira o foco do `#chatin` antes de o evento subir até `window`, então o mesmo Escape também fecha as janelas abertas.
  - O Enter que envia a mensagem também tira o foco antes de subir, e o ouvinte de `window` (`main.ts`) vê o chat sem foco e o foca de novo.
- **O toque tem um layout só.** O joystick fica sempre à esquerda (120 px) e os 6 botões de ação à direita (52 px cada, `style.css`). Canhoto ou quem joga com uma mão não pode trocar o lado nem o tamanho.
- **Não existe janela de opções.** HD e som são ícones soltos no cabeçalho, cada um com a própria chave no `localStorage` (`bi_hd`, `bi_mute`).

## 2. Objetivos

1. Uma janela **Opções** que reúne o que hoje está solto (HD, som) e o que é novo.
2. **Escala de texto** de 100%, 125% e 150% no HUD, no chat, nas janelas e nos textos do canvas.
3. **Alto contraste**: cores de texto que passam de 4,5:1 e marcadores que não dependem de cor (party, PvP, minimapa).
4. **Menos movimento**: sem tremor nem flash de câmera, com o padrão vindo do sistema (`prefers-reduced-motion`).
5. **Teclas configuráveis** para cada ação do jogo, com detecção de conflito e "voltar ao padrão".
6. **Toque para uma mão**: lado do joystick e dos botões e tamanho dos botões.

Fora do escopo:
- HUD customizável (arrastar painéis, escala por elemento, presets salvos no servidor): fica no horizonte, `roadmap-duplas.md`.
- Leitor de tela no canvas do Phaser e navegação completa das janelas por teclado (foco ao abrir, foco preso na janela, devolver o foco ao fechar, e o Tab, que hoje escolhe o próximo alvo e por isso não navega entre botões). É trabalho grande e próprio; entra como pendência quando a R-14 sair.
- Controle (gamepad).
- Preferências sincronizadas entre aparelhos (ficam no navegador; ver ADR-001).

## 3. Regras de produto

### 3.1. Janela de opções
- Botão ⚙ no cabeçalho (ao lado de HD e som), com `aria-label`. Abre a janela `#options`, que fecha com ✕ e Esc como as outras (`WINDOWS` em `main.ts`).
- Seções: **Visual** (HD, escala de texto, alto contraste, menos movimento), **Som**, **Teclas** e **Toque** (só aparece em tela de toque ou com `?toque`).
- Cada mudança vale na hora e fica salva no navegador. "Voltar ao padrão" em cada seção.
- Os ícones de HD e som continuam no cabeçalho como atalho e mostram o mesmo estado da janela.

### 3.2. Escala de texto
- Três valores: 100% (padrão), 125% e 150%.
- Vale para o HUD lateral, o chat, as janelas (lista no ADR-002 §2.1) e os textos do canvas (nome, título, dano flutuante, nome de técnica).
- Não muda o tamanho do mapa nem dos sprites.
- Em 150% a barra lateral pode rolar mais; nenhum texto pode ser cortado nem sobrepor outro.

### 3.3. Alto contraste
- Padrão: desligado, ou ligado se o sistema pedir (`prefers-contrast: more`).
- Texto normal com pelo menos 4,5:1 sobre o fundo; borda visível em botões e campos; foco visível (`:focus-visible`) em tudo que é clicável.
- **Marcadores além da cor** (valem com o alto contraste ligado):
  - nome de quem está na sua party ganha "◆ " na frente;
  - nome de quem está marcado por PvP ganha "⚔ " na frente (o assassino já tem ☠);
  - no minimapa, a party vira um quadrado vazado e os outros jogadores um ponto cheio, além da cor.
- As estrelas e os subtítulos do livro e outros textos em `--accent` usam uma variação mais clara que passe de 4,5:1.

### 3.4. Menos movimento
- Padrão: segue `prefers-reduced-motion` do sistema.
- Ligado: sem `shake` e sem `flash` de câmera; o texto flutuante continua (ele carrega informação de dano), sem o pulo de escala inicial; o brilho pulsante do botão de renascer para.
- Partículas de ambiente (pétalas, areia) continuam: são lentas e não piscam.

### 3.5. Teclas
- Ações configuráveis: andar (cima, baixo, esquerda, direita, cada uma com até duas teclas), técnicas 1 a 4, poção de cura, poção de reiatsu, próximo alvo, soltar alvo, liberar forma, voltar à cidade.
- Padrão: o de hoje (WASD e setas; 1, 4, 5 e 6 nas técnicas; 2 e 3 nas poções; Tab, Esc, T e R), sem as teclas 7, 8 e 9 (ponto em aberto 4).
- **Fixas, não configuráveis:** Enter (abre e envia o chat) e Esc (fecha janela e sai do chat). O Esc continua fazendo o que faz hoje: fecha as janelas e solta o alvo no mesmo toque. "Soltar alvo" pode ganhar uma tecla extra além do Esc.
- Para trocar: clicar na ação e apertar a tecla nova. Esc cancela a captura.
- Tecla já usada por outra ação: o jogo avisa e pergunta se troca (a outra ação fica sem aquela tecla).
- A legenda "Atalhos" e o `<kbd>` de cada técnica mostram as teclas escolhidas.
- Atalho nenhum dispara com o foco num campo de texto, numa lista (`select`) ou num botão em captura de tecla. Controles deslizantes (`range`) e caixas de marcar não bloqueiam os atalhos.

### 3.6. Toque
- **Lado:** "joystick à esquerda" (padrão) ou "joystick à direita" (os botões vão para o outro lado).
- **Tamanho dos botões de ação:** normal (52 px), grande (64 px) e muito grande (76 px).
- **Uma mão:** esconde o joystick (andar pelo toque no chão, que já existe) e junta os 6 botões numa coluna do lado escolhido, na altura do polegar.
- Os botões ganham `aria-label` (hoje só têm `title`).

## 4. Requisitos funcionais

| ID | Requisito |
| :--- | :--- |
| RF-01 | Preferências num módulo puro (`client/src/prefs.ts`), com valores válidos fixos; valor desconhecido no armazenamento volta ao padrão |
| RF-02 | As chaves antigas `bi_hd` e `bi_mute` são lidas uma vez na primeira carga e passam para as preferências novas, sem perder o que o jogador escolheu |
| RF-03 | Janela `#options` com as seções da §3.1, entrando em `WINDOWS` (fecha com as outras e com Esc) |
| RF-04 | Escala de texto aplicada no DOM e nos textos do Phaser (ADR-002) |
| RF-05 | Alto contraste: tema CSS, marcadores da §3.3 no canvas e no minimapa |
| RF-06 | Menos movimento: `shake` e `flash` passam por uma função única que respeita a preferência |
| RF-07 | Mapa de teclas num módulo puro (`client/src/keymap.ts`) com ações, padrão, conflito e validação (ADR-003); `bindKeys` consulta o mapa |
| RF-08 | Atalhos ignorados com foco em campo de texto, `select`, `textarea` ou `[contenteditable]` (não em `range` nem `checkbox`); Esc e Enter do chat não chegam aos ouvintes de `window` |
| RF-09 | Legenda de atalhos e `<kbd>` das técnicas gerados do mapa de teclas |
| RF-10 | Toque: lado, tamanho e modo uma mão por classe no `body` e variáveis CSS |

## 5. Requisitos não funcionais

- **Sem servidor.** Nenhuma mensagem nova, nenhum campo no save. As teclas mudam só o que o cliente envia; o servidor continua validando tudo como hoje (`skill`, `step`, `transform`, `recall`, `nextTarget`, `target`).
- **Sem dependência nova.** Nada de biblioteca de UI ou de acessibilidade.
- **Testes** no Vitest, em `client/test/`, sem DOM. A pasta nasce no M2-06 (PR #16, ainda aberto); se o #16 não tiver entrado, o 1º PR da R-14 a cria. Cobrem: validação das preferências, migração das chaves antigas, mapa de teclas (padrão, conflito, troca, tecla inválida, ações fixas) e a regra de foco. O resto (CSS, janela) se confere à mão, com um roteiro no PR.
- **Desempenho:** a escala e o contraste não podem redesenhar o canvas a cada quadro. Trocar a preferência atualiza os textos uma vez; o laço `update` só lê um valor já pronto.
- **Compatibilidade:** CSS `zoom` está em todos os navegadores atuais (Firefox desde a versão 126, de maio de 2024). Em navegador sem `zoom`, a escala do DOM não aplica e o resto funciona.

## 6. Ordem sugerida de entrega

Cada linha é um PR:

1. **Preferências e janela de opções** (RF-01 a RF-03), já com HD e som dentro, e o conserto de foco (RF-08). É a base dos outros.
2. **Menos movimento** (RF-06). Pequeno e de maior benefício (fotossensibilidade).
3. **Escala de texto** (RF-04).
4. **Alto contraste** (RF-05).
5. **Teclas** (RF-07, RF-09).
6. **Toque** (RF-10).

## 7. Pontos em aberto

1. **Escala de texto por CSS `zoom` ou por `rem`** (ADR-002 §2.1). A proposta é `zoom` nos contêineres, porque troca uma linha por contêiner em vez de reescrever as ~70 linhas de CSS com tamanho de fonte em px. Precisa do aceite das duas pessoas.
2. **Marcadores além da cor só no alto contraste ou sempre?** A proposta é só no alto contraste, para não mudar o visual de quem não pediu. Ligar sempre ajuda daltônicos que não sabem da opção.
3. **Preferências no servidor.** A proposta é ficar no navegador (cada aparelho tem a sua). Sincronizar fica para o HUD customizável do horizonte.
4. **Teclas 7, 8 e 9.** Hoje elas enviam `skill` com slot 7 a 9 e o servidor ignora. A proposta é tirar do padrão e deixar livres para o jogador usar em outra ação.
