# ADR-001: Troca direta 1v1 com duas confirmações (M3-01)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Proposto. Rascunho do Rafael em 01/11/2026 |
| **Contexto** | [PRD Social avançado](../PRD-social-avancado.md) §3.1 |

---

## 1. Contexto

Não há troca no código. O que mais se parece é o mercado (`server/src/market.ts` e `registerMarketMessages`), que guarda o item numa linha do SQLite e usa `DELETE ... changes > 0` como trava para não vender duas vezes. A troca é diferente: o item fica com o dono até o fim, e os dois lados mudam juntos.

Dois riscos conferidos no código:
- **Duplicação por save parcial.** A troca muda a memória dos dois jogadores. Se um sai do jogo (o `onLeave` grava o save dele) e o servidor cai antes do próximo `saveAll` (10 s), o outro volta com o estado de antes da troca: o item existe nos dois.
- **Conexões separadas.** `db.ts`, `market.ts`, `mailbox.ts`, `guilds.ts` e `economyAudit.ts` abrem cada um a sua `DatabaseSync`. Um `BEGIN` numa conexão não cobre o que as outras gravam.

## 2. Decisão

### 2.1. Estado e protocolo
- O estado da troca vive só no servidor, num módulo novo `server/src/trade.ts` (Map por id de troca, sem nada no schema do Colyseus).
- Mensagens novas (cliente → servidor, todas por `this.handle`, em `registerTradeMessages`):
  - `tradeRequest { id }`, `tradeAnswer { accept }`
  - `tradeOffer { items: { index, qty }[], gold }`: substitui a oferta inteira. `index` inteiro de 0 a `INV_SIZE - 1`, `qty` inteiro ≥ 1, até 8 itens, `gold` inteiro ≥ 0. Índice repetido é recusado.
  - `tradeReady`, `tradeConfirm`, `tradeCancel`
- Servidor → cliente: `trade { id, with, mine, theirs, readyMe, readyThem, confirmMe, confirmThem }`, com a oferta resolvida (`{ id do item, qty }`), e `tradeEnd { reason }`.
- Qualquer `tradeOffer` destrava `ready` e `confirm` dos dois lados.

### 2.2. Validação
- Uma função pura `tradeBlocked(a, b, now)` devolve o motivo (texto) ou `undefined`: online, vivos, mesmo mapa, `chebyshev ≤ INTERACT_RANGE`, fora de duelo, fila e contagem da arena, fora do Dangai, sem caveira, sem bloqueio de PvP, nível mínimo (PRD §7). (O `travelBlocked` de hoje não cobre fila da arena nem Dangai: a lista aqui é a completa.) Ela roda no pedido, em cada mensagem e a cada tick enquanto a troca está aberta (só para as trocas abertas, para não pesar o tick).
- A oferta guarda `{ index, id, qty }`. No `tradeConfirm`, cada item confere `inv[index]?.id === id && inv[index].qty >= qty`. Se o item mudou de lugar (foi usado, vendido, movido ao depot), a troca é cancelada com motivo.
- **Versão da oferta:** a mensagem `trade` leva um contador `rev`, que sobe a cada `tradeOffer` de qualquer lado. `tradeReady { rev }` e `tradeConfirm { rev }` só valem se `rev` for o atual: um "Pronto" atrasado não vale para uma oferta que o jogador não viu.
- **Contra abuso e assédio:**
  - uma troca ou pedido aberto por jogador;
  - `tradeRequest` com recarga de 5 s;
  - pedido de quem está na lista `ignore` do alvo é descartado em silêncio;
  - `items` só é lido se `Array.isArray` e com até 8 elementos, antes de qualquer laço;
  - `gold` precisa ser `Number.isSafeInteger`, `>= 0` e `<= p.gold` no momento da oferta (e é conferido de novo no `tradeConfirm`).
- A troca é cancelada quando a sessão do jogador é assumida por outra janela (nesse caso o `onLeave` da sessão antiga não roda, então o cancelamento fica junto do `old.leave(4001)` do `onJoin`).

### 2.3. Execução atômica
1. Monta cópias dos dois inventários (`p.inv.map(...)`, como `questTurnIn` e `takeMail` já fazem): tira o que cada um dá, põe o que cada um recebe e confere com `addItem` que tudo coube. Confere o kan.
2. Só então muda a memória dos dois.
3. Grava os dois saves **e** a auditoria numa transação só. Para isso:
   - `economyAudit.ts`, `guilds.ts`, `mailbox.ts` e `market.ts` passam a usar a conexão do `db.ts`, que exporta `transaction(fn)`. Com conexões separadas não funciona: medido com `node:sqlite`, em arquivo a segunda conexão falha com "database is locked" durante o `BEGIN IMMEDIATE` da primeira (não há `busy_timeout`); em `:memory:` cada conexão é outro banco, grava sem erro e o `ROLLBACK` não a desfaz. Ou seja, os testes passariam e a produção falharia.
   - `transaction(fn)` faz `BEGIN IMMEDIATE`, `COMMIT` e `ROLLBACK` em toda saída (inclusive exceção). Transação esquecida aberta numa conexão compartilhada faz o `saveMany` do `saveAll` falhar com "cannot start a transaction within a transaction". Chamada aninhada vira `SAVEPOINT`, porque `saveMany`, `changeCrystals` e `setLeader` já têm `BEGIN` próprio.
   - Dentro dela não se usa `db.save`: o `save` chama `onUpsertChar` (índice do ranking) antes do `COMMIT`. A transação grava as linhas e chama o `onUpsertChar` só depois do `COMMIT`, como o `saveMany` já faz.
   - Teste de transação entre módulos com banco **em arquivo temporário**, não `:memory:`, mais um teste que confere que todos os módulos usam a mesma conexão.
   Se a transação falhar, a memória volta para as cópias de antes e a troca é cancelada.
4. Auditoria: `trade_give` e `trade_receive`, uma linha por item e por kan, de cada lado, com `details: { tradeId, with }`. `charId` é o id do personagem (não o nome; hoje a maior parte do código passa `p.name`, e isso fica registrado como pendência).

## 3. Consequências

- **Positivas:** sem duplicação mesmo com queda no meio; a lógica de validação é pura e testável com instantes fixos; nenhum campo novo no schema sincronizado.
- **Negativas:** mexe no `db.ts` (conexão compartilhada) e em quatro módulos que hoje abrem a própria (`economyAudit`, `guilds`, `mailbox`, `market`). Tem de vir antes, em PR próprio, com os testes existentes passando e o teste novo com banco em arquivo.
- **Testes:** `tradeBlocked`, `rev` e a montagem da troca com Vitest; cenário `trade` com dois bots (troca certa, item movido antes da confirmação, "Pronto" com `rev` velho, inventário cheio, afastar-se, desconectar no meio, sessão assumida por outra janela).
