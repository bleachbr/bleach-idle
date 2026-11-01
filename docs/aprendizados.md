# Aprendizados Técnicos do Projeto (Bleach Idle)

Este documento reúne lições práticas, decisões arquiteturais e armadilhas superadas ao longo da construção do **Bleach Idle**. O objetivo é preservar o conhecimento acumulado e evitar que futuras sessões ou agentes repitam erros já solucionados.

---

## 1. Arquitetura de Servidor Autoritativo e Tick de 100 ms

### Lição: O Cliente Nunca Deve Decidir o Estado
- Em jogos de visão de cima em tempo real, qualquer concessão de autoridade ao cliente (como cálculo de colisão, cooldown ou dano) abre brechas e gera desincronias graves (rubberbanding).
- **Abordagem adotada:** O cliente emite intenções leves (`move`, `step`, `target`, `skill`, `useItem`, `transform`). O servidor avalia se o personagem pode agir no tick atual (`trySkill`, `hit`, `stepTo` em `WorldRoom.ts`), aplica custos e dispara eventos de feedback (mensagens `fx` e `log`, além do estado sincronizado do Colyseus).

### Movimento Fluido Sem "Anda e Trava"
- Com ticks de 100 ms, se o cliente apenas teleportar o personagem a cada atualização do servidor, o movimento fica travado e desagradável.
- **Solução:** O cliente realiza interpolação suave (glide) baseada na velocidade do personagem e na direção do passo, combinada com animações de caminhada sincronizadas com o `stepMs` da forma atual. Ao ficar parado, o personagem reproduz uma respiração suave em vez de congelar.

---

## 2. Caçada Offline e Persistência Resiliente

### Desacoplamento da Conexão e Entidade do Mundo
- O jogador com **Auto Hunt** ou **Auto Treino** ativado não é removido do mundo quando fecha o navegador.
- O objeto `Player` permanece ativo no `WorldRoom` como um bot autônomo por até 12 horas.
- Ao reconectar, a nova sessão reassume a entidade existente sem duplicar estado ou reiniciar contadores.

### Persistência com SQLite WAL e Transações Periódicas
- Fazer `UPDATE` no banco a cada golpe ou item recebido gera contenção extrema de I/O em disco, mesmo com poucos jogadores.
- **Solução:** O estado vive em memória RAM durante o jogo. Um save transacional em lote é executado a cada 10 segundos, além de saves pontuais em momentos críticos (login, logout, morte).
- O banco usa o modo **WAL** (`PRAGMA journal_mode = WAL`). As conexões `node:sqlite` são síncronas e rodam na mesma thread; o ganho do WAL aqui não foi medido.
- Corpos no chão com loot derrubado e sacolas são gravados junto com o resto a cada 10 s (`db.setMeta("bags", ...)`, na tabela `meta`) e recarregados em `restoreWorld`, então sobrevivem a uma queda ou reinício forçado do servidor.

---

## 3. Testes Automatizados e Eliminação de Flakiness no CI

### A Armadilha dos Delays Arbitrários (`sleep(300)`)
- Em testes locais, aguardar `sleep(300ms)` parecia suficiente para uma animação ou Bankai terminar. No entanto, no runner do GitHub Actions (onde recursos de CPU são compartilhados e instáveis), esse tempo frequentemente estourava, tornando o CI instável.
- **Regra de ouro aprendida:** **Nunca use `sleep` com tempo fixo em testes assíncronos**. Sempre implemente espera ativa baseada em predicado (ex.: esperar o atributo `p.form === 1` mudar ou o evento de confirmação chegar com timeout máximo seguro de 5 segundos).

### Personagens de Teste Devem ser Adequados ao Ambiente
- Durante a implementação de testes de missões, um bot de teste chamado "Ana" falhava intermitentemente porque nascia no nível 8 e morria para Hollows agressivos antes de conseguir cumprir a contagem da missão.
- **Solução:** Cenários de teste automatizados que validam progressão ou entrega de missões devem instanciar o bot com nível e equipamento suficientes para sobreviver à área do teste (ex.: nível 25 com poções).

