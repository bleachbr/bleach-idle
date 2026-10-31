---
name: seguranca-servidor
description: Revisa e escreve código seguro no servidor autoritativo do Bleach Idle (Colyseus, SQLite, cliente Phaser com DOM). Use ao criar ou mudar handlers de mensagem (this.handle), validar entrada vinda do cliente, mexer em login, sessão, modo Dev, limite de tentativas, innerHTML, dependências ou segredos, e ao revisar PR que toque nisso.
---

# Segurança do servidor autoritativo

Tudo que chega pelo WebSocket é hostil até o servidor validar. O cliente só envia intenções (AGENTS.md §1 e §4.2). Abaixo, o que revisar e o que já foi provado neste repositório em 31/10/2026 (servidores isolados, porta própria, banco temporário).

## Antes de começar
1. Liste a superfície: `grep -n 'this.handle(' server/src/*.ts` (54 no `WorldRoom`, 5 no `LobbyRoom`).
2. Handler novo usa `this.handle`, nunca `this.onMessage`: só `handle` aplica o limite de 40 mensagens por segundo por cliente (`server/src/GameRoom.ts`).
3. Copie o rigor do vizinho mais parecido. Bons modelos: `idx()` em `registerItemMessages` e `marketSell`. O `buy` só é seguro por acaso (`def?.buy` é indefinido para chaves de protótipo) e deve usar o mesmo cuidado da R1.

## Regras e evidência

**R1. Chave vinda do cliente não indexa objeto simples.**
`CHARS`, `ITEMS`, `MONSTERS`, `COSMETIC` e `QUEST_BY_ID` são objetos comuns, então `CHARS["constructor"]` é verdadeiro.
- `create` com `charId` igual a `constructor`, `__proto__`, `toString` ou `hasOwnProperty` cria o personagem (`LobbyRoom`, `if (!CHARS[m?.charId])`). Entrar no mundo com ele falha com `Cannot read properties of undefined`; o servidor segue vivo.
- `shopBuy` com essas chaves lança `NOT NULL constraint failed: wallets.crystals`.
- `questAccept` com `constructor` aceita a missão "Object" e grava `{"undefined":0}` em `quests.active`.
- Faça: `typeof chave === "string" && Object.hasOwn(TABELA, chave)` antes de indexar, ou use `Map`.

**R2. Números e índices.** `Number.isInteger` e limites antes de usar. Valor de tipo errado gravado em campo do Schema já derrubou todos os jogadores da sala (comentário em `step`): valide o tipo antes de tocar no estado sincronizado.

**R3. Rotas de debug nascem desligadas.**
`DEV_MODE` (`WorldRoom.ts`) liga sempre que `NODE_ENV` não é `production`. Provado com o servidor iniciado sem `NODE_ENV`, como o `npm start` o inicia: ele responde à mensagem `dev` para qualquer jogador logado ("Dev: nível 300", "+1.000.000 kan"); com `NODE_ENV=production` o handler não existe. O `Dockerfile` define `production`, mas o README manda `npm run build && npm start` fora do Docker. Mitigação imediata: `NODE_ENV=production npm start` (ou `BI_DEV=0`).
- Faça: ligar só com `BI_DEV=1` explícito. `server/scripts/dev.ts` e `endgame.ts` usam `dev`, então `server/scripts/test.ts` precisa exportar `BI_DEV=1`. `BI_DEBUG` também deve exigir `=== "1"`: hoje qualquer valor não vazio liga, inclusive `0`.

**R4. Limite de tentativas por IP.**
`LobbyRoom.onAuth` lê `req.socket.remoteAddress` e `auth.ts` só guarda o contador por chave. Provado que o balde por IP é compartilhado: depois de 30 falhas de logins diferentes, o pedido seguinte, de outra pessoa criando conta, recebeu 429; `register` também consome o mesmo balde. Não verificado com o Caddy: o `reverse_proxy` do Caddy 2 envia `X-Forwarded-For` por padrão (documentação do Caddy), e o jogo ignora esse cabeçalho, então atrás dele todos devem chegar com o IP do proxy.
- Faça: ler `X-Forwarded-For` só quando a conexão vier do proxy confiável. Nunca confie nesse cabeçalho vindo direto da internet.

