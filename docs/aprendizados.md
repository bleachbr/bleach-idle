# Aprendizados

Causa raiz que custou tempo ou que ia ser redescoberta. Não é plano (isso é o [ROADMAP](ROADMAP.md)) nem dívida aberta (isso é [pendencias.md](pendencias.md)).

**Última atualização:** 2026-11-10

O número é da família inteira. Item novo pega `max + 1` e não reusa número que já saiu.

## 1. Folha com alturas diferentes encolhe o personagem ao virar de costas

**Causa raiz:** frentes, lados e costas da mesma folha não nascem na mesma escala. Um fator único pelo quadro mais alto deixa as costas menores. No caso medido no doc de normalização, a frente tinha 425 px, o lado 375 px e as costas 323 px, 24% abaixo da frente.

**O que fazer:** quadro de 128 px, pés na baseline 117, altura do corpo na faixa 104–107, jitter de no máximo 1 px. O procedimento e o teste estão em [direcionamento/07](direcionamento/07-diretrizes-normalizacao-sprites-e-testes.md). Sem `make validate-sprites`, o atlas não entra em `src/assets/`.

**Evidência:** [direcionamento/07](direcionamento/07-diretrizes-normalizacao-sprites-e-testes.md), seção 1, com as três alturas acima.

## 2. Segundo arquivo de regras no mesmo diretório é carregado junto, não no lugar

**Causa raiz:** o Grok lê `AGENTS.md` e `CLAUDE.md` do mesmo diretório, e ainda todo `*.md` de `.claude/rules/`. O Antigravity soma `AGENTS.md` e `GEMINI.md`, os dois sempre ligados, sem frontmatter. O Kiro inclui `AGENTS.md` sempre e, por cima, steering com `inclusion: always`. Copiar o contrato para o delta faz a regra valer duas vezes e divergir na primeira edição.

**O que fazer:** o contrato fica em `AGENTS.md`. `CLAUDE.md` e `GEMINI.md` só dizem o que é daquele harness. Steering e `.agents/rules/` ou são glob de arquivo, ou não existem. Mapa em [governanca/harness.md](governanca/harness.md).

**Evidência:** guia de project rules do Grok (`AGENTS.md` e `CLAUDE.md` no mesmo diretório entram os dois; `.claude/rules/*.md` entra inteiro) e a descoberta de customização do Antigravity (regras cumulativas; `AGENTS.md` e `GEMINI.md` sempre ativos).

## 3. O git deste checkout conta dois jogos

**Causa raiz:** a história passa por commits do bleach-idle (sete mapas, CI com `npm test`, deploy da imagem `bleach-idle`) e, depois, pelo protótipo Soul Survivor, que trocou o `package.json` e não trocou o workflow. Um agente que lê só o YAML "conserta" o protótipo para satisfazer o jogo antigo, ou apaga o deploy achando que é lixo.

**O que fazer:** tratar `.github/workflows/ci.yml` como descrição do bleach-idle até a pendência 1 fechar. O gate deste protótipo, hoje, é `make build`, `make validate-sprites` e `make docs-check`. O job `docs` do CI é o único job alinhado ao Soul Survivor.

**Evidência:** `package.json` (scripts `dev`, `build`, `preview`) contra os passos `npm run typecheck`, `npm test` e o workspace `e2e` em `.github/workflows/ci.yml`. O projeto Orca deste checkout está registrado como `bleach-idle`.

## 4. Link `file://` absoluto não sai da máquina em que foi clicado

**Causa raiz:** o preview do editor grava o destino como `file:///Users/.../src/main.js`. Esse prefixo é o checkout principal desta máquina. Worktree, CI e outro clone resolvem outro diretório, e o link mente mesmo quando o arquivo existe nos dois lugares.

**O que fazer:** caminho relativo a partir do markdown (`../../src/main.js` desde `docs/direcionamento/`). `make docs-check` reprova alvo que começa com `file:`.

**Evidência:** em 2026-11-07 o `docs-check` no worktree `agent-docs` reprovou oito links em `docs/direcionamento/` (05, 06, 08 e 09) que apontavam para o checkout principal. Trocar por caminho relativo fez o check passar.

## 5. Stdout puro do hook Stop do Claude não entra no contexto

