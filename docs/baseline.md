# Linha de base de qualidade e desempenho

Medida em 31/10/2026 (sábado), no código do commit `4715715` (a branch do PR #2 só acrescenta documentação à `main`), num Apple M4 de 10 núcleos com macOS e Node 22.23.2. Serve para saber se uma mudança piorou algo: reexecute o comando na sua máquina antes de comparar números.

## Qualidade
| Verificação | Comando | Resultado |
| :--- | :--- | :--- |
| Tipos | `npm run typecheck` | sem erros (Node 22 e Node 24) |
| Vitest | `npm test` | 9 arquivos e 76 testes passam em cerca de 1,3 s (Node 22 e 24) |
| Cenários | `npm run test:scripts` | 312 verificações OK e 2 falhas **só aos sábados e domingos** (`social` e `rebirth`, XP em dobro). 418 s local e cerca de 9 min no CI. No Node 24, o mesmo resultado |
| Build do cliente | `npm run build` | 4,5 s; um JavaScript de 1,67 MB (398 KB comprimido); `client/dist` com 19 MB |
| Imagem Docker | `docker build .` | constrói (675 MB). Em contêiner descartável, `/healthz`, `/`, `/maps/soul.tmj` e `/manifest.webmanifest` respondem 200. Roda como root, com `NODE_ENV=production` e Node 24. Sem `.git`, `.claude`, `art` nem `docs` dentro |
| Segredos | `gitleaks git --redact -c .gitleaks.toml .` | sem achados em 48 commits. Sem a config seriam 5, todos a senha fictícia do e2e do lobby |
| Dependências | `npm audit --omit=dev` | 3 achados: 1 alto (`nanoid`, transitiva) e 2 moderados (`@colyseus/core`, `@colyseus/ws-transport`). A correção é um upgrade maior do Colyseus (0.15 para 0.18) |
| CI da `main` | `gh run list --workflow ci.yml` | das 11 execuções mais recentes da `main` antes do PR #2, 1 falhou (29/10, commit "Sprite não encolhe..."); o commit seguinte troca a espera fixa do teste do Bankai por espera de estado, que é a causa provável (não li o log dessa execução) |

## Desempenho (microbenchmarks)
Comando: `npx tsx .claude/skills/performance-servidor/scripts/bench.mts 1000`. Banco em memória, saves de fim de jogo de 3,7 KB, 100 a 400 repetições após aquecimento.

| Operação | Quando roda | p50 | p99 |
| :--- | :--- | :--- | :--- |
| `JSON.stringify` de 200 saves (já está dentro da linha seguinte; não soma) | dentro do `saveAll`, a cada 10 s | 2,8 ms | 13 ms |
| `db.saveMany` de 200 personagens | a cada 10 s | 5,5 ms | 17,5 ms |
| `db.allChars()` com 1.000 personagens | ranking, no máximo a cada 15 s | 26 ms | 57 ms |
| BFS `findPath`, meta inalcançável, em `karakura` | por jogador ou monstro sem caminho | 0,19 ms | 0,7 ms |
| BFS `findPath`, meta inalcançável, em `falsa` | idem | 0,17 ms | 0,4 ms |

O BFS em `karakura` teve p99 de 10 ms numa primeira rodada, com os mesmos parâmetros: a cauda varia de uma execução para outra, então compare vários números e não um só.

## Tamanhos e limites
- 59 handlers de mensagem (54 no `WorldRoom`, 5 no `LobbyRoom`); `WorldRoom.ts` com 2.563 linhas.
- 176 monstros nos spawns (karakura 38, hueco 20, soul 19, lasnoches 27, falsa 41, wandenreich 31).
- Colyseus: `maxClients` 200 no mundo e 1.000 no lobby; `patchRate` de 50 ms; mensagem de até 4 KB; 40 mensagens por segundo por cliente.
- Arte em `client/public/assets`: 16 MB.

## O que não foi medido
Duração do tick sob carga de jogadores reais, banda de rede por cliente, tempo de gravação em disco (fsync) e o comportamento atrás do Caddy com HTTPS. O ambiente de desenvolvimento do Rafael não foi testado; não há sinal de Windows no repositório.

## Como atualizar
Reexecute os comandos acima, troque os números, mude a data e o commit no topo, e registre a máquina. Mudança de desempenho entra com o número de antes e o de depois na descrição do PR.
