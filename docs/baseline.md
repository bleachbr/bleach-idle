# Linha de base de qualidade e desempenho

## Cenários contínuos — 04/11/2026

Pré-publicação autorizada por Rafael: integrada `origin/main` em `9ba1211`, sem conflitos; nota de atualização dos sete cenários em `shared/src/releases.ts`. Tipos, 478 testes em 84 arquivos e build aprovados após a integração (JS 1.802,20 kB / 425,37 kB gzip). Gitleaks 8.30.1 baixado da release oficial com SHA-256 conferido: 259 commits examinados, nenhum segredo encontrado. As medições abaixo precedem a integração; preservadas como histórico do desenvolvimento.

Windows, Node 24.12.0, branch `feat/renovacao-visual-mapas`. A revisão de composição substitui os layouts visuais da primeira renovação. São 44 imagens de cenário únicas, 7.140.974 bytes comprimidos e 89.758.720 bytes (85,6 MiB) estimados para pixels RGBA sem mipmaps/alinhamento/overhead. São carregadas antecipadamente, além dos assets existentes; isto não é medição de VRAM. Os sete PNGs de atlas continuam com 1.903.364 bytes como suporte de colisão/minimapa/fallback. Fontes de arte em `art/` ficam fora do build público.

Executado: `npm run typecheck`; `npm test` (445 testes, 79 arquivos); `npm run test:e2e` (9 testes, incluindo deslocamento real >10 células e mobs na câmera; captura opt-in fica ignorada no modo padrão); `npm run build` (JS 1.799,38 kB / 424,36 kB gzip, aviso de chunk grande já existente); `python art/maps/scenes/check_scene_alpha.py` (sete mapas sem sólidos de objetos totalmente sem cobertura visual); `cd server; npx tsx scripts/test.ts mapcheck lasnoches dangai endgame` (59 verificações OK). A suíte inicialmente revelou fixtures #26 sobre o prédio novo em (10,16): mudadas para a rua (13,16), mantendo comportamento e destino; regressões e suíte passaram depois.

Captura adicional: `$env:BI_MAP_PREVIEW='1'; npm exec -w e2e -- playwright test mapas.spec.ts --grep viaja` (1 teste aprovado, sete destinos capturados). Dev é ativado somente no servidor temporário dessa opção para obter nível/imortalidade via UI; o fluxo padrão mantém Dev desligado. Confirma o título do minimapa e sua pintura antes de capturar, pois o aviso privado de viagem pode chegar antes do patch de estado. Capturas em `art/maps/scenes/runtime/`, painel em `runtime-contact-sheet.jpg`. O teste de URLs também cobre os sete chãos WebP versionados e bloqueia caminhos antigos sem versão.

Revisão independente confirmou escala na captura real, referências/IDs do Tiled, lógica preservada (apenas correção do nome corrompido do portal no Dangai contra o commit anterior), cobertura alpha e capacidade geométrica dos spawns. Não medidos FPS, tempo de rede, GPU real ou aparelho móvel; não executados bateria completa de cenários, gitleaks nem atualização com worker antigo instalado. Alpha não verifica água/chão nem precisão dos contornos. As métricas abaixo registram a primeira revisão histórica.

## Renovação dos mapas — 03/11/2026

Windows, Node 24.12.0, worktree `feat/renovacao-visual-mapas`, base `2432a43`. Soma dos sete `client/public/maps/*_tiles.png`: 531.533 bytes antes (fontes em `art/maps/renewal/retained/`) e 1.903.364 depois. O número de atlases e suas dimensões não mudaram; fontes geradas em alta resolução ficam em `art/`, fora do build público. Não foi medido FPS nem tempo de carregamento em rede.

Validação: `npm run typecheck`; `npm test` (439 testes em 78 arquivos, Git Bash no PATH); `npm run test:e2e` (8 testes, 20 s); `npm run build` (5,62 s, JS 1.720,64 kB / 416,48 kB gzip, aviso de chunk grande já existente); `python art/maps/renewal/test_assemble.py` (1 regressão visual); `cd server; npx tsx scripts/test.ts mapcheck` (29 verificações, servidor isolado). A bateria completa dos demais cenários e gitleaks não foram executados. Revisão independente confirmou exatamente quatro flags de colisão alteradas por mapa em Karakura/Falsa; os outros cinco mapas permanecem intactos.

Medida em 31/10/2026 (sábado), sobre a `main` no commit `84e0180` mais as mudanças deste PR (que não alteram código de produção), num Apple M4 de 10 núcleos com macOS e Node 22.23.2. Serve para saber se uma mudança piorou algo: reexecute o comando na sua máquina, com ela ociosa, antes de comparar números.