---

## 4. Automação Inteligente (Auto Helper) e Pathfinding

### Timeout de Perseguição no Pathfinding (busca em largura)
- Se um monstro visível estivesse atrás de uma barreira sólida ou sem rota navegável até ele, o Auto Hunt entrava em loop tentando recalcular a rota a cada ciclo, paralisando a caçada.
- **Solução:** Implementação de um timer de desistência (`p.stuckSince`, em `WorldRoom.ts`). Se não existe caminho até o alvo por mais de 3 segundos, o monstro é ignorado por 20 segundos (`skipId` e `skipUntil`) e o Auto Hunt seleciona o próximo alvo disponível.

### Escolha de Alvo
Ordem real em `updatePlayer` (`WorldRoom.ts`), para o Auto Target e o Auto Hunt:
1. Revidar quem atacou nos últimos 5 segundos (inclusive caçando offline).
2. Com Auto Hunt, durante uma invasão, o invasor mais próximo.
3. Com Auto Hunt, o monstro mais próximo das missões de caça ativas.
4. O mais próximo (`nearestMonster`, distância de Chebyshev), no raio de caça do Auto Hunt ou no de visão do Auto Target. Ignora bonecos de treino, monstros de outro jogador e o alvo que o Auto Helper acabou de abandonar (`skipId` e `skipUntil`).

Não existe escolha por "rota navegável": o caminho é calculado depois de escolhido o alvo, e é por isso que o timer de desistência acima é necessário.

---

## 5. Spritesheets, Escalas e Ciclos de Animação

### Detecção Dinâmica de Colunas (4 vs 8 Quadros)
- O projeto começou com sprites de 4 colunas de caminhada. Mais tarde, foi gerada uma nova leva de sprites em alta fidelidade com 8 colunas (`art/walk8.py`).
- Em vez de reescrever todo o código para forçar 8 colunas, criamos a função `spriteCols(key)` que inspeciona a folha. O jogo calcula frames de repouso e de movimento automaticamente de acordo com as dimensões de cada asset.

### Evitando Encolhimento de Sprite ao Virar de Costas ou Lado
- Sprites assimétricos sofriam leve encolhimento ou distorção de escala quando o Phaser aplicava `flipX` com origens não centralizadas na base dos pés.
- **Solução:** Padronização da origem dos sprites em `(0.5, 1.0)` (centro horizontal, base dos pés) e profundidade de desenho vinculada à coordenada `y` do chão (`setDepth(y)`), garantindo ordenação perfeita de profundidade (Z-indexing) entre jogadores, monstros e árvores.

---

## 6. Compartilhamento Total de Lógica (`shared/`)

- Ao colocar as definições dos mapas, fórmulas matemáticas de atributos (ataque, defesa, HP, reiatsu), dados de evolução e itens em `shared/`, eliminamos qualquer possibilidade de divergência entre a lógica simulada no servidor e a interface desenhada no cliente.
- A função `parseMap` lê o mesmo JSON exportado pelo Tiled tanto no servidor Node quanto no navegador, garantindo que o mapa colidível seja idêntico ao mapa visual.

---

## 7. Segurança de Servidor e Tratamento de Mensagens de Rede

### Mensagens sem Handler no Colyseus
- No Colyseus (`@colyseus/core`), quando o cliente envia uma mensagem cujo tipo não tem handler registrado via `this.handle()`, o servidor fecha a conexão do cliente com `WS_CLOSE_WITH_ERROR` (código `4002`).
- Se o cliente envia uma mensagem automaticamente ao inicializar (como `devHello` no `main.ts`), o handler dessa mensagem precisa ser registrado incondicionalmente no servidor, mesmo que a resposta correspondente (ex.: `devMode`) só seja enviada se a flag de desenvolvimento estiver ligada (`BI_DEV=1`). Desregistrar o handler derruba qualquer cliente real em produção.

