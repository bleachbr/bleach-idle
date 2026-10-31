# Linha de base de qualidade e desempenho

Medida em 31/10/2026 (sábado), sobre a `main` no commit `84e0180` mais as mudanças deste PR (que não alteram código de produção), num Apple M4 de 10 núcleos com macOS e Node 22.23.2. Serve para saber se uma mudança piorou algo: reexecute o comando na sua máquina, com ela ociosa, antes de comparar números.

## Qualidade
| Verificação | Comando | Resultado |
| :--- | :--- | :--- |
| Tipos | `npm run typecheck` | sem erros (Node 22 e Node 24) |
| Vitest | `npm test` | 16 arquivos e 144 testes passam em cerca de 1,2 s (Node 22) |
| Cenários | `npm run test:scripts` | 314 verificações OK e 0 falhas, cerca de 7 min local (Node 22) |
| Build do cliente | `npm run build` | 4,5 s; um JavaScript de 1,67 MB (398 KB comprimido); `client/dist` com 19 MB |
| Imagem Docker | `docker build .` | constrói (675 MB). Em contêiner descartável, `/healthz`, `/`, `/maps/soul.tmj` e `/manifest.webmanifest` respondem 200. Roda como root, com `NODE_ENV=production` e Node 24. Sem `.git`, `.claude`, `art` nem `docs` dentro |
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