## Qualidade
| Verificação | Comando | Resultado |
| :--- | :--- | :--- |
| Tipos | `npm run typecheck` | sem erros (Node 22 e Node 24) |
| Vitest | `npm test` | 37 arquivos e 225 testes passam em cerca de 2,4 s (Node 22) |
| Cenários | `npm run test:scripts` | 314 verificações OK e 0 falhas, cerca de 7 min local (Node 22) |
| Build do cliente | `npm run build` | 4,5 s; um JavaScript de 1,67 MB (398 KB comprimido); `client/dist` com 19 MB |
| Imagem Docker | `docker build .` | constrói (675 MB). Em contêiner descartável com volume novo em `/data`, `/healthz`, `/`, `/maps/soul.tmj` e `/manifest.webmanifest` respondem 200. Roda como `node` (não-root), com `NODE_ENV=production` e Node 24. Sem `.git`, `.claude`, `art` nem `docs` dentro |
| Segredos | `gitleaks git --redact -c .gitleaks.toml .` | sem achados em todo o histórico. Sem a config seriam 5, todos a senha fictícia do e2e do lobby |
| Dependências | `npm audit --omit=dev` | 3 achados: 1 alto (`nanoid`, transitiva) e 2 moderados (`@colyseus/core`, `@colyseus/ws-transport`). A correção é um upgrade maior do Colyseus (0.15 para 0.18) |
| CI da `main` | `gh run list --workflow ci.yml` | das 11 execuções mais recentes da `main` antes do PR #2, 1 falhou (29/10, commit "Sprite não encolhe..."); o commit seguinte troca a espera fixa do teste do Bankai por espera de estado, que é a causa provável (não li o log dessa execução) |

## Desempenho (microbenchmarks)
Comando: `npx tsx .claude/skills/performance-servidor/scripts/bench.mts 1000`. Banco em memória, saves de fim de jogo de 3,7 KB, 300 amostras por linha depois de 30 de aquecimento. Três rodadas seguidas com a máquina ociosa; a tabela traz a faixa das medianas (p50) e o maior máximo visto.

| Operação | Quando roda | p50 (3 rodadas) | Máximo visto |
| :--- | :--- | :--- | :--- |
| `JSON.stringify` de 200 saves (já está dentro da linha seguinte; não soma) | dentro do `saveAll`, a cada 10 s | 1,12 a 1,14 ms | 3,3 ms |
| `db.saveMany` de 200 personagens | a cada 10 s | 1,40 a 1,43 ms | 1,7 ms |
| `db.allChars()` com 1.000 personagens | apenas na 1ª carga (`ensureSeeded`) | 10,2 a 10,4 ms | 15,7 ms |
| `buildRanking()` incremental com 1.000 personagens | ranking, no máximo a cada 15 s | 0,10 ms | 0,45 ms |
| BFS `findPath`, meta inalcançável, em `karakura` | por jogador ou monstro sem caminho | 0,09 a 0,10 ms | 1,0 ms |
| BFS `findPath`, meta inalcançável, em `falsa` | idem | 0,09 ms | 0,8 ms |

A primeira medição deste documento (medianas 2 a 4 vezes maiores) rodou com um build do Docker e uma bateria de cenários ao mesmo tempo, e foi descartada. Lição: meça com a máquina ociosa e repita. Em outra máquina, ou com disco em vez de memória, os números mudam; compare sempre na mesma.

## Tamanhos e limites
- 59 handlers de mensagem (54 no `WorldRoom`, 5 no `LobbyRoom`); `WorldRoom.ts` com 2.563 linhas.
- 176 monstros nos spawns (karakura 38, hueco 20, soul 19, lasnoches 27, falsa 41, wandenreich 31).
- Colyseus: `maxClients` 200 no mundo e 1.000 no lobby; `patchRate` de 50 ms; mensagem de até 4 KB; 40 mensagens por segundo por cliente.
- Arte em `client/public/assets`: 16 MB.

## O que não foi medido
Duração do tick sob carga de jogadores reais, banda de rede por cliente, tempo de gravação em disco (fsync) e o comportamento atrás do Caddy com HTTPS. O ambiente de desenvolvimento do Rafael não foi testado; não há sinal de Windows no repositório.

## Como atualizar
Reexecute os comandos acima, troque os números, mude a data e o commit no topo, e registre a máquina. Mudança de desempenho entra com o número de antes e o de depois na descrição do PR.
