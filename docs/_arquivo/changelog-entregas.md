# Changelog de entregas

## 2026-11-08 — Trilha Sonora Oficial (Aberturas no Login, Silêncio no Prólogo e Number One no Hueco Mundo)

- **Módulo Centralizado de Áudio (`src/audio.js`):**
  - Gerenciamento de trilhas em HTML5 `Audio` com desbloqueio automático de política de autoplay (`NotAllowedError`) acionado no primeiro clique ou tecla do jogador.
  - Música da Tela de Login: `arts/music/All Bleach Openings (1-16).mp3` em loop contínuo (`loop = true`) com volume balanceado (`0.45`).
  - Música de Batalha no Hueco Mundo: `arts/music/Number One (Vocal Version).mp3` com execução única (`loop = false`), sem repetição contínua.
  - Função `stopMusic()` para silenciamento imediato e reset de playback.
- **Integração no Ciclo de Vida do Jogo (`src/menu.js`, `src/main.js`):**
  - Na inicialização e no retorno ao menu (`showLoginMenu` / `returnToMenu`): disparo de `playLoginBGM()`.
  - Ao iniciar o jogo no Prólogo do Dangai (`startGame`): parada imediata da música (`stopMusic()`), garantindo silêncio no briefing com a Rukia.
  - Na travessia do Senkaimon para o Hueco Mundo (`onPrologueCompleted`): disparo de `playHuecoMundoBGM()`.
- **Infraestrutura e Nginx (`Dockerfile`, `infra/nginx.container.conf`):**
  - Cópia do diretório `arts/music` para `/usr/share/nginx/html/arts/music` na imagem de produção.
  - Bloco dedicado `location /arts/music/` no container Nginx com cache de 24h e resposta 404 em caso de ausência de arquivo.
- **Testes Unitários Automatizados (`scripts/test_runtime_safety.py`):**
  - 3 novos testes adicionados em `TestAudioSystemProtection` validando presença física dos arquivos de áudio, lógica de execução/loop do módulo e gatilhos nos arquivos de jogo.
  - Total de 66 testes unitários verdes em `make test`.

## 2026-11-08 — Sistema de Atributos RPG, Miniaturas no HUD, Ficha do Shinigami e Parecer ORCA (KIRO)

- **Auditoria e Veredito Formal de Arquitetura Multi-Agente ORCA (Juiz KIRO):**
  - Subagente especializado KIRO (Juiz Sênior de Sistemas de RPG & Gameplay Survivor) convocado via ORCA para avaliar matematicamente a progressão do jogador, balanceamento e interface.
  - Veredito emitido: **APROVADO COM RESSALVAS TÉCNICAS E DE BALANCEAMENTO** com diretrizes mandatórias:
    1. Hard cap de CDR em 65% através da fórmula assintótica de Ability Haste (`CooldownBase * max(0.35, 100 / (100 + Haste))`) para prevenir disparo infinito e memory leaks de projéteis.
    2. Mitigação de dano de Hierro com retornos decrescentes e teto rígido de 75% (`Dano * max(0.25, 100 / (100 + Hierro))`).
    3. Regeneração contínua de Kaidō limitada a 4% da vida máxima por segundo em combate (ticks a cada 1.0s).
    4. Limitação estrita de slots: até 3 armas ativas simultâneas e até 4 itens passivos, com 5 níveis por item e filtragem no banner de Level-up (se 3 armas já estiverem equipadas, novos poderes não são ofertados; apenas aprimoramentos das armas atuais).
