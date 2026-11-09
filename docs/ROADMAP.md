# Roadmap

Fonte única do que está aberto. Caixa entregue fica numa linha; o relato vai para [_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md). Estado de hoje: [STATUS.md](STATUS.md).

**Última atualização:** 2026-11-08

A visão que estava em `ENTREGAS_ROADMAP.md` mora aqui desde 2026-11-07. Aquele arquivo só aponta para este.

## Frente 0 — já está no código

- [x] Loop Vite/Three com arena, câmera orbital e billboards (`src/main.js`, [direcionamento/05](direcionamento/05-camera-orbital-movimento-e-billboard-360.md))
- [x] Pipeline de sprites e normalização 360 (`geradores/`, [direcionamento/07](direcionamento/07-diretrizes-normalizacao-sprites-e-testes.md))
- [x] Ichigo shikai com ciclo de 8 frames em `src/assets/characters/ichigo_shikai/`
- [x] FX por configuração (`src/fx/`, [direcionamento/09](direcionamento/09-arquitetura-escalavel-fx-e-projeteis.md))
- [x] Horda, reishi, level-up, armas e boss Menos Grande, com tela de fim (tempo, nível, abates, dano, censo, dano por arma)
- [x] Gerador de mapas procedural por diretrizes de IA e bioma Hueco Mundo 3D com dunas, 99 props e estúdio 360° ([_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md))

## Frente 1 — aceite da versão 1

- [x] Partida jogada no browser com evidência no changelog: sobrevivência no Hueco Mundo, 3 cartas de level-up em tempo real, confronto e purificação do Menos Grande Gillian, tela de vitória com estatísticas e reinício em memória sem reload ([_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md))
- [x] Menu de início estilo PokéBonk e volta ao menu com nickname Shinigami, rotação orbital cinemática de fundo, botões de estúdios 360° e retorno ao menu via pausa/fim de jogo (`src/menu.js`, [direcionamento/13](direcionamento/13-menu-login-pokebonk-e-navegacao-de-estudios.md))
- [x] Visual canônico e unificado dos Hollows da V1: horda composta por Fishbone D e Chefão Menos Grande Gillian com ciclo walk8 de 8 frames em 4 direções, eliminando placeholders provisórios (`src/assets/monsters/`, [direcionamento/14](direcionamento/14-normalizacao-hollows-v1-fishbone-e-gillian.md))
- [x] Hollow elite (contorno carmesim, 200 HP, escala 2.2x, drop de 6 Reishi e censo) como entidade ativa em campo (`src/main.js`, [direcionamento/15](direcionamento/15-joystick-virtual-mobile-e-hollow-elite.md))
- [x] Joystick virtual no mobile com stick analógico flutuante, arrasto de câmera touch e botão de salto dedicado (`src/joystick.js`, [direcionamento/15](direcionamento/15-joystick-virtual-mobile-e-hollow-elite.md))
- [x] Prólogo e briefing de missão no Dangai (DG): Rukia Kuchiki normalizada via gerador a partir de `arts/walk8/rukia_sheet.png`, cenário procedural DG com solo `arts/56_dg_ground.png` e props `arts/57_dg_props.png`, diálogo animado com briefing completo da invasão, objetivo do Menos Grande Gillian e travessia Senkaimon para o Hueco Mundo (`src/prologue.js`, [_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md))

## Frente 2 — versão 2

- [x] Integração de Kidō com projéteis e sprites canônicos: Hadō #4 Byakurai (raio elétrico perfurante veloz) e Hadō #31 Shakkahō vinculados ao FXManager (`src/fx/`, [_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md))
- [x] Ranking global e Hall da Fama no menu principal com abates, tempo de sobrevivência e dano (`src/leaderboard.js`, [_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md))
- [x] Modo sobrevivência infinito (Endless Survivor Loop) no Hueco Mundo: escalonamento contínuo por ciclos, eliminação de vitória prematura no Menos Grande com chuva de Reishi e hordas exponenciais, auto-escolha de poderes em 10s com badge regressivo, mapa 4x maior com relevo dunas/floresta, Lua canônica e céu estelar, modo AFK com camuflagem espiritual e agro dinâmico por Pressão Espiritual (Reiatsu) (`src/cycle.js`, `src/levelup.js`, `src/reiatsu.js`, [_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md))
- [x] Sistema de Atributos RPG e Inspeção de Build: motor de atributos do Shinigami (Força/ATK, Destreza/Shunpo/CDR cap 65%, Hierro/DEF cap 75%, Kaidō/Regen cap 4%/s, Vórtice de Reishi), limite estrito de até 3 armas ativas e até 4 passivas com 5 níveis por item, miniaturas de slots no HUD superior direito com selo de orientação tática (Melee, Kidō, Defensivo, Equilibrado), Ficha do Shinigami e sinergias em destaque no modal de pausa AFK (ESC) e suite de testes de caps matemáticos (`src/stats.js`, `src/build_hud.js`, `src/pause_modal.js`, `scripts/test_rpg_stats.py`, [_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md))
- [ ] Variedade adicional de hollows (Shrieker com aproximação em zigue-zague, Acidwire com projéteis ácidos)

- [ ] Mapas Soul Society, Karakura Town e Dangai
- [ ] Shikai no nível 15 e Bankai no nível 35, com troca de sprite
- [ ] Elenco jogável além do Ichigo shikai em uso
- [ ] Metaprogressão na loja do Urahara
- [ ] Boss rush competitivo

## Frente 3 — engenharia do protótipo

- [x] CI diz a verdade sobre este `package.json`: gitleaks, quality e build; jobs do bleach-idle removidos ([_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md))
- [ ] `make docker-build` gera imagem (pendência 2)
- [ ] Um alvo de teste do jogo, versionado, para câmera, sprite e FX. Os scripts em `scratch/` não entram no git

## Radar

Pedido novo que passou pela skill `triagem-pedido` entra aqui numa linha: data, veredicto (`aceito`, `adiado` ou `recusado`) e motivo.
- 2026-11-08: aceito — ranking global e Hall da Fama no menu principal para exibir maiores abates, tempo de sobrevivência e dano acumulado.
- 2026-11-08: aceito — prólogo no Dangai (DG) com Rukia e briefing animado da missão antes da travessia para o Hueco Mundo.
- 2026-11-08: aceito — sobrevivência infinita (endless loop), auto-escolha level-up em 10s, mapa 4x com lua/estrelas, pausa AFK com camuflagem e Reiatsu dinâmica.
- 2026-11-08: aceito — sistema de atributos RPG, limite de 3 armas e 4 passivas com tiers 1-5, miniaturas no HUD superior direito e Ficha do Shinigami com sinergias na pausa (avaliado e aprovado via ORCA pelo juiz KIRO).

