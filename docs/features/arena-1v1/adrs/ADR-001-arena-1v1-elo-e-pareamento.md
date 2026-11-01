# ADR-001: Arquitetura da Arena de Duelos 1v1, Pareamento e Rating Elo (W-01)

**Status:** Aceito — 01/11/2026 (Waldir)  
**Decisores:** Waldir (Tech Lead), Antigravity Agent

---

## Contexto

A Arena 1v1 exige pareamento justo, cálculo confiável de habilidade (Rating Elo), controle do ciclo de vida da luta (contagem, combate, encerramento) e garantias de segurança contra speed-hacks e perdas indevidas de itens.

## Decisões Tomadas

1. **Rating Elo no Pacote Compartilhado (`shared/src/arena.ts`):**
   - O cálculo Elo segue a formulação clássica com fator $K = 32$.
   - `calculateEloChange(ratingA, ratingB, outcome)` é uma função pura e determinística.
   - O rating do jogador inicia em 1000 e é persistido no objeto `Progress.arena` (`{ rating, wins, losses, streak, bestRating }`).
   - Tiers competitivos são formatados em `shared` para consumo consistente tanto pela UI do cliente quanto pelo servidor.

2. **Gerenciador de Fila e Duelos (`server/src/arenaManager.ts`):**
   - A fila de pareamento reside na memória do servidor para respostas instantâneas sem overhead de I/O a cada tick.
   - Cada entrada na fila registra `{ playerId, rating, queuedAt }`.
   - A cada ciclo (1 s), o matcher procura pares dentro de uma janela de tolerância de Elo: $\Delta_{\text{max}} = 100 + \lfloor (now - queuedAt) / 10000 \rfloor \times 50$.
   - Quando um par é formado, o estado do duelo (`ArenaDuel`) é criado com id único, timestamps e posições de entrada.

3. **Isolamento de Regras de PvP:**
   - Duelos na arena usam um flag `inArenaDuel: true` no jogador.
   - Enquanto em duelo de arena:
     - `pvpHit` não aplica `skullUntil` nem `pvpUntil` (sem bloqueio de PZ após o duelo).
     - Se o HP zerar na arena, o jogador não sofre perda de EXP nem perda de itens (`DEATH_ITEM_LOSS`).
     - O perdedor é restaurado (`p.hp = p.maxHp`, `p.rei = p.maxRei`) e ambos retornam aos pontos de saída.

4. **Anti-Cheat de Velocidade:**
   - O servidor afere o tempo decorrido desde o último passo (`now - p.lastStepAt`) contra `effectiveStepMs(p.stepMs, p.statuses)`.
   - Se o cliente tentar enviar movimentos com frequência superior ao limite físico da entidade, o movimento é sumariamente descartado no `WorldRoom`.

## Consequências

- **Positivas:**
  - Ambiente competitivo seguro, sem risco de perda de inventário para os participantes.
  - Baixa latência e pareamento responsivo.
  - Fórmulas 100% testáveis unitariamente de forma determinística.
- **Cuidados:**
  - Garantir que duelistas desconectados concedam vitória por W.O. ao oponente que permaneceu conectado.
