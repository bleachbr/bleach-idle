# ADR-001: Rate Limit Persistente em SQLite e Token Assinado de Uso Único

**Status:** Aceito — 31/10/2026 (Waldir)  
**Contexto:** `M5-01`, `M5-02`

## Decisão

1. **Tabela `auth_limits` no SQLite (`server/src/db.ts`):**
   - Esquema: `CREATE TABLE IF NOT EXISTS auth_limits (key TEXT PRIMARY KEY, n INTEGER NOT NULL, since INTEGER NOT NULL)`.
   - `blocked(key, now)`, `fail(key, now)` e `clearFails(key)` consultam e atualizam diretamente `auth_limits` via prepared statements em `db.ts`. Como o SQLite roda em modo WAL no mesmo processo, a leitura/escrita por chave leva microssegundos e não bloqueia o tick.
2. **Token de Recuperação Híbrido (Assinatura HMAC-SHA256 + Nonce em `password_resets`):**
   - Formato do token: `<accountId>.<expiresAt>.<nonce>.<hmacBase64Url>`.
   - Segredo HMAC: lido de `process.env.RESET_TOKEN_SECRET` ou gerado com 32 bytes aleatórios na primeira inicialização e salvo em `meta("reset_token_secret")`.
   - Tabela `password_resets (nonce_hash TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL)` armazena apenas `sha256(nonce)` (nunca o token em texto puro, conforme regra R6 da skill `seguranca-servidor`).
   - O consumo valida a assinatura HMAC com `timingSafeEqual` antes de tocar no banco e consome a linha em `password_resets` de forma atômica (`DELETE ... WHERE nonce_hash = ? AND account_id = ? AND expires_at >= ?`).
