# Changelog de entregas

## 2026-11-08

### Kidō canônicos Byakurai e Shakkahō integrados ao FXManager

- **Hadō #4 Byakurai:** Conexão dos sprites canônicos `walk8`/quadros gerados (`src/assets/fx/skill_byakurai/` e `src/assets/fx/hit_byakurai/`) com velocidade balística de 28.0 m/s, perfuração de linha e colisão real contra hollows via FXManager.
- **Hadō #31 Shakkahō:** Registro comportamental e visual em `src/fx/fxConfig.js` e `src/characters.js` para projétil explosivo de impacto.
- **Desacoplamento e Tamanho:** Funções mantidas abaixo de 20 linhas e arquivos dentro do ratchet de código (`make size-check`).

Passado. A entrada nova fica no topo. Número de pendência ou de aprendizado que aparecer aqui já saiu do arquivo aberto, ou ainda está aberto e o texto diz isso.

## 2026-11-08 — CI alinhado ao protótipo (pendência 1 resolvida)

- **Workflow (`.github/workflows/ci.yml`):** removidos os jobs legados do bleach-idle (`test` com typecheck, `e2e` e `deploy` em VPS). Ficam `gitleaks`, `quality` (`test_governanca.py`, `docs_check.py`, `test_js_size.py`, `js_size.py`, `test_player_movement.py`) e `build` (`npm ci && npm run build`).
- **Makefile:** novo alvo `make test` = `movement-test docs-test size-test`.
- **Evidência:** `make test`, `make docs-sync`, `make docs-check` e `make size-check` rodados localmente. O workflow em si não foi executado no GitHub nesta sessão.

## 2026-11-07 — Correção do Travamento de Chefe, Coleta de Logs Backend e Orquestrador Multiplayer

Diagnóstico, resolução definitiva de congelamento no spawn de chefe e implantação da infraestrutura de backend para telemetria e sessões multiplayer:

- **Diagnóstico da Causa Raiz:** O travamento relatado aos 46s com 59 hollows ocorria exatamente no 60º abate, momento em que a condição `kills >= 60` disparava `spawnBossMenosGrande()`. O método referenciava a variável inexistente `enemyPool` em vez de `enemyMeshes`, provocando um `ReferenceError` não capturado no loop de animação que congelava a renderização.
- **Correção Imediata:** Normalizada a busca para `enemyMeshes.find(e => !e.active)` em `src/main.js`, restabelecendo o fluxo sem qualquer interrupção.
- **Serviço Backend de Telemetria e Logs (`server/telemetry_orchestrator.js`):** Criação de serviço de logging com gravação em disco em `logs/telemetry.log`, gerando linhas estruturadas com timestamp ISO, identificador do jogador, nível (`INFO`, `WARN`, `ERROR`, `ACTION`), tipo de evento e mensagem detalhada. Integrado nativamente ao `vite.config.js` via middlewares `/api/telemetry/log` e `/api/telemetry/stats`.
- **Captura Global de Erros no Cliente (`src/telemetry.js`):** Instalação de handlers globais em `window.onerror` e `window.onunhandledrejection`, garantindo que qualquer exceção de runtime seja automaticamente enviada com stack trace completo para o servidor.
- **Orquestrador de Salas Multiplayer:** Implementação dos endpoints `/api/multiplayer/join`, `/api/multiplayer/sync` e `/api/multiplayer/room`, permitindo sincronização em tempo real de combatentes no Hueco Mundo, ranking compartilhado de dano e desconexão graciosa por inatividade.
- **Validação Automatizada com Reprodução E2E (`scratch/test_telemetry_and_boss_spawn.py`):** Script Playwright simulando exatamente 59 hollows abatidos em 46s e disparando o 60º abate; verificado que o jogo continuou 100% ativo (`state.active === true`), o Menos Grande surgiu com barra de vida visível e o evento `BOSS_SPAWNED` foi registrado no arquivo de log do backend. Catracas `make size-check`, `make movement-test` e `make docs-check` 100% aprovadas.

## 2026-11-07 — Joystick Virtual Mobile e Hollow Elite (Refinamento V1)