**Causa raiz:** no Claude Code, `SessionStart` entrega stdout ao modelo. No `Stop`, texto puro é descartado. O canal é JSON `hookSpecificOutput.additionalContext` com `hookEventName` `Stop`. Esse campo continua a conversa (turno extra, o mesmo teto de oito continuações do `decision: block`). Se o script escrever de novo com `stop_hook_active: true` no stdin, o turno se repete.

**O que fazer:** `--format claude-stop` só quando há aviso. Saída vazia e exit 0 quando `stop_hook_active` é o booleano `true`, ou quando o stdin não é um objeto. Sem `decision: block`. O SessionStart permanece em `--format text`.

**Evidência:** referência de hooks do Claude Code (Stop decision control, campo `stop_hook_active`) e os testes `test_aviso_sai_como_json_de_stop` e `test_stop_hook_active_cala_mesmo_com_aviso` em `scripts/docs/test_governanca.py`.

## 6. injectSteps no Stop do Antigravity é descartado

**Causa raiz:** em [Hooks](https://antigravity.google/docs/hooks/), `injectSteps` é saída de `SessionStart`, `PreInvocation` e `PostInvocation`. O `Stop` só lê `decision` e `reason`. `decision: continue` impede o término e coloca `reason` como system message. Qualquer outro `decision` deixa o loop parar. JSON com `injectSteps` nesse evento não chega ao modelo.

**O que fazer:** `--format antigravity-stop`. Sem aviso, `{"decision":"stop"}`. Com aviso, `{"decision":"continue","reason":"..."}` só se `executionNum` do stdin estiver ausente ou for no máximo 1. Acima disso, `decision: stop`, para o loop não repetir. O `SessionStart` permanece em `--format antigravity`.

**Evidência:** seção Stop da doc acima (campo `decision` obrigatório; `reason` só entra com `continue`) e os testes `test_aviso_vira_continue` e `test_execution_num_acima_de_um_forca_stop` em `scripts/docs/test_governanca.py`.

## 7. Teto de tamanho sem catraca não pega o arquivo que já estourou

**Causa raiz:** o flow-spark declara 20 linhas por função e menos de 500 por arquivo, e o gate `make function-size-check` só reprova função nova acima do teto ou função inventariada que cresce. Copiar o teto como frase, neste repo, mentiria: `src/main.js` tem 1493 linhas e `src/spritesheet.js` tem 505. Um check que falha no código de hoje obriga um split que não é esta mudança, e um teto sem check é ignorado na próxima função.

**O que fazer:** `make size-check` em `src/**/*.js`. O inventário `scripts/lint/size_inventory.json` guarda o tamanho medido de quem já passou. Não cresce. Número novo só para baixo. Com o arquivo já na `main`, o teto da chave é o valor de lá.

**Evidência:** contagem de `src/main.js` e `src/spritesheet.js` em 2026-11-07, o §1 de `AGENTS.md` do flow-spark, e os testes `test_funcao_nova_acima_do_teto_falha` e `test_repositorio_atual_respeita_o_inventario` em `scripts/lint/test_js_size.py`.

## 8. Folha de props e mapas com chroma key magenta exige despill e anti-aliasing suave para evitar halo rosa no Three.js

**Causa raiz:** Spritesheets de mapas e props usam fundo magenta `#e71fe7` ou `#ff00ff`. Um corte estrito por igualdade de cor (`r == 231 and g == 31 and b == 231`) deixa pixels semi-transparentes ou bordas antialiased com anéis de magenta visíveis quando iluminados por luz noturna ou renderizados em billboard transparente (`alphaTest: 0.05`).

**O que fazer:** Calcular distância Euclidiana de cor em espaço RGB até `#e71fe7`, aplicar rampa de opacidade alpha (0 se dist < 28, 1 se dist > 48, linear no intervalo) e neutralizar derramamento de cor (de-spill) atenuando canais R e B em direção a G para pixels semitransparentes.

**Evidência:** `geradores/map_generator.py` função `remove_chroma_key`, extração dos 19 props do Hueco Mundo sem pink fringing em `src/assets/maps/hueco_mundo/props/` e inspeção no 360° Map Studio (`preview_map.html`).

## 9. Desacoplamento da matemática de movimento previne dessincronização de animFrame e direção em refatorações de loop

**Causa raiz:** Ao compactar `updatePlayer` para respeitar o teto de 20 linhas de função, houve descompasso de contrato: `walkFrame` foi incrementado no lugar de `player.animFrame`, `player.animSpeed` não existia (travando a comparação do timer), e a atualização vetorial de `player.dirX` / `player.dirZ` foi omitida. Como a movimentação espacial ocorria (`player.x += dx`), o personagem deslizava na tela como um recorte estático, sem animação de pernas e sem virar a face/costas de acordo com a câmera.

**O que fazer:** Extrair a matemática pura de deslocamento (`computePlayerDisplacement`), orientação direcional do billboard (`getSpriteDirection`) e avanço de ciclo de caminhada (`updateWalkCycle`, `resetWalkCycle`) para um módulo desacoplado sem dependência de Three.js ou DOM (`src/movement.js`). Criar testes unitários automatizados em `scripts/test_player_movement.py` (`make movement-test`) que validam os cálculos vetoriais, normalização diagonal e o avanço dos 4 frames da passada a cada intervalo de `walkFps`.

**Evidência:** Os testes unitários em `scripts/test_player_movement.py` passando com 8/8 asserções em 0.3s e teste visual via Playwright em `scratch/test_walk_fix.py` confirmando ciclagem `[0, 1, 2, 3]` durante 'W' e reset para 1 em repouso.

## 10. O `vite build` não leva os sprites: o dev server os serve de `/src/assets/`, a produção dá 404

**Causa raiz:** `src/main.js`, `src/maps/hueco_mundo.js` e o `map_data.json` carregam texturas em runtime por URL (`/src/assets/characters/...`, `/fx/`, `/monsters/`, `/maps/`). O dev server do Vite serve esse caminho direto da pasta de código. O build só empacota o que é importado, então o `dist` saiu com 528 KB, sem nenhum PNG. O primeiro deploy subiu o jogo sem sprites, e o fallback de SPA do nginx respondeu 200 com `text/html` no lugar do 404, o que escondeu o erro em `curl` e `/healthz`.

**O que fazer:** O `Dockerfile` copia `src/assets` para `/usr/share/nginx/html/src/assets`, no mesmo caminho do dev, e o `infra/nginx.container.conf` devolve 404 de verdade em `/src/assets/`. Mudou a forma de carregar textura (importar, ou mover para `public/`)? Revise os dois. Para o status de uma textura, cheque o `Content-Type`: `image/png`, não `text/html`.

**Evidência:** Antes, `curl -I https://bleach.acoplum.com/src/assets/characters/ichigo_shikai/atlas.png` dava `200 text/html`. Depois da correção dá `200 image/png`, e `/src/assets/nao_existe.png` dá `404`.

## 11. Multi-touch em controles mobile virtuais exige rastreamento estrito por `identifier` para evitar conflito com a rotação de câmera

**Causa raiz:** Ao implementar joystick virtual móvel e câmera livre por arrasto na mesma tela touch, usar `e.touches[0]` faz o segundo dedo (ou o salto) assumir indevidamente o controle do joystick ou puxar a câmera repentinamente. Além disso, elementos com animação CSS contínua (ex.: botões com pulso infinito de escala) causam timeout em cliques automatizados do Playwright por falha no check de estabilidade (`element is not stable`).

**O que fazer:** Em `src/joystick.js`, rastrear separadamente `joystickTouchId` (dedo alocado no joystick esquerdo) e `cameraTouchId` (dedo alocado na área de rotação direita) através de `e.changedTouches` e seus respectivos `t.identifier`. Para testes automatizados com Playwright em elementos animados por CSS contínuo, usar `force=True` ou despachar clique nativo via `page.evaluate`.

**Evidência:** `src/joystick.js` gerencia `state.joystickTouchId` e `state.cameraTouchId` de forma independente; testes em `scratch/test_mobile_and_elite.py` executados com sucesso no iPhone 13 sem conflito entre o joystick analógico e o botão de salto.

## 12. Exceções não capturadas no loop de renderização congelam o canvas sem gerar feedback na UI

**Causa raiz:** O Three.js e o loop do jogo executam em `requestAnimationFrame(loop)`. Qualquer `ReferenceError` síncrono (como chamar uma variável renomeada `enemyPool` em vez de `enemyMeshes`) quebra a pilha de execução daquele frame. Como nenhum novo frame é agendado, o jogo congela silenciosamente no último estado desenhado no canvas, sem mensagem de erro visível na interface do jogador.

**O que fazer:** Implementar coleta estruturada de telemetria e captura global em `window.onerror` e `window.onunhandledrejection` (`src/telemetry.js` despachando para `/api/telemetry/log` do backend). Em pipelines de teste, simular marcos críticos de transição de fase (como o limiar exato de abates de spawn de chefe) para garantir que caminhos de código com baixa frequência de execução sejam validados de ponta a ponta.

**Evidência:** O teste automatizado `scratch/test_telemetry_and_boss_spawn.py` reproduzindo 59 para 60 hollows, a correção de `enemyPool` para `enemyMeshes` em `src/main.js`, e o registro de eventos no backend em `logs/telemetry.log`.

## 13. Chamada de `requestPointerLock` em callbacks assíncronos (`setTimeout`) falha por falta de gesto do usuário

**Causa raiz:** Navegadores modernos exigem um gesto explícito e síncrono do usuário (como `click` ou `keydown`) para autorizar o bloqueio do cursor do mouse via `requestPointerLock()`. Invocar `requestPointerLock()` dentro de um timer assíncrono (como a transição dimensional do Senkaimon com `setTimeout`) dispara uma rejeição de segurança (`pointerlockerror`). Se esse evento disparar um listener que pausa o jogo (`pauseGame`), o jogador entra na nova fase congelado na tela de pause modal.

**O que fazer:** Nunca invocar `requestPointerLock()` dentro de fluxos assíncronos sem interação direta do usuário. Permitir que o jogador jogue com movimentação de mouse / teclado livre e capture o ponteiro naturalmente ao clicar no canvas (`canvas.onclick`), e nunca mapear erros genéricos de `pointerlockerror` para pausar a partida.

**Evidência:** Teste `test_infinite_runner_prologue.py` acusava `state.paused = true` após o Senkaimon devido à chamada assíncrona; remoção do trigger forçado de pause em `src/main.js` permitiu transição fluida para o combate no Hueco Mundo com deslocamento livre comprovado ($Z = -4.83$).

## 14. Normalizar sprite de ataque pela caixa encolhe o corpo, e a grade fixa corta a espada

**Causa raiz:** o `sprite_processor` calcula a escala pela maior caixa da direção. Num golpe, a caixa inclui a espada, então o corpo sai menor justo no ataque. E a IA nem sempre respeita a célula: a ponta da lâmina cruza a linha da grade e aparece como um caco no quadro vizinho.

**O que fazer:** em clipes de ação, usar como régua a raiz da área da maior mancha de cabelo, ajustada por vista a partir do `idle`, e separar os quadros por mancha conexa, levando a mancha inteira para a célula do seu centro. A altura das linhas com laranja não serve: a pele tem tom parecido e infla a medida. Ver [direcionamento/17](direcionamento/17-kit-animacoes-personagem.md).

**Evidência:** antes do ajuste, `walk` saía com menos da metade do tamanho de `run` na folha de conferência, e `slash_b_front` tinha um pedaço de lâmina solto no quadro 4. Depois, `python geradores/validate_player_kit.py` passa nos 22 clipes e nas 3 vistas.

## 15. O despill do kit do jogador deixa um monstro roxo cinza

**Causa raiz:** `despill` em `geradores/process_player_kit.py` trata como resíduo de magenta todo pixel com vermelho e azul acima do verde, e corta os dois. No Ichigo isso só pega a borda. O corpo do Shrieker é roxo, que tem essa mesma assinatura, então o despill aplicado à imagem inteira dessatura o monstro todo.

**O que fazer:** em arte com roxo, rosa ou lilás, aplicar o despill só no contorno da silhueta (2 px para dentro da máscara), como faz `edge_despill` em `geradores/process_hollow_clips.py`.

**Evidência:** a primeira tira de `shrieker_attack_front` saiu cinza-chumbo ao lado do walk8 roxo. Com o despill só no contorno, a cor bate e `python geradores/validate_hollow_clips.py` continua sem pixel magenta.
