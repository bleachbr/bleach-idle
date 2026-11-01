# ADR-001: Correio em tabela SQLite própria, retirada por DELETE condicional

**Status:** Aceito — 31/10/2026 (Waldir)

## Decisão
1. Módulo `server/src/mailbox.ts` com conexão e tabela próprias, no mesmo padrão de `market.ts`.
2. `take(id, to)` apaga a carta com `DELETE ... WHERE id AND to_char` e só devolve o anexo se `changes > 0`: impede duplicar item/kan por retirada concorrente.
3. O `WorldRoom` confere o espaço do inventário numa cópia antes de retirar; carta sem espaço permanece intacta.
4. A API de `send` é interna (servidor). Não há mensagem de cliente que envie carta: remetente jogador fica para spec futura.
5. Limite por caixa aplicado no `send` (poda das mais antigas) e expiração por consulta (`created_at > now - TTL`) mais `purgeExpired` horário.