Entrega dos recursos finais de enriquecimento e jogabilidade móvel para consolidação da Versão 1 de Bleach: Soul Survivor antes do início da Versão 2:

- **Controles Touch Completos (`src/joystick.js`):** Criação de módulo dedicado de controles virtuais com stick analógico flutuante (`#virtual-joystick-zone`), indicador com mola e clamps de raio máximo, botão de ação de salto (`#btn-virtual-jump`) e suporte multi-touch para rotação simultânea de câmera (look drag orbital 360° na metade direita da tela).
- **Vetor Analógico e Teste Unitário (`src/movement.js`):** Extensão da função pura `computePlayerDisplacement(keys, yaw, joyVector)` com suporte a sensibilidade contínua analógica, zona morta de $0.08$ e preservação total de compatibilidade com teclado/mouse no desktop. Cobertura de teste unitário automatizado adicionada em `scripts/test_player_movement.py` (9/9 testes passando).
- **Entidade Hollow Elite Mutante (`src/main.js`):** Inclusão de variante mutante de alta densidade espiritual entre os inimigos comuns e o chefe:
  - Escala aumentada para $2.2\text{m}$ (Fishbone comum: $1.4\text{m}$; Menos Grande: $3.8\text{m}$).
  - Tonalidade carmesim/vermelho Reiatsu (`0xff3355`) com feedback de dano flash e restauração de cor.
  - Atributos balanceados: $200\text{ HP}$, velocidade $3.4$ e $22$ de dano por contato.
  - Recompensa tática: drop massivo de $6$ orbs de Reishi ao ser purificado.
  - Rastreamento e Censo: contabilizado em `state.census.elite` e exibido no relatório final de combate com distinção de "Hollow Mutante (Elite)".
- **Qualidade e Governança:** Limites de tamanho de arquivo e funções rigorosamente cumpridos (`make size-check` verde, `src/main.js` reduzido de 1432 para 1425 linhas e `setupInputListeners` reduzido para 102 linhas). Testes de governança `make docs-test` e `make docs-check` 100% aprovados.
- **Validação E2E Mobile Playwright (`scratch/test_mobile_and_elite.py`):** Emulação completa de iPhone 13 validando entrada na partida, aparição dos controles touch, deslocamento de $12.06\text{m}$ via joystick, pulo de $0.78\text{m}$, spawn do Hollow Elite e exibição do censo no relatório de missão cumprida. 6 capturas de tela registradas. Documentação completa em `docs/direcionamento/15-joystick-virtual-mobile-e-hollow-elite.md`.

## 2026-11-07 — Execução e Validação de Partida Completa de Ponta a Ponta (Aceite da V1)

Conclusão e validação automatizada do ciclo completo de partida no browser, atendendo ao critério principal de aceite da Versão 1 da Frente 1 do Roadmap:

- **Entrada e Identidade:** Login na tela inicial estilo PokéBonk com definição de apelido Shinigami ("Ichigo Kurosaki") persistido em `localStorage`, transição fluida para a arena do Hueco Mundo com HUD ativo e ocultação de controles de estúdio durante o combate.
- **Sobrevivência e Combate:** Movimentação nas dunas 3D (WASD e Pulo com Espaço), auto-mira direcionada aos Hollows Fishbone D e coleta dinâmica de esferas de Reishi com raio magnético.
- **Três Escolhas de Cartas em Tempo Real:** Subida de nível com abertura do banner inferior translúcido sem congelar o jogo; validação das 3 seleções consecutivas de evolução (Getsuga Tenshō, Shunpo e Hadō Byakurai) via atalhos numéricos (`1`, `2`, `3`) e cliques diretos nas cartas, com progressão comprovada do Nível 1 até o Nível 4.
- **Confronto e Purificação do Boss:** Aparição do Menos Grande Gillian em escala colossal ($3.8\text{m}$) com barra de vida de chefe no topo da tela, combate até o esgotamento dos $2000\text{ HP}$ e purificação com queda de Reishi épico.
- **Tela de Vitória (Missão Cumprida):** Exibição do relatório pós-batalha com título *"MISSÃO CUMPRIDA! (VITÓRIA)"*, tempo de sobrevivência, abates, dano total acumulado, censo de Hollows purificados e discriminação de dano por arma (Asauchi e Getsuga Tenshō).
- **Reinício em Memória sem Reload:** O botão *"JOGAR NOVAMENTE"* (`#btn-restart`) foi validado executando `resetMatch()`, zerando cronômetro, abates e entidades em memória de forma instantânea sem depender do destrutivo `location.reload()`.
- **Retorno Gracioso ao Menu:** Navegação de volta à tela de login preservando o nickname e reiniciando a órbita cinemática de fundo.
- **Evidências Automatizadas:** Script E2E Playwright (`scratch/run_full_match_validation.py`) executado com 100% de sucesso através de 9 capturas de tela sequenciais (`match_01_login_screen.png` até `match_09_returned_to_menu.png`). Gates `make size-check`, `make movement-test`, `make docs-test` e `make docs-check` aprovados.