### Protótipos de Objetos e Ataques de DoS via Tipos de Mensagem
- O Colyseus armazena handlers em `this.onMessageHandlers[tipo]`.
- Quando um cliente enviava uma mensagem com tipo `"__proto__"` (ou `"__defineGetter__"`, etc.), o acesso `onMessageHandlers["__proto__"]` resolvia para `Object.prototype`, que é um objeto truthy, mas não uma função chamável. Ao tentar executar `handler(client, message)`, o Node disparava `TypeError: ... is not a function` fora de qualquer bloco `try/catch`, encerrando o processo do servidor.
- **Solução:** No construtor de `GameRoom`, anular o protótipo da tabela de handlers: `Object.setPrototypeOf(this.onMessageHandlers, null)`. Sem protótipo, apenas os tipos explicitamente registrados existem como propriedades.

### Chaves de Dados Vindas da Rede
- Usar `CHARS[chave]` ou `chave in objeto` em objetos JavaScript comuns acessa chaves herdadas do protótipo (`constructor`, `__proto__`, `toString`, etc.). Isso permitia, por exemplo, criar personagens com `charId: "constructor"`.
- **Solução:** Funções auxiliares `own(tabela, chave)` e `isOwnKey(objeto, chave)` em `shared/src/lookup.ts` que validam o tipo como string e utilizam `Object.hasOwn()`.

### Coerção Segura de Tipos em Handlers
- Fazer `String(m?.x)` é perigoso quando o payload enviado pelo cliente contém `{ x: Object.create(null) }`, pois objetos sem protótipo disparam `TypeError: Cannot convert object to primitive value` ao serem convertidos com `String()`.
- **Solução:** Checar explicitamente `typeof m?.x === "string" ? m.x : ""` em vez de converter diretamente.

### Identificação de IP Atrás de Proxy Reverso
- Tentar inferir "endereço privado" para confiar em `X-Forwarded-For` é falho em redes NAT, CGNAT (`100.64.0.0/10`) e em contêineres Docker bridge.
- **Solução:** Uso explícito de `net.BlockList` com os CIDRs dos proxies confiáveis configurados pelo operador via `TRUST_PROXY` (ex.: `172.28.0.0/24` no Docker Compose). Conexões vindas de fora da lista nunca têm seu cabeçalho `X-Forwarded-For` considerado, impedindo IP spoofing.

### Tratamento Seletivo de Erros `UNIQUE` no `node:sqlite` (`F-04`)
- Capturar qualquer exceção com `catch { return null; }` em `createAccount` e `createChar` mascarava falhas graves de banco (`NOT NULL`, `FOREIGN KEY`, disco cheio ou `SQLITE_BUSY`) como se fossem simples colisões de nome ("login já existe" / "nome em uso").
- No `node:sqlite`, violações de unicidade expõem `errcode` estendido numérico: `2067` (`SQLITE_CONSTRAINT_UNIQUE`, ex.: `accounts.login`) e `1555` (`SQLITE_CONSTRAINT_PRIMARYKEY`, ex.: `players.id`), ambos com mensagem iniciada por `"UNIQUE constraint failed:"`.
- **Solução:** Função dedicada `isUniqueConstraintError(err)` em `server/src/db.ts` que retorna `null`/`false` apenas para essas duas restrições e relança qualquer outro erro.

### Separação de Baldes entre Login Falho (`ip:`) e Criação de Conta (`reg:`) por IP (`F-14`)
- Compartilhar o mesmo contador `ip:` (30 tentativas / 1 min) entre senhas erradas e criação de contas (`register`) permitia criar até 30 contas por minuto pelo mesmo IP e fazia com que cadastros bloqueassem logins de contas existentes na mesma rede (e vice-versa).
- **Solução:** Balde próprio `reg:<ip>` com janela de 1 hora (`3_600_000 ms`) e limite configurável via `REGISTER_MAX_IP` (padrão `5`), verificado em `LobbyRoom.onAuth` antes do `hashPassword` (poupando CPU de `scrypt` sob abuso) e com relógio injetável (`now`) para testes determinísticos.

