---
name: performance-servidor
description: Orienta mudanças de desempenho no Bleach Idle - orçamento do tick de 100 ms, salvamentos, ranking, busca de caminho, sincronização do Colyseus e peso do cliente. Use ao mexer no tick, em pathfinding, saves, ranking, schema, broadcast, bundle ou assets, ou ao investigar lag. Mede antes de mudar.
---

# Desempenho do servidor e do cliente

Regra única: **meça, mude uma coisa, meça de novo**. Sem número antes e depois, não é otimização.

## Orçamento
O servidor simula a cada 100 ms (`TICK_MS`) num único processo Node. Tudo que roda no tick e tudo que é síncrono no event loop rouba tempo do tick, e isso inclui o SQLite (`node:sqlite` é síncrono). Não existe hoje métrica da duração do tick: o primeiro passo de qualquer investigação é medi-la (registre um aviso quando passar de 50 ms).

## Custos medidos (31/10/2026, Apple M4, Node 22.23, banco em memória, saves de fim de jogo de 3,7 KB)
| Operação | Quando roda | Custo |
|---|---|---|
| `findPath` (BFS), meta inalcançável, 4.000 nós | por jogador ou monstro sem caminho | p50 0,2 ms; p99 de 0,7 a 10 ms (duas rodadas divergiram) |
| `JSON.stringify` de 200 saves | dentro do `saveAll`, a cada 10 s | p50 2,8 ms; p99 13 ms |
| `db.saveMany` de 200 personagens | a cada 10 s | p50 5,5 ms; p99 17,5 ms (em disco soma o fsync) |
| `db.allChars()` com 1.000 personagens | reconstrução do ranking (cache de 15 s) | p50 26 ms; p99 57 ms |

Leitura: com 1.000 personagens salvos, uma reconstrução do ranking pode ocupar mais da metade de um tick, e o `saveAll` com 200 online ocupa de 5,5 a 17,5 ms de um tick a cada 10 s (o `stringify` já está dentro do `saveMany`; não some as duas linhas). Nada disso foi medido sob carga real de jogadores; é o piso, não o teto.

Para repetir as medidas na sua máquina: `npx tsx .claude/skills/performance-servidor/scripts/bench.mts [personagens]`. O script aborta se as inserções falharem, para não medir um banco vazio.

## Regras
1. **Não bloqueie o tick.** Trabalho pesado e periódico (ranking, backup, relatório) fica fora dele, é incremental ou usa cache com prazo. `VACUUM INTO` do backup também é síncrono.
2. **Todo laço do tick tem teto.** `findPath` tem `maxNodes = 4000`; mantenha esse padrão. Nunca crie busca sem limite por jogador.
3. **Sincronização custa para todos.** O Schema não tem filtros: cada campo novo vai a todos os clientes de todos os mapas, a 20 atualizações por segundo (`patchRate` padrão de 50 ms). Dado que só um jogador precisa vai por `send` ao dono (`sendTo`). `maxClients` do mundo é 200.
4. **`broadcast` é global.** O `WorldRoom` tem 31 chamadas, incluindo `fx` de dano e morte, que chegam a jogadores de outros mapas. Antes de criar efeito novo, pergunte se precisa sair da vizinhança. O `sendTo` percorre todos os clientes a cada mensagem (custo O(clientes)).
5. **Evite alocação por tick.** Copiar `[...this.state.players.values()]` é aceitável; criar objetos por monstro por tick, não.
6. **Cliente.** O build gera um único JavaScript de 1,67 MB (398 KB comprimido; o Vite avisa acima de 500 kB) e a pasta de arte tem 16 MB. O service worker (`client/public/sw.js`) serve a arte do cache e atualiza em segundo plano. Arte nova entra em formato WebP no modo HD e com a paleta compartilhada de `art/process.py`; divida o código (`import()`) antes de aceitar mais peso no pacote principal.
7. **Registre.** Resultado novo vai para `docs/baseline.md`, com data, máquina e comando.

## Ferramentas já no repositório
- `cd server && npx tsx scripts/balance.ts` simula XP por hora sem servidor.
- `server/scripts/bot.ts` e `spawncount.ts` rodam contra servidor real (precisa do servidor de pé; o runner `npm run test:scripts` sobe um isolado).
- `GET /healthz` devolve só `ok` e o tempo de atividade: um bom lugar para expor a duração do tick quando ela existir.
