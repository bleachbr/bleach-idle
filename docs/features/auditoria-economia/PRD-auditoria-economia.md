# PRD: Auditoria de Economia — Trilha Imutável de Transações (W-08)

**Status:** Aceito — 31/10/2026 (Waldir)  
**Item do Roadmap:** `W-08` (Fila Waldir)

---

## 1. Problema e Contexto

Com a expansão de sistemas econômicos (mercado entre jogadores `market`, correio com anexos `mailbox`, forja do Kisuke, Loja de Cristais e recompensas de chefes mundiais), o jogo precisa de uma trilha contábil append-only para:
1. **Prevenção e detecção de duplicação (anti-dupe):** rastrear a procedência de itens e kan transferidos entre personagens.
2. **Suporte a jogadores:** permitir aos operadores consultar o histórico de transações de um personagem (ex.: onde foram parar itens ou kan sumidos em bugs relatados).
3. **Equilíbrio econômico:** monitorar pontos de injeção e drenos (sinks) de kan e cristais na economia.

## 2. Objetivos

1. **Tabela Append-Only no SQLite (`economy_audit`):**
   - Registrar de forma transacional e imutável toda movimentação relevante de:
     - **Kan:** compras/vendas no mercado, taxas deduzidas, forja, compras no NPC, saques/depósitos de guilda, mortes e recompensas.
     - **Cristais:** compras na loja de cosméticos, recargas e recompensas diárias / chefes.
     - **Itens:** transferências de itens de alto valor ou via mercado/correio.
2. **Módulo de Registro e Consulta (`server/src/economyAudit.ts`):**
   - `recordAudit(entry)`: insere registro atômico com `(account_id, char_id, currency, delta, balance_after, reason, item_id, details, created_at)`.
   - `getAuditTrail(charId, limit)`: recupera o histórico cronológico de transações do personagem.
   - `queryEconomyFlow(since)`: agrega total de injeção vs drenos para balanço da economia.

## 3. Critérios de Aceite

- [x] Tabela `economy_audit` criada no SQLite com índices por `char_id`, `currency` e `created_at`.
- [x] Registros de auditoria são append-only (sem updates/deletes no fluxo normal de jogo).
- [x] Teste determinístico comprova gravação e consulta de auditoria para transferências de kan, cristais e itens.
- [x] Integração no `WorldRoom.ts` cobre mercado, correio e forja sem degradação perceptível no tick.
