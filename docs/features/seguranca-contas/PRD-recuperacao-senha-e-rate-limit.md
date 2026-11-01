# PRD: Recuperação de Senha com Token Assinado e Rate Limit Persistente (M5-01 e M5-02)

**Status:** Aceito — 31/10/2026 (Waldir)  
**Itens do Roadmap:** `M5-01`, `M5-02` (Portão G2 — Abrir ao público)

---

## 1. Problema e Contexto

Para cruzar o **Portão G2 (Abrir ao público)**, a camada de contas precisa resolver dois riscos operacionais e de segurança:
1. **Perda de contadores de tentativas no reinício (`M5-02`):** os limites de falha de login (`login`), falha por IP (`ip:<addr>`) e criação de contas por IP (`reg:<addr>`) viviam apenas num `Map` em memória (`server/src/auth.ts`). Um reinício do processo zerava todos os bloqueios.
2. **Ausência de fluxo de recuperação de senha (`M5-01`):** jogadores que esquecem a senha não tinham como redefini-la com segurança e invalidar sessões antigas sem intervenção manual no banco SQLite.

## 2. Objetivos

1. **Persistência de Rate Limit em SQLite (`M5-02`):**
   - Persistir os contadores `(key, n, since)` na tabela `auth_limits` do SQLite.
   - Garantir que bloqueios de login (`60 s`) e de cadastro por IP (`1 h`) sobrevivam a reinícios do servidor.
2. **Token Assinado de Recuperação de Senha (`M5-01`):**
   - Permitir associar e-mail de recuperação opcional à conta (`accounts.email`).
   - Emitir token de recuperação assinado via HMAC-SHA256 com validade de **15 minutos** e nonce de **uso único** persistido em `password_resets`.
   - Ao consumir o token (`consumeResetToken` ou `action: "reset"` no `LobbyRoom.onAuth`), redefinir a senha com `scrypt`, invalidar todas as sessões ativas da conta e limpar o contador de falhas do login.

## 3. Critérios de Aceite

- [x] `fail()`, `blocked()` e `clearFails()` gravam e leem da tabela `auth_limits` em SQLite.
- [x] Token de recuperação possui assinatura HMAC-SHA256 verificada com `timingSafeEqual`, expira em 15 minutos e só pode ser usado uma única vez.
- [x] Token adulterado, expirado ou reutilizado é rejeitado sem alterar a senha.
- [x] Consumo válido do token troca a senha, derruba todas as sessões anteriores da conta em `sessions` e permite login imediato com a nova senha.
