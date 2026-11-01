# PRD: Arena de Duelos 1v1 Ranqueada (W-01)

**Status:** Aceito — 01/11/2026 (Waldir)  
**Item do Roadmap:** `W-01` (Fila Waldir)

---

## 1. Problema e Motivação

O PvP do Bleach Idle hoje é restrito ao combate aberto de mundo (`pvpHit`), onde PKs recebem caveira (`skullUntil`), perdem itens ao morrer e ficam bloqueados de entrar em zonas de proteção (PZ).
Isso atende ao confronto espontâneo, mas não oferece um ambiente competitivo estruturado para:
1. Medir a habilidade e build dos jogadores em confrontos equilibrados (sem punições predatórias de perda de inventário).
2. Fornecer pareamento justo por ranking (Rating Elo) e poder de combate (Reiatsu/Nível).
3. Garantir integridade de simulação com validação estrita anti-cheat de velocidade de movimento (`effectiveStepMs`).
4. Servir de base para temporadas ranqueadas (W-11) e hall da fama do servidor.

## 2. Objetivos e Requisitos

1. **Fila de Pareamento (`arena`):**
   - Acesso a partir do nível 20 (`PVP_MIN_LEVEL`).
   - Entrada na fila via mensagem `arenaQueue` ou comando `/arena entrar`.
   - Saída voluntária da fila via `arenaLeaveQueue` ou `/arena sair`.
   - Pareamento automático buscando adversários com rating Elo próximo, expandindo a janela de busca conforme o tempo na fila.

2. **Cálculo de Rating Elo Determinístico (`shared/src/arena.ts`):**
   - Sistema Elo padrão ($K=32$):
     $$E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}$$
     $$\Delta R_A = \text{round}(K \times (S_A - E_A))$$
   - Rating base inicial de 1000 pontos para todo personagem.
   - Divisões competitivas (Tiers):
     - **Bronze:** 1000 - 1199
     - **Prata:** 1200 - 1399
     - **Ouro:** 1400 - 1599
     - **Platina:** 1600 - 1799
     - **Diamante:** 1800 - 1999
     - **Capitão / Mestre:** 2000+

3. **Ciclo de Duelo no Servidor (`server/src/arenaManager.ts` e `WorldRoom.ts`):**
   - Ao encontrar adversário:
     - Notifica duelistas com `arenaMatchFound` (oponente, elo, contagem).
     - Teleporta para a Arena com contagem regressiva de 3 s (ação e passos travados durante a contagem).
     - Combate regulamentado: dano de PvP balanceado, sem geração de caveira (skull) nem penalidade de perda de XP ou itens ao morrer.
     - Término: morte de um dos lados, rendição voluntária (`/arena desistir`), desconexão ou tempo limite (180 s).
     - Resultado: atualização atômica de Elo no banco/progresso, premiação em Kan e pontos de temporada para o vencedor, restauração completa de vida e retorno ao templo.

4. **Anti-Cheat de Velocidade:**
   - O servidor valida o intervalo mínimo decorrido entre passos do jogador (`effectiveStepMs` com bônus de botas e status como lentidão/atordoamento).
   - Movimentos que violem a velocidade máxima permitida são rejeitados pelo servidor autoritativo.

## 3. Critérios de Aceite

- [x] Fórmulas e tiers de Elo puros e determinísticos em `shared/src/arena.ts`.
- [x] Testes unitários comprovando cálculo de Elo (vitória, derrota, empate, favoritos vs azarões).
- [x] Motor de pareamento e gerenciamento de duelo com isolamento e timeout.
- [x] Handlers de rede no servidor com validação de nível e autoridade estrita.
- [x] Duelo em arena não aplica perda de itens nem caveira do PvP de mundo aberto.