## 2026-11-07 — Normalização Visual Canônica dos Hollows da V1: Fishbone D e Menos Grande Gillian

Consolidação visual definitiva dos monstros para a Versão 1 de Bleach: Soul Survivor, substituindo placeholders provisórios por sprites canônicos oficiais em `walk8` (8 frames de caminhada e 4 direções):

- **Hollow Comum (Horda):** Aprovado e integrado o **Fishbone D** (`src/assets/monsters/fishbone/`), extraído de `arts/walk8/fishbone_sheet.png`. Máscara com orifícios, torso esquelético e garras canônicas com variação de altura 360° de apenas 3.77% e ancoragem de solo estável (baseline $y=117\text{px}$, jitter 0px). Escala no Three.js configurada para $1.4\text{m}$.
- **Chefão da V1:** Aprovado e integrado o **Menos Grande Gillian** (`src/assets/monsters/menos_grande/`), extraído de `arts/walk8/gillian_sheet.png`. Máscara cônica pontiaguda e manto negro esvoaçante com variação de altura de apenas 1.87% e escala imponente de $3.8\text{m}$ sobre as dunas do Hueco Mundo.
- **Simplificação de Escopo:** Eliminação dos desenhos procedurais em canvas 2D. A horda agora gera exclusivamente o Fishbone D, e o clímax traz a instância individual do Menos Grande Gillian, unificando a experiência estética da V1. Os monstros especializados (Shrieker voador e Acidwire venenoso) foram movidos para a Frente 2 do roadmap.
- **Animação Dinâmica de Passadas nos Billboards:** `updateEnemyBillboard()` calcula a rotação angular relativa à câmera e avança a passada de 8 quadros a 8 FPS para cada inimigo ativo, permitindo que a horda caminhe de forma fluida e canônica.
- **360° Sprite Studio:** Inclusão de `fishbone` e `menos_grande` no seletor de `/preview.html` com suporte a giro orbital 360° e controle de taxa de quadros.
- **Validações e Testes:** `make size-check` (zero violações, limites mantidos), `make movement-test` (8/8 testes passando), `make docs-test` e `make docs-check` aprovados. Bateria de testes E2E com Playwright (`scratch/test_hollow_visuals.py`) validou escala, bilboarding 360° e renderização em jogo e no estúdio. Documentação em `docs/direcionamento/14-normalizacao-hollows-v1-fishbone-e-gillian.md`.

## 2026-11-07 — Tela de Início / Login estilo PokéBonk, Acesso aos Estúdios 360° e Retorno ao Menu

Entrega da tela de início e autenticação estilo PokéBonk com acesso direto às ferramentas de criação e retorno gracioso ao menu, atendendo ao item da Frente 1 do roadmap.

