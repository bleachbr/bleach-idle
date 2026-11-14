# Pendências

Dívida aberta. Item resolvido sai daqui e vira entrada em [_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md). O número não se reusa.

**Última atualização:** 2026-11-14

Registrar aqui é a saída, não o default. Antes, tente resolver na branch aberta. O motivo precisa conter uma destas frases: `fora do escopo`, `depende de terceiro`, `decisão de outra pessoa`, `falta evidência medida`.

## 14. Jogador-IA ainda não joga o Soul Survivor

`npm run play` em `test/` agora aborta cedo (exit 2) se não houver `server/src/index.ts` + `client/`, e `--prod` contra `bleach.acoplum.com` exige `--allow-prod`. O harness em si continua sendo do Bleach Idle: não sobe `make dev` nem joga o protótipo Three.js.

**Impacto:** médio (playtest automatizado do idle não cobre o survivor)

**Por que não resolvido aqui:** fora do escopo — adaptar personas/Playwright ao Survivor (portas Vite, HUD, combate) é outro pedido; aqui só o aborto e o opt-in de produção.

## 15. HUD continua dizendo "Shikai Ativa" depois do Bankai

`showCharacterInHud` lê o `stage` fixo do elenco em `src/playableCast.js`. A troca do nível 35 muda só o sprite, então o cartão do HUD segue com "Ichigo Kurosaki (Shikai Ativa)".

**Impacto:** baixo (texto do HUD; o sprite e o jogo estão certos)

**Por que não resolvido aqui:** fora do escopo — o HUD não tem gancho para a forma, e criar um aumentaria o `main.js`, que está no teto do inventário.