### Ordem de `chown`, `VOLUME /data` e `USER node` no `Dockerfile` (`F-05`)
- Em imagens Docker multi-stage, a diretiva `VOLUME /data` congela metadados e permissões do diretório no instante em que é declarada. Qualquer `RUN chown` sobre `/data` colocado **depois** de `VOLUME /data` é silenciosamente ignorado pelo builder, fazendo volumes nomeados novos nascerem como `root:root` e quebrarem a escrita do SQLite sob `USER node`.
- Além disso, executar `chown -R node:node /app` num `RUN` separado após `COPY` duplica todas as camadas copiadas (incluindo `node_modules`) no OverlayFS.
- **Solução:** Usar `COPY --chown=node:node --from=build ...` no estágio final, seguido de `RUN mkdir -p /data/backups && chown -R node:node /data && chown node:node /app` **antes** de `VOLUME /data` e `USER node`.

### Cabeçalhos CSP e `X-Content-Type-Options: nosniff` com Assets `.webp`/`.jpg` (`F-06`)
- Ao ativar `X-Content-Type-Options: nosniff` em `deploy/Caddyfile` e `server/src/http.ts`, qualquer extensão ausente no mapa `TYPES` do servidor HTTP nativo cai em `application/octet-stream`, fazendo navegadores estritos recusarem imagens com MIME incompatível.
- Como o cliente usa `login_bg.jpg` e sprites/tiles HD em `.webp`, além de texturas `blob:`/`data:` geradas pelo Phaser 3, adicionamos `.jpg`/`.jpeg` (`image/jpeg`) e `.webp` (`image/webp`) em `TYPES` e configuramos `Content-Security-Policy` restritiva (`script-src 'self'; object-src 'none'; frame-ancestors 'none'`) permitindo `img-src`/`media-src` `'self' data: blob:` e `connect-src 'self' ws: wss:`.

### Endurecimento do CI: Actions v7 por SHA, `ubuntu-24.04`, Matriz Node 22/24 e Gitleaks por SHA-256 (`F-11`)
- Em vez de usar actions de terceiros para o Gitleaks (que ampliam a superfície de supply-chain), o job `gitleaks` em `.github/workflows/ci.yml` baixa diretamente o tarball oficial `gitleaks_8.30.1_linux_x64.tar.gz`, valida o hash SHA-256 (`551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`) via `sha256sum -c` e executa `gitleaks git --redact -c .gitleaks.toml .` sobre `fetch-depth: 0`.
- O runner foi fixado em `ubuntu-24.04`, `actions/checkout` (`v7.0.1`) e `actions/setup-node` (`v7.1.0`) foram atualizadas com SHA de 40 caracteres e o job `test` passou a rodar em matriz `["22.x", "24.x"]` (cobrindo tanto o ambiente de dev quanto a versão do `Dockerfile`).

### Curva de Progressão e Balanceamento entre Hueco Mundo, Las Noches, Karakura Falsa e Wandenreich (`F-15`)
- Quando `falsa` (nível 60+) e `wandenreich` (nível 95+) foram adicionados após `lasnoches` (nível 45+), os monstros de Las Noches (`arrancar_numeros`, `exequias`, `fraccion`) permaneceram com atributos de fim de jogo (`hp: 2300..4300, atk: 60..78, def: 17..24`), superiores aos da Karakura Falsa (`fraccion_espada` com `hp: 2600, atk: 56, def: 18`), além de `balance.ts` ignorar o `minLevel` dos mapas em `TRAVEL` e parar no nível 60.
- Isso fazia a curva ótima de caça pular completamente `arrancar` (em Hueco Mundo) e todos os monstros de Las Noches (`exequias`, `fraccion`).
- **Solução:** Recalibramos `adjuchas`, `arrancar`, `arrancar_numeros`, `exequias`, `fraccion` e `privaron` em `shared/src/data.ts` para formar uma escada estritamente crescente em `hp`, `atk`, `def`, `exp` e `exp/hp` do nível 25 ao 150, atualizamos `server/scripts/balance.ts` para respeitar `MAP_MIN_LEVEL` até o nível 150 e blindamos a curva com `server/test/balance-progression.test.ts`.

---

## 8. Jogador-IA (Cradle) e Correções de UX/Motor (`F-16`)

