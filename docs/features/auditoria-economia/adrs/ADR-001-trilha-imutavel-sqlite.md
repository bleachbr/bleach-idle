# ADR-001: Trilha Imutável de Auditoria Econômica em SQLite

**Status:** Aceito — 31/10/2026 (Waldir)  
**Contexto:** `W-08`

## Decisão

1. **Tabela Dedicada `economy_audit`:**
   - Para não sobrecarregar as tabelas de estado operacional (`players`, `wallets`, `market`, `mailbox`), a auditoria vive em uma tabela separada `economy_audit`.
   - Utiliza prepared statement reutilizável para inserções rápidas em modo WAL, com overhead inferior a 0,1 ms por inserção.
2. **Campos Estruturados e Metadados Livres:**
   - Estrutura: `account_id`, `char_id`, `currency` (`kan` | `crystals` | `item`), `delta` (número com sinal positivo ou negativo), `balance_after` (saldo resultante), `reason` (enum string padronizado), `item_id` (opcional), `details` (JSON string com metadados como comprador, vendedor, etc.) e `created_at`.
3. **Agregações Econômicas:**
   - Métodos utilitários de agregação (`queryFlow`) permitem computar taxa de criação vs queima de moeda por período, servindo de base para o balanceamento de longo prazo.
