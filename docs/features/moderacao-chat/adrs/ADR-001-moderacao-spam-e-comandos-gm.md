# ADR 001: Arquitetura do Módulo de Moderação e Comandos de GM (M3-05)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Aceito |
| **Data** | 2026-10-31 |
| **Autor** | Waldir |
| **Contexto Técnico** | Segurança do servidor, moderação de chat e persistência SQLite |

---

## 1. Decisão Arquitetural

1. **Módulo Dedicado (`server/src/moderation.ts`):**
   - Evita inflar `WorldRoom.ts` e isola as estruturas de rate-limit por personagem (`chatWindows`) e de silenciamento persistente (`mutes` sincronizado com `db.getMeta("chat_mutes")` / `db.setMeta("chat_mutes", ...)`).
2. **Autorização de GM Zero-Trust (`isGm(charId)`):**
   - Lê `process.env.GM_CHARS` (ex.: `GM_CHARS="waldir,rafael"`), normalizando cada ID com `trim().toLowerCase()`.
   - Sem `GM_CHARS` definido, ninguém possui permissão de GM (seguro por omissão, seguindo a diretriz de `flags.ts`).
3. **Cobertura Completa de Canais:**
   - `checkChatMessage(charId, rawText, now)` é chamado tanto no handler `chat` (canal geral) quanto nos subcomandos `/pm`, `/p` e `/g`, impedindo que um jogador silenciado contorne o bloqueio por mensagens privadas ou de grupo.
