# Pendências

Dívida aberta. Item resolvido sai daqui e vira entrada em [_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md). O número não se reusa.

**Última atualização:** 2026-11-12

Registrar aqui é a saída, não o default. Antes, tente resolver na branch aberta. O motivo precisa conter uma destas frases: `fora do escopo`, `depende de terceiro`, `decisão de outra pessoa`, `falta evidência medida`.

## 13. Horda e dano multiplayer ainda são locais por cliente

A presença (posição, nick, personagem) sincroniza pela sala `hueco-mundo-arena`, mas cada navegador continua spawando e matando a própria horda. O ranking de dano compartilhado no orquestrador existe, porém o combate autoritativo e o drop de Reishi por maior dano ainda não atravessam a rede.

**Impacto:** médio (dois jogadores se veem, mas não disputam o mesmo hollow)

**Por que não resolvido aqui:** fora do escopo — netcode de combate compartilhado é entrega própria (Frente 2 / multiplayer além da presença).

## 14. Jogador-IA ainda não joga o Soul Survivor

`npm run play` em `test/` agora aborta cedo (exit 2) se não houver `server/src/index.ts` + `client/`, e `--prod` contra `bleach.acoplum.com` exige `--allow-prod`. O harness em si continua sendo do Bleach Idle: não sobe `make dev` nem joga o protótipo Three.js.

**Impacto:** médio (playtest automatizado do idle não cobre o survivor)

**Por que não resolvido aqui:** fora do escopo — adaptar personas/Playwright ao Survivor (portas Vite, HUD, combate) é outro pedido; aqui só o aborto e o opt-in de produção.