### Fallback SPA do Vite e Sprites sem Versão HD (`hd:boneco`)
- Em servidores SPA (como o Vite em desenvolvimento), requisições para arquivos inexistentes (ex.: `/assets/sprites_hd/boneco.webp`) retornam `200 OK` com o HTML do `index.html` em vez de `404`. O carregador de spritesheets do Phaser tenta decodificar o HTML como imagem e emite erro no console (`Failed to process file: ... spritesheet hd:boneco`).
- **Solução:** Adicionada a flag `noHd?: boolean` em `SpriteDef` (`shared/src/data.ts`), ignorada pelo `setHd` do `GameScene.ts` e validada por teste automatizado em `shared/test/items.test.ts` (que garante que todo `SPRITES` sem `noHd` possui arquivo `.webp` físico em `client/public/assets/sprites_hd`).

### Alvo Manual (`Tab` / `nextTarget`) vs. Bonecos de Treino (`dummy`)
- Enquanto `nearestMonster` (usado pelo Auto Alvo) filtrava monstros com `MONSTERS[m.kind].dummy`, o handler `nextTarget` (tecla `Tab`) selecionava qualquer monstro vivo no alcance `VIEW`, fazendo jogadores na base da Soul Society travarem o foco nos bonecos de treino em vez dos Hollows reais.
- **Solução:** Filtrar `!MONSTERS[mo.kind]?.dummy` também em `nextTarget` (`server/src/WorldRoom.ts`), mantendo o ataque ao boneco exclusivo para clique direto ou Auto Treino.

### Sobreposição de Janelas Flutuantes (`z-index: 15`) e Tecla `Escape`
- As janelas `#ranking`, `#book`, `#pass`, `#dev`, `#shop` e `#modal` compartilhavam a mesma região da tela (`top: 22px`, `z-index: 15`). Abrir uma sem fechar as anteriores empilhava painéis e bloqueava cliques nos botões de fechar (`✕`) das janelas de baixo; além disso, a tecla `Escape` fechava apenas `#modal`.
- **Solução:** Função central `closeWindows(keep?)` em `client/src/main.ts` que fecha todas as janelas flutuantes concorrentes ao abrir uma nova, alternância (toggle) ao clicar novamente no mesmo botão do topo e fechamento unificado no `Escape`.

### Corrida no Registro de `onMessage` do Colyseus (`welcome` e `fx`)
- `WorldRoom.onJoin` envia `welcome` imediatamente ao conectar e transmite `fx` a cada tick de combate, enquanto `GameScene.create()` só registra seus listeners depois que `GameScene.preload()` termina de baixar os sprites e mapas.
- **Solução:** Registrar listeners iniciais de `welcome` e `fx` imediatamente após `client.joinOrCreate("world")` em `client/src/main.ts` antes do carregamento assíncrono do Phaser.

---

## 9. Telemetria do Tick (`F-08`) e Ranking Incremental (`F-09`)

### Telemetria do Tick sem Alocação (`F-08`)
- Para medir o tick de `100 ms` sem introduzir pressão de Garbage Collector no próprio loop de simulação, `server/src/tickStats.ts` grava as últimas 100 amostras (10 s) num `Float64Array` estático em anel e só ordena a janela quando `/healthz` consulta `getTickStats()`.
- Quando um tick ultrapassa `50 ms` (`WARN_TICK_MS`), `recordTick` incrementa `slowTicks` e emite aviso no console com intervalo mínimo de 5 s (`WARN_COOLDOWN_MS`) para evitar tempestade de logs sob pico contínuo.

### Ranking Incremental sem Bloquear o Tick (`F-09`)
- A reconstrução anterior do ranking chamava `db.allChars()`, lendo do SQLite e fazendo `JSON.parse()` do `SaveData` completo (3,7 KB) + `powerOf()` de todos os personagens a cada 15 s (`p50 = 10,29 ms`, `máx = 27,82 ms` para 1.000 personagens).
- Como personagens offline só mudam quando passam por `db.createChar`, `db.save`, `db.saveMany` ou `db.deleteChar`, extraímos `server/src/ranking.ts`: ele semeia o mapa `savedEntries` uma única vez (`ensureSeeded`), recebe atualizações O(1) via `db.onCharWrite` e sobrepõe apenas os jogadores ativos em `state.players`.
- **Resultado medido (`bench.mts 1000`):** `buildRanking()` caiu de `p50 = 10,29 ms` para **`p50 = 0,10 ms`** (`p95 = 0,20 ms`, `máx = 0,45 ms`), uma redução de **100x** no tempo de CPU síncrono.