- **Motor Matemático Puro de Atributos RPG e Sinergias (`src/stats.js`):**
  - `calculateEffectiveStats(player, passives)`: calcula atributos consolidados (Dano Espiritual ATK %, Velocidade Shunpo m/s, Haste/CDR %, Hierro DEF mitigação %, Kaidō Regen HP/s, Vórtice de Reishi magnet m).
  - Matriz de sinergias ativas detectada dinamicamente:
    - *Getsuga Devastador* (Getsuga Tenshō + Pressão Espiritual): dano crítico e feixe expandido.
    - *Relâmpago Instantâneo* (Hadō #4 Byakurai + Passo Relâmpago): recarga acelerada e cadência superior.
    - *Vórtice Incandescente* (Hadō #31 Shakkahō + Vórtice de Reishi): explosões ígneas com sucção de almas e Hollows.
    - *Muralha Espiritual* (Hierro + Kaidō): sobrevivência máxima para builds tanques.
  - Avaliação de orientação tática de build (`determineBuildOrientation`): `⚔️ MELEE & SHUNPO`, `🔮 KIDŌ DESTRUIDOR`, `🛡️ HIERRO DEFENSIVO`, `⚖️ SHINIGAMI EQUILIBRADO`.
- **Miniaturas de Build no Canto Superior Direito do HUD (`src/build_hud.js`, `src/style.css`):**
  - Painel `#build-hud-panel` no canto superior direito exibindo:
    - Selo de orientação tática de build em tempo real (`.build-strategy-badge`).
    - 3 slots de armas ativas (`#build-weapons-row`) com ícone, numeral romano de nível (`I` a `V`), tooltip e indicador tracejado para slots vazios (`[+] Slot`).
    - 4 slots de itens passivos (`#build-passives-row`) com ícone, tag do atributo (`FOR`, `DES`, `DEF`, `REG`, `MAG`), numeral de nível e tooltip.
- **Ficha do Shinigami & Sinergias no Modal de Pausa / AFK (`src/pause_modal.js`, `index.html`, `src/style.css`):**
  - Ao pressionar ESC (ou entrar em modo AFK), o modal `#pause-modal` abre a **Ficha do Shinigami** em layout de 3 colunas detalhadas:
    1. *Atributos do Shinigami*: HP total, ATK Dano Espiritual %, Velocidade Shunpo, CDR % (Cap 65%), Hierro mitigação % (Cap 75%), Kaidō Regen HP/s e Vórtice Magnético.
    2. *Arsenal Ativo (X/3)*: detalhamento de cada arma com dano efetivo calculado, tempo de recarga reduzido e dano total acumulado na partida.
    3. *Itens Passivos (X/4)*: listagem dos itens equipados e seus bônus por nível.
    4. *Sinergias Ativadas*: grade com badges iluminadas destacando exatamente como os itens buffaram os poderes.
- **Progressão do Level-Up (`src/levelup.js`, `src/main.js`):**
  - Geração dinâmica de ofertas (`generateAvailableOfferings`): respeita a regra de 3 armas ativas e 4 itens passivos, oferecendo aprimoramentos até o Nível 5 e eliminando a restrição arcaica de substituição total de poderes.
- **Suite de Testes Automatizados e Qualidade (`scripts/test_rpg_stats.py`, `Makefile`):**
  - 6 testes unitários em `scripts/test_rpg_stats.py` validando os hard caps matemáticos de CDR (65%), Hierro (75%), Kaidō regen (4%) e detecção de sinergias.
  - Alvo `make rpg-stats-test` adicionado ao `make test`, totalizando 63 testes unitários verdes.
  - Catraca de tamanho de código (`scripts/lint/js_size.py`): todas as novas funções respeitam $\le 20$ linhas de código no corpo. O teto de `src/main.js` foi reduzido de 1288 para 1283 linhas em `scripts/lint/size_inventory.json`.
- **Deploy em Produção na VPS:**
  - Build Docker compilada para `linux/amd64` (commit `0d3cbe9`) e enviada para a VPS (`69.62.95.136`).
  - Container `bleach-jogo-1` reiniciado e saudável (`/healthz` retornando `ok` em `https://bleach.acoplum.com`).
- **Evidências Visuais E2E Playwright:**
  - `rpg_01_hud_miniatures_top_right.png` (846 KB): miniaturas de slots de armas e itens no topo à direita com selo de build.
  - `rpg_02_pause_shinigami_sheet_and_synergies.png` (180 KB): Ficha do Shinigami aberta no ESC com atributos e arsenal.
  - `rpg_03_pause_synergies_activated.png` (185 KB): Ficha do Shinigami com sinergias ativadas (Relâmpago Instantâneo, Getsuga Devastador, Muralha Espiritual).
  - `rpg_04_gameplay_action_with_rpg_hud.png` (859 KB): combate no Hueco Mundo com HUD de build sincronizado.

- **Reposicionamento Canônico e Visibilidade da Lua no Hueco Mundo (`geradores/map_specs/hueco_mundo.md`, `geradores/map_generator.py`, `src/maps/hueco_mundo.js`):**
  - Reposicionamento da Lua Crescente do Bleach diretamente ao Norte ($X = 0, Z = -175\text{ m}$) e em baixa altitude sobre as dunas do horizonte ($Y = 38\text{ m}$ em vez de 180m na estratosfera), ficando imediatamente visível no enquadramento natural da câmera ao iniciar o combate.
  - Imunidade à neblina procedural (`fog: false` e `depthWrite: false` em `MeshBasicMaterial`), garantindo que a lua nunca seja ofuscada ou ocultada pela névoa volumétrica do deserto.
  - Escala ampliada para $46 \times 46\text{ m}$ e orientação `lookAt(0, 12, 0)` voltada para o centro da arena.
- **Transição Cinemática no Prólogo com Portal Senkaimon (`src/prologue.js`):**
  - Ao concluir o 4º diálogo com a Rukia (ou acionar o botão de atravessar o Senkaimon), inicia-se uma sequência cinemática dramática de 1.4s:
  - O portal do Senkaimon (`senkaimon_portal_group`) surge à frente no Dangai em $Z = -8.5\text{ m}$ com textura espiritual e aura brilhante azul-celeste, escalando suavemente de 0.2 a 1.0.
  - Rukia Kuchiki recua para trás ($Z = 0 \to +4.5\text{ m}$) e abre espaço para a investida.
  - O Shinigami do jogador toma a frente, centraliza seu percurso ($X = +0.85 \to 0.0$) e avança em corrida veloz diretamente para dentro do portal ($Z = 0 \to -8.5\text{ m}$).
  - A esteira de corrida acelera para 11 m/s e a câmera segue o mergulho do personagem no portal antes do flash branco dimensional do Senkaimon que conduz ao Hueco Mundo.
- **Suíte de Testes de Proteção contra Regressões (`scripts/test_runtime_safety.py`):**
  - Adição de 4 novos testes automatizados integrados ao `make test` (`make safety-test`), totalizando 57 testes unitários verdes:
    1. Proteção de coordenadas e altitude da Lua ao Norte ($Z < -120$, $|X| \le 20$, $25 \le Y \le 55$, tamanho $\ge 40$).
    2. Proteção de material da Lua (nome `bleach_moon`, `fog: false`, `depthWrite: false`).
    3. Proteção da transição cinemática do prólogo (recuo da Rukia, avanço do jogador para $Z < -2.0$ e criação do portal).
    4. Proteção contra referências não vinculadas em `src/main.js` (`exposeDebugInterface`, `handleEscapeKey`).
- **Evidências Visuais E2E Playwright:**
  - `hueco_mundo_moon_north_low_horizon.png` (749 KB): vista em primeira/terceira pessoa da Lua ao Norte no horizonte desértico.
  - `prologue_portal_cinematic_dash.png` (752 KB): Rukia recuando e jogador correndo em direção ao portal Senkaimon.

## 2026-11-08 — Sobrevivência Infinita (Endless Survivor), Level-Up 10s, Mapa Hueco Mundo 4x, Modo AFK e Reiatsu Dinâmica

- **Ciclo Infinito de Sobrevivência (Endless Survivor Loop) (`src/cycle.js`, `src/main.js`, `src/hud.js`):**
  - Remoção definitiva da tela prematura de vitória ao derrotar o Menos Grande (Gillian). O jogador permanece no Hueco Mundo até a exaustão total de sua vida (`player.hp <= 0`).
  - Ao purificar o Menos Grande, uma chuva massiva de Reishi é dispersada na arena e um banner dinâmico anuncia o avanço de ciclo (`⚔️ CICLO 2 INICIADO! A NOITE DO HUECO MUNDO SE INTENSIFICA — HORDA ESCALONADA`).
  - Escalonamento contínuo por ciclo: aumento progressivo de HP dos inimigos (+35% por ciclo), HP do Boss (+45% por ciclo), velocidade (+8% por ciclo) e dano (+20% por ciclo), além de bônus de Reishi.
  - Indicador de ciclo ativo no HUD superior (`Nv. X · C1`, `C2`...) e censo de Gillians purificados.
  - Justificativa arquitetural: retenção prolongada do jogador enquanto os novos biomas (Seireitei, Karakura) e progressão de classe estão no pipeline.
- **Auto-Escolha de Poderes no Level-Up com Timer de 10s (`src/levelup.js`, `src/style.css`):**
  - Adição de contador visual e regressivo de tempo no banner flutuante de Level Up (`[ ⏱ Auto-escolha em 10.0s ]` com animação de pulso `@keyframes pulseTimer`).
  - Se o jogador não escolher uma carta ativa ou passiva em 10 segundos, o sistema sorteia automaticamente uma das cartas oferecidas e fecha o banner sem travar o jogo.
  - Teclas de atalho `[1, 2, 3]` e `[0 / P]` (pular) respeitadas com cancelamento imediato do timer regressivo.
- **Expansão do Mapa do Hueco Mundo em 4x com Relevo Procedural, Floresta e Lua Canônica (`geradores/map_specs/hueco_mundo.md`, `geradores/map_generator.py`, `src/maps/hueco_mundo.js`):**
  - Dimensão do mundo expandida para 440m x 440m (4x maior) com raio de arena jogável de 176m (grid de 96x96 com 9216 vértices).
  - Setorização ambiental canônica: dunas abertas elevadas (dunas de até 13m) e aglomerados de Floresta dos Menos (árvores de quartzo petrificadas e ruínas de Las Noches).
  - Céu estrelado com 550 estrelas cintilantes procedurais em `BufferGeometry` e Lua Crescente canônica do Bleach (textura procedural de lua fria com halo espectral em plano billboard inclinado a 180m de altitude).
  - Plano de corte de câmera estendido para 480m para visualização panorâmica de todo o horizonte desértico.
- **Modo AFK com Camuflagem Espiritual e Horda em Patrulha (`src/reiatsu.js`, `src/main.js`):**
  - Pausar o jogo (tecla Esc) não congela o loop WebGL (online/multiplayer-friendly).
  - O Shinigami entra em estado de camuflagem espiritual (`setPlayerCamouflage`), ficando semitransparente (opacidade 0.35) e saindo do campo de percepção dos Hollows.
  - Hollows ativos perdem o alvo e entram em estado de vagueação/patrulha livre (`updateEnemyWandering`), mantendo o ecossistema vivo sem causar dano de contato ao jogador ausente.
- **Pressão Espiritual (Reiatsu) Dinâmica e Agro Escalonado (`src/reiatsu.js`, `src/main.js`):**
  - Pontuação de Pressão Espiritual (`calculateReiatsuScore`) baseada dinamicamente no nível, passivas de Reiatsu, abates e ciclo atual.
  - Raio de atração/agro dos Hollows escala proporcionalmente de 16m até 65m: jogadores novatos têm área segura ampla; veteranos de alta Reiatsu atraem Hollows de distâncias massivas.
  - Spawns adicionais por pacote de horda (+0 a +4 Hollows) baseados na Reiatsu acumulada.
  - Integração com o Hall da Fama e Telemetria: registro de Ciclo Máximo atingido e Pico de Reiatsu em cada partida.
- **Governança, Catraca de Linhas e Testes Automatizados:**
  - Desacoplamento estrito em 3 módulos especializados (`src/cycle.js`, `src/levelup.js`, `src/reiatsu.js`), todas as funções $\le 20$ linhas.
  - Catraca de JS rebaixada: `src/main.js` encolheu de 1335 para 1288 linhas (atualizado em `scripts/lint/size_inventory.json`).
  - Suíte de 7 novos testes unitários automatizados em `scripts/test_endless_evolution.py` integrada a `make test` (53/53 testes verdes).
  - 5 capturas E2E Playwright registradas: `hueco_mundo_4x_moon_and_stars.png`, `endless_01_gameplay_arena_4x.png`, `endless_02_afk_pause_camouflage.png`, `endless_03_cycle2_announcement.png`, `endless_04_levelup_auto_timer_badge.png`.

## 2026-11-08 — Início da Jornada no Dangai com Corrida Infinita em Linha Reta e Diálogo com Rukia

- **Mecânica de Corrida Infinita em Esteira (Treadmill Runner) (`src/prologue.js`, `src/maps/dangai.js`):**
  - Implementação do efeito de corrida infinita através de esteira procedural: Rukia Kuchiki ($X = -0.85$) e o Shinigami do jogador ($X = +0.85$) correm lado a lado em linha reta contínua ($Z = 0$), virados para a frente em direção ao horizonte do Dangai.
  - Animação sincronizada de passadas em 8 quadros (`walk8`: `back_0` a `back_7` a 10 FPS) com bobbing vertical dinâmico de corrida humana ($\Delta Y = \pm 0.035$ m).
  - Deslocamento contínuo da textura de solo rochoso espiritual (`arts/56_dg_ground.png`) via scroll de offset UV (`offset.y += speed * dt`) com `RepeatWrapping`.
  - Deslocamento dinâmico e reciclagem modular dos 9 props canônicos do Dangai (`arts/57_dg_props.png`): props deslizam em direção à câmera ao longo do eixo $+Z$ e são reposicionados no horizonte ao ultrapassar o campo de visão ($Z > 16 \to Z - 65$), garantindo um corredor infinito sem risco de colisão ou fuga da arena. Desobstrução automática da faixa central ($|X| < 2.5$).
- **Bloqueio Total de Controles do Jogador (`src/main.js`):**
  - Durante o prólogo (`isPrologueActive()`), as entradas de movimentação (WASD, setas, analógico virtual mobile) e pulo (Espaço) são completamente travadas para impedir deslocamento ou giro do personagem, mantendo o jogador como espectador imersivo da corrida da dupla.
  - Câmera em terceira pessoa travada em perseguição heroica atrás dos corredores em $(0, Y + 2.35, 6.2)$ olhando adiante para $(0, Y + 1.25, -12.0)$.
- **Diálogo Interativo e Transição Dimensional:**
  - Sistema de diálogo visual novel mantido no ritmo do jogador: typewriter acelerado, suporte a pular digitação no primeiro clique e avançar no segundo clique, avanço por Enter / Espaço ou clique em `[ ❯ Próximo ]`, e atalho `[ ⏭ Pular Briefing ]`.
  - Ao confirmar a 4ª mensagem (ou pular), dispara o flash de Reiatsu do Senkaimon, troca o mapa para as dunas brancas do Hueco Mundo, destrava instantaneamente os controles do jogador e inicia a partida normal.
- **Validação Automatizada de Ponta a Ponta (`scratch/test_infinite_runner_prologue.py`):**
  - Telemetria rigorosa via Playwright comprovando: (1) bloqueio estrito de posição do jogador em $(0.85, 0)$ mesmo com WASD pressionados, (2) progressão íntegra dos 4 diálogos (1/4 a 4/4), (3) transição sem congelamentos após o Senkaimon, (4) desbloqueio de controles comprovado com deslocamento em Hueco Mundo ($Z = -4.83$).
  - Catraca de tamanho de JS rebaixada para 1335 linhas (`size_inventory.json`).
  - 4 capturas registradas como artefatos: `prologue_runner_01_side_by_side.png`, `prologue_runner_02_dialogue_step2.png`, `prologue_runner_03_dialogue_step4.png`, `prologue_runner_04_hueco_mundo_start.png`.

## 2026-11-08 — Calibração de Câmera (Zoom Inicial Próximo) e Proporção Heroica do Personagem

- **Ajuste de Distância de Câmera (`src/main.js`, `src/menu.js`):**
  - Distância de início de partida rebaixada de `13.0` (e travada em `14.5` pela rotação do menu) para `10.0`, iniciando a gameplay com enquadramento mais próximo e imersivo estilo PokéBonk.
  - Faixa de clamping dinâmico no scroll do mouse reajustada para `[8.0, 14.0]`, impedindo afastamento excessivo e permitindo zoom-in detalhado.
  - Centro do alvo de foco da câmera elevado para $Y = 1.25$ para manter o personagem perfeitamente enquadrado.
- **Aumento na Proporção do Personagem (`src/main.js`, `src/nametag.js`):**
  - Geometria do plano do jogador redimensionada de `2.0 x 2.0` para `2.35 x 2.35` (+17.5%), harmonizando a presença visual do Shinigami com os Hollows e o cenário.
  - Offset vertical da placa 3D de identificação (`nametag`) ajustado dinamicamente para $Y = 2.50$, preservando o espaçamento aéreo sobre a cabeça do personagem.
  - Todos os quality gates validados: `make test` (46/46), `make size-check`, `make docs-check`, `npm run build` e validação Playwright.

## 2026-11-08 — Prólogo e Briefing da Missão no Dangai com Rukia Kuchiki

- **Pipeline do Gerador de Sprites da Rukia (`geradores/sprite_processor.py`, `src/assets/characters/rukia/`, `src/characters.js`):**
  - Processamento automatizado da folha `arts/walk8/rukia_sheet.png` com remoção de chroma key (#FF00FF), despill de contorno e alinhamento de baseline de solo (107px uniformes em 4 direções: front, back, side e side_l).
  - Validação completa com `geradores/validate_sprites.py` (0% variação de altura, jitter de 0px) e aprovação oficial com geração de `atlas.png`, `manifest.json` e sincronização no registro `PLAYABLE_CHARACTERS` em `src/characters.js`.
- **Geração Procedural do Bioma Dangai (`geradores/map_specs/dangai.md`, `geradores/map_generator.py`, `src/maps/dangai.js`, `src/assets/maps/dangai/`):**
  - Extração de 9 props canônicos de tempo-espaço do Mundo do Precipício a partir de `arts/57_dg_props.png` com chroma key e despill (`prop_dg_0` a `prop_dg_8`).
  - Textura de solo rochoso espiritual a partir de `arts/56_dg_ground.png` aplicada em relevo procedural 3D com barreiras montanhosas de Kōryū limitando a arena em 46m.
  - Atmosfera abissal cósmica (`sky_color: #0a0512`, névoa roxa, iluminação espiritual sem luar).
  - Atualização do motor gerador de mapas para exportar dinamicamente módulos Three.js (`createDangaiMap`).
- **Sistema de Prólogo e Diálogo Narrativo Interativo (`src/prologue.js`, `src/style.css`):**
  - Instanciação da NPC Rukia Kuchiki em 3D no Dangai em `(0, y, -3.2)` com placa flutuante de Reiatsu (`src/nametag.js`), sombra de solo e animação contínua de respiração/bobbing com billboarding.
  - Interface visual novel estilo Bleach com avatar de alta fidelidade da Rukia, título da 13ª Divisão, efeito typewriter acelerado para exibição das falas e controle por teclado (Espaço/Enter) ou toque.
  - Briefing canônico em 4 etapas: (1) alerta de ruptura no Dangai, (2) invasão massiva no Hueco Mundo ameaçando o Seireitei, (3) missão de travessia e contenção, (4) ordem de purificação do Menos Grande (Gillian) e retorno vivo ao Seireitei.
  - Transição dimensional com flash de Reiatsu do Senkaimon ao concluir o briefing ou ao acionar o botão "Pular Briefing", teleportando o Shinigami diretamente para o combate no Hueco Mundo.
- **Desacoplamento de HUD e Ratchet de Tamanho (`src/hud.js`, `src/main.js`, `scripts/lint/size_inventory.json`):**
  - Extração limpa de `updateHUD` e `showGameOver` para o módulo modular `src/hud.js` com funções $\le 20$ linhas.
  - Redução da dívida técnica de `src/main.js` de 1357 para 1336 linhas (ratchet catraca baixado em `size_inventory.json`).
  - Todos os quality gates verdes: `make test` (46/46), `make size-check`, `make docs-check`, `npm run build`.

## 2026-11-08 — Ranking Global e Hall da Fama no Menu Principal

- **Ranking Global e Hall da Fama (`src/leaderboard.js`, `index.html`, `src/style.css`):**
  - Implementação de card interativo integrado ao menu principal com glassmorphism no padrão PokéBonk, exibindo tabela de melhores combatentes com medalhas dinâmicas (🥇 1º, 🥈 2º, 🥉 3º), nível, abates, tempo de sobrevivência (`mm:ss`) e dano acumulado formatado.
  - Abas de ordenação reativa sem recarregamento de página: **⚔️ Abates**, **⏱️ Tempo** e **💥 Dano**.
  - Destaque visual automático da linha do jogador ativo (`leaderboard-row-me`) combinando com o nickname do Shinigami informado no login.
- **Backend e Persistência Confiável (`server/telemetry_orchestrator.js`):**
  - Endpoints `/api/leaderboard` (GET com query `sort=kills|time|damage` e POST para gravação de runs finalizadas) com persistência estruturada em `logs/leaderboard.json` e fallback resiliente em `localStorage` (`bleach_leaderboard_records`).
  - Lendas canônicas pré-semeadas (Kenpachi Zaraki, Ichigo Kurosaki, Kisuke Urahara, Byakuya Kuchiki, Rukia Kuchiki).
- **Integração com Encerramento de Partida (`src/main.js`):**
  - Submissão automática dos resultados de fim de jogo (`showGameOver`) para o backend e cache local, atualizando imediatamente o Hall da Fama ao retornar ao menu.
- **Responsividade e Qualidade:**
  - Layout em grid 2 colunas no desktop e empilhamento adaptável no mobile (`@media (max-width: 860px)`).
  - Testes e validação visual automatizada via Playwright em `scratch/test_leaderboard_validation.py` com 5 screenshots capturados.
  - Catraca de tamanho de código respeitada: `src/main.js` reduzido para 1357 linhas, funções em `src/leaderboard.js` $\le 20$ linhas (`make size-check` e `make test` verdes).

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

## 2026-11-09 — Kit de animações do personagem principal

O Codex gerou 66 folhas: 22 clipes de 12 quadros em 3 vistas, cobrindo tudo o que acontece com o jogador (lista em [direcionamento/17](../direcionamento/17-kit-animacoes-personagem.md)). `src/playerAnimation.js` escolhe o clipe e `src/playerSprite.js` desenha. A morte agora toca a queda antes da tela de fim.

Conferido no navegador, registrando o clipe tocado quadro a quadro: andar, pulo, pouso, os três cortes, Getsuga, Byakurai, kidō em movimento, dano leve, dano pesado (forçado num hollow marcado como chefe), morte, level-up e pausa, sem erro no console. `scripts/test_player_animation.py` passa com 15 testes. `victory` e `shakkaho` parado não apareceram nessa sessão.