**R5. Cliente (DOM).**
- Valor dinâmico em `innerHTML` só se vier do catálogo de `shared/` ou passar por `escHtml`. Texto de jogador (nome, chat, guilda) vai em `textContent`.
- Em 31/10/2026 há 39 usos de `innerHTML`; nomes de jogador, guilda e ranking passam por `escHtml`, e chat e mercado usam `textContent`. `escHtml` (`client/src/main.ts`) escapa `& < > "` e não `'`: não use em atributo com aspas simples.
- A sessão de 30 dias fica em `localStorage["bi.token"]`: uma falha de XSS rouba a conta. O servidor guarda só o hash do token.
- Não há CSP nem cabeçalhos de segurança em `http.ts`, `index.html` ou `deploy/Caddyfile`.

**R6. Segredos.** Nunca em código, log, commit ou texto de PR. Rode `gitleaks git --redact -c .gitleaks.toml .` antes do PR. Os 5 achados de 31/10/2026 eram uma senha fictícia de teste em `server/test/e2e-lobby-and-world.test.ts`, hoje na allowlist. Senha usa scrypt com `timingSafeEqual` (`auth.ts`); mantenha. Não registre `password`, `token` nem `ticket` em log.

**R7. Dependências.** `npm audit --omit=dev` em 31/10/2026: 3 achados (1 alto em `nanoid`, 2 moderados em `@colyseus/core` e `@colyseus/ws-transport`), todos ligados ao Colyseus 0.15; a correção é um upgrade maior (0.18). O alto (GHSA-xwg4-73v4-xw9w) só é explorável quando o chamador passa à `nanoid` um tamanho de 2^31 ou mais vindo do usuário; nos pontos verificados (31/10/2026), o Colyseus chama com o tamanho padrão. Não rode `npm audit fix --force`: planeje o upgrade em PR próprio com a bateria de cenários. Dependência nova só quando o marco atual exige, com versão exata no lockfile.

**R8. Economia atômica e sem duplicação.**
- Mova dinheiro, itens e cristais numa operação só (modelos: `db.changeCrystals` com `BEGIN IMMEDIATE`; `market.remove()` devolve boolean e barra compra dupla).
- A recompensa de cristais trava por personagem e paga na carteira da conta. Provado com a diária: dois personagens da mesma conta, saldo 5 depois 10; o limite é 5 personagens por conta. Conquistas pagam do mesmo jeito (lido no código, não executado). Decisão D-001 (31/10/2026, `docs/roadmap.md`): a trava fica por personagem. Recompensa nova segue essa regra, e o balanceamento conta com até 5 personagens por conta.

**R9. Erro não vira mentira.** `db.createAccount` e `db.createChar` devolvem falha para qualquer exceção, e o chamador responde "login já existe" ou "nome em uso". Um erro de disco apareceria assim. Capture só o erro esperado (UNIQUE) e deixe o resto subir.

## Como relatar
Para cada regra R1 a R9, diga ENCONTRADO (arquivo:linha, risco em uma frase, correção) ou LIMPO (o que você leu ou executou). Severidade: BLOQUEIA (dá poder ou dinheiro ao jogador, ou derruba o servidor), ALTA, MÉDIA, BAIXA. Não escreva "seguro" sem ter lido ou executado o caminho.

## Ao corrigir
Escreva primeiro um teste que falha com a entrada maliciosa (`server/test/`, com `startTestServer`), veja-o falhar pelo motivo certo, corrija, e rode `npm run typecheck`, `npm test` e os cenários afetados (skill `testes-deterministicos`).