### Telemetria Operacional Consolidada (`/metrics` e `saveStats` — `W-09`)
- Além da duração do tick (`tickStats.ts`), o loop de evento do processo único depende do tempo síncrono de gravação em lote no SQLite (`saveAll`).
- Extraímos `server/src/metrics.ts`, que mede cada `saveAll` (`saves`, `savedChars`, `slowSaves`, `lastMs`, `maxMs`), registra o snapshot em tempo real da sala (`players: { online, offlineHunt, totalInWorld }` e `entities: { monsters, bags }`) e calcula o estado de alerta mínimo (`alert: true`, `alerts: ["tick_lento" | "save_lento"]` quando o tick ou o save ultrapassam `50 ms`), exposto em `GET /metrics` e `GET /healthz`.

## 16. Marcos Históricos de Servidor com Cache O(1) e Persistência em `meta` (W-06)

- **Contexto:** Feitos únicos do servidor ("Primeiro Bankai", "Primeiro Capitão", "Primeiro Renascido", "Pioneiro do Dangai", "Campeão da Arena", "Regicida Quincy") precisam ser verificados em eventos frequentes (`setForm`, `gainExp`, `rebirth`, `dangaiKilled`, `pvpHit`, `bestiaryKill`) sem consultar o SQLite a cada abate ou nível, mas garantindo persistência imediata quando conquistados pela primeira vez.
- **Solução (`server/src/milestones.ts`):**
  1. As definições canônicas (`SERVER_MILESTONES`) residem em `shared/src/progress.ts` e seus títulos exclusivos (`season: true`) em `shared/src/shop.ts`.
  2. O módulo `server/src/milestones.ts` carrega `db.getMeta("server_milestones")` uma única vez para um `Map` em memória; chamadas subsequentes a `claimServerMilestone` verificam `claimed.has(id)` em O(1) e só gravam no SQLite (`db.setMeta`) na primeira conquista de cada marco.
  3. O título conquistado é salvo tanto em `p.prog.titles` (no save do personagem) quanto na carteira da conta (`db.changeCrystals(p.accountId, 0, ...)`), equipado automaticamente caso o personagem esteja sem título, anunciado globalmente e listado na aba **Marcos** do Ranking (`#ranking`).

## 17. Rotação Semanal Determinística de Crônicas Sem Depender de `TZ` (M1-01 e M1-05)

- **Contexto:** Funções de data do JavaScript (`getDay`, `setHours`, `getFullYear`) usam o fuso horário (`TZ`) do processo, fazendo a semana virar em instantes diferentes no Linux em UTC vs máquinas locais em `America/Sao_Paulo` ou `Asia/Tokyo`.
- **Solução (`shared/src/chronicles.ts`):**
  1. `weekNumber(now)` deriva a semana exclusivamente por aritmética inteira sobre o timestamp UTC relativo à âncora `CHRONICLE_EPOCH = Date.UTC(2026, 9, 26, 3, 0, 0)` (segunda-feira 00:00 BRT), garantindo que `weekNumber`, `weekIndex` e `currentWeekKey` virem no exato mesmo milissegundo em qualquer `TZ`.
  2. `syncChronicleProgress(prog, now)` (M1-05) compara `prog.chronicle?.activeWeekKey` com `currentWeekKey(now)` e reinicia `{ activeWeekKey, questKills: 0 }` (removendo `completedAt`) de forma preguiçosa ao interagir/salvar, sem precisar de cron jobs ou varreduras em lote no SQLite.
  3. O catálogo `CHRONICLES` (`M1-08`) referencia exclusivamente IDs canônicos já existentes em `MONSTERS`, `ITEMS` e `COSMETICS` (validados por teste determinístico de integridade cruzada em `shared/test/chronicles.test.ts`), evitando IDs órfãos de monstros ou itens.