- **Interface de Login Estilo PokéBonk:** Card central em glassmorphism com animação de flutuação de logotipo (`floatLogo`), pulso de Reiatsu azul/dourada (`reiatsuPulse`), chip de combatente ativo e campo de entrada de nickname Shinigami com persistência automática no `localStorage` do navegador (chave `bleach_shinigami_name`). Botão principal CTA ("ENTRAR NO HUECO MUNDO") com animação contínua de pulso energético (`pokebonkPulse`) e varredura de luz diagonal (`flareSweep`).
- **Acesso Dedicado aos Estúdios 360°:** Inclusão de botões diretos de navegação na tela de entrada para o **360° Map Studio** (`/preview_map.html`, visualizador orbital do relevo de dunas e props do Hueco Mundo) e para o **360° Sprite Studio** (`/preview.html`, visualizador orbital 360° dos spritesheets de 8 direções e normalização de caminhada).
- **Câmera Cinemática de Fundo:** Durante a permanência no menu de início, a cena 3D do Hueco Mundo continua ativa com rotação suave em órbita contínua (0.12 rad/s), mantendo dunas, lua mística e árvores de quartzo em exibição dinâmica por trás do card de entrada.
- **Módulo Desacoplado `src/menu.js`:** Toda a lógica de armazenamento, estado do menu, câmera orbital e bindings de botões foi isolada em módulo próprio com funções $\le 18$ linhas de código. O loop principal de `src/main.js` foi decomposto em `renderMenuBackground`, `updateGame` e `loop`, permitindo que `loop` saísse definitivamente do inventário de funções acima do teto de 20 linhas.
- **Ciclo de Vida da Partida e Retorno ao Menu:** Modais de pausa (ESC) e de fim de jogo (vitória ou derrota) ganharam o botão "VOLTAR AO MENU" (`#btn-menu-pause` e `#btn-menu-gameover`). O reinício foi reimplementado via `resetMatch()` em memória, zerando cronômetro, abates, pool de inimigos e passivas sem recorrer ao destrutivo `location.reload()`. Guardas de Pointer Lock impedem captura indevida do cursor durante o preenchimento do formulário de login.
- **Testes e Validação:** `make movement-test` (8/8 testes unitários passando), `make size-check` (zero violações, redução permanente de dívida com saída de `loop`), `make docs-test` e `make docs-check` aprovados. Teste automatizado Playwright (`scratch/test_login_menu.py`) validou transições de tela, rotação de câmera, preenchimento de nickname, caminhada e retorno ao menu. Documentação completa em `docs/direcionamento/13-menu-login-pokebonk-e-navegacao-de-estudios.md`.

## 2026-11-07 — Gerador de mapas procedural por IA e Bioma Hueco Mundo

Entrega do gerador de mapas 3D procedural orientado por diretrizes de IA (`geradores/map_generator.py` e `geradores/map_specs/hueco_mundo.md`), definindo o Hueco Mundo como cenário oficial da V1 no lugar da arena plana de Karakura Town.

- **Extração e normalização de props:** 19 props recortados das folhas canônicas (`48_hm_props.png`, `54_ln_props.png`, `57_dg_props.png`) com remoção de chroma key magenta (`#e71fe7`), antialiasing e despill em `src/assets/maps/hueco_mundo/props/`, mais textura contínua de areia de quartzo (`ground_sand.png`). Aprendizado 8.
- **Engine procedural de relevo 3D:** Alturas calculadas por combinação de ondas senoidais multioctavas ($220\text{m} \times 220\text{m}$, raio jogável $88\text{m}$, resolução $64 \times 64$), montanhas perimetrais intransponíveis, lua crescente do Hueco Mundo, iluminação atmosférica noturna e dispersão determinística de 99 props canônicos (árvores de quartzo petrificadas e ruínas de Las Noches) com elevação $Y$ no solo e raio de colisão física.
- **Integração no jogo (`src/main.js` e `src/maps/hueco_mundo.js`):** Interpolação bilinear em $O(1)$ (`getTerrainHeight(x, z)`). Jogador, hollows e o boss Menos Grande caminham, pulam e projetam sombras ajustadas dinamicamente à elevação das dunas. Colisão física contra props integrada.
- **360° Map Studio (`preview_map.html` e `geradores/preview_map.js`):** Estúdio de inspeção orbital 360° com wireframe de relevo, visualização de caixas de colisão, iluminação customizável e métricas em tempo real. Link direto na HUD do jogo.
- **Medição automatizada:** 100% de aprovação via Playwright (`scratch/test_hueco_mundo_map.py`), com registro de elevação de dunas (centro $y = -0.0001\text{m}$, duna $y = -0.49\text{m}$, pico $y = 1.50\text{m}$, pulo $y = 0.96\text{m}$). Catracas `make size-check` e `make docs-check` aprovadas com ratcheting para baixo no inventário (`src/main.js` de 1493 para 1390 linhas).