## 18. Eliminação de Ruído `onMessage() not registered` no Colyseus Client em Testes E2E (F-10 / Q3)

- **Causa raiz:** `LobbyRoom.onJoin` e `WorldRoom.onJoin` enviam mensagens imediatamente na conexão (`account`, `chars`, `welcome`, `inv`, `quests`, `tutorial`, `guild`, `dailyReady`, `season`). Se os handlers forem registrados somente depois do `await client.join(...)`, os frames iniciais já chegaram no WebSocket e o `colyseus.js` imprime `console.warn("colyseus.js: onMessage() not registered for type ...")`.
- **Solução (`server/test/helpers/testServer.ts`):** Interceptamos `Client.prototype.createRoom` no helper de testes para registrar handlers `noop` em `KNOWN_ROOM_MESSAGES` no exato momento em que a instância de `Room` é criada (antes de abrir o WebSocket), e atualizamos `once(room, type)` para desregistrar seu callback ao resolver. Como `room.onMessageHandlers` é um `EventEmitter`, os listeners específicos de cada teste continuam recebendo todas as mensagens normalmente e a suíte Vitest roda com zero avisos espúrios.


## 19. Moderação de chat com filtro anti-spam híbrido e silêncio persistente (M3-05)

- **Problema:** O chat global e os canais `/pm`, `/p` e `/g` não possuíam proteção contra flood de mensagens, repetição da mesma frase nem silenciamento administrativo que sobrevivesse a reconexões.
- **Solução (`server/src/moderation.ts`):** Extraímos o motor de moderação para um módulo dedicado com janela deslizante em memória (`5` mensagens em `5 s`), bloqueio de mensagem repetida consecutiva em `10 s` e auto-silêncio de `30 s` quando o jogador acumula 3 infrações seguidas. Já os silêncios administrativos (`/silenciar <nome> [min] [motivo]`) são persistidos em `meta` (`chat_mutes`) via `db.setMeta`, sobrevivendo a reinícios do servidor e reconexões do jogador.

## 20. Rate limit persistente em SQLite e token assinado de uso único para recuperação de senha (M5-01 e M5-02)

- **Problema:** Contadores de brute-force (`auth.ts`) ficavam apenas em memória e zeravam a cada reinício do processo; além disso, não havia mecanismo de recuperação de senha assinado e de uso único.
- **Solução (`server/src/db.ts`, `server/src/auth.ts`, `server/src/LobbyRoom.ts`):** Movemos o armazenamento de `fail()`, `blocked()` e `clearFails()` para a tabela `auth_limits` do SQLite via prepared statements síncronos em modo WAL. Para a recuperação de senha (`M5-01`), combinamos assinatura HMAC-SHA256 (`timingSafeEqual`) no formato `<accountId>.<exp>.<nonce>.<sig>` com consumo atômico de `sha256(nonce)` na tabela `password_resets` (expiração de 15 min) e revogação automática de todas as sessões anteriores da conta.

## 21. Motor de status e controle de grupo por tick no servidor (M2-01 a M2-05)

- **Problema:** Todas as habilidades de personagens aplicavam apenas dano instantâneo, sem suporte a congelamento (`freeze`), lentidão (`slow`), sangramento/queimadura (`dot`) ou atordoamento (`stun`).
- **Solução (`shared/src/combatStatus.ts`, `shared/src/data.ts`, `server/src/WorldRoom.ts`):** Extraímos o motor puro de status para `shared/src/combatStatus.ts` (`applyStatus`, `tickStatuses`, `canEntityMove`, `canEntityAct`, `effectiveStepMs`, `formatStatusFlags`), sincronizamos `statusFlags` no Schema (`Player` e `Monster`) para consumo pela camada visual (`M2-06`) e integramos a avaliação por tick (`100 ms`) no `WorldRoom.ts` respeitando zonas de proteção (PZ) e o boneco de treino (`dummy`).