## 2026-11-07

Governança de agentes para Claude, Antigravity, Kiro e Grok. O contrato único é `AGENTS.md`. `CLAUDE.md` e `GEMINI.md` são delta. Skills canônicas em `.agents/skills/`, com symlink só para `.claude/skills` e `.kiro/skills`. Grok e Antigravity leem `.agents/skills` direto.

`docs/ROADMAP.md` passou a ser a fonte do plano executável. `ENTREGAS_ROADMAP.md` guarda a visão de produto e aponta para esse roadmap, sem caixa. `make docs-sync` reescreve o bloco de progresso do STATUS. `make docs-check` reprova numeração, motivo de pendência, bloco divergente e link relativo quebrado. O job `docs` do CI roda o teste do checker e o check.

Oito links `file://` absolutos em `docs/direcionamento/` (05, 06, 08 e 09) viraram caminho relativo. O check reprova `file:` daqui em diante. Aprendizado 4.

O Stop do Claude não injeta texto puro. O hook desse evento usa `--format claude-stop` (`hookSpecificOutput.additionalContext`) e fica mudo quando o stdin traz `stop_hook_active: true`. O SessionStart continua em texto puro. Aprendizado 5.

O Stop do Antigravity ignora `injectSteps`. Esse evento usa `--format antigravity-stop`: `decision: continue` e `reason` quando há aviso, `decision: stop` quando não há, e `decision: stop` de novo se `executionNum` é maior que 1. O `SessionStart` continua com `injectSteps`. Aprendizado 6.

Tamanho de função (20 linhas de código) e de arquivo (menos de 500) do `src/**/*.js` virou catraca em `make size-check`. A dívida já medida fica em `scripts/lint/size_inventory.json` e só desce. Desacoplamento entre módulos está em `AGENTS.md`. Aprendizado 7.

A frente 1 separou a partida jogada do menu. O reinício que existe é `location.reload()` no `btn-restart`. Menu de início e volta ao menu é outra caixa, aberta. Nenhuma caixa da frente 1 foi marcada. O código da frente 0 já estava em `main` antes desta entrega.

## 2026-11-07 — Infra de deploy

O `Dockerfile` deixou de ser vazio: build do Vite e nginx sem root na porta 2567, a mesma do bleach-idle. A pasta `infra/` guarda o compose, o `deploy.sh`, o nginx do container e a referência do nginx do host, mais o runbook do corte e do rollback em `infra/README.md`. O domínio, o certificado e a porta não mudam, então o corte é trocar o container. `make docker-run` passou a publicar 2567. Evidência: `make docker-build`, container `healthy`, `/`, `/healthz` e `/preview.html` com 200. Nenhum deploy foi feito. O job `deploy` do CI continua sendo o do bleach-idle (pendência 1).

Primeiro corte na VPS em 2026-11-07: `bleach-jogo-1` passou de `bleach-idle:02f4c97` para `bleach-soul-survivor:7c0e4c8`, `healthy`, sem tocar no nginx do host nem em outros serviços da VPS. Arquivos em `/opt/bleach-idle/soul-survivor/`. `/`, `/healthz`, `/preview.html`, o bundle JS e o redirect do `www` responderam pelo domínio. O Dockerfile fixa o estágio de build em `$BUILDPLATFORM` porque o esbuild quebra sob qemu. Detalhes e rollback em `infra/README.md`.

Correção no mesmo dia: o primeiro deploy subiu sem sprites e texturas, porque o jogo as carrega por `/src/assets/...` em runtime e o `vite build` não as copia. O `Dockerfile` passou a copiar `src/assets` e o nginx do container devolve 404 real nesse caminho. Evidência: `image/png` pelo domínio e `404` para arquivo inexistente. Aprendizado 10.
