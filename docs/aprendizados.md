# Aprendizados Técnicos do Projeto (Bleach Idle)

Este documento reúne lições práticas, decisões arquiteturais e armadilhas superadas ao longo da construção do **Bleach Idle**. O objetivo é preservar o conhecimento acumulado e evitar que futuras sessões ou agentes repitam erros já solucionados.

---

## Novidades vinculadas à versão servida (F-18)

Um push na `main` não comprova que o deploy terminou. `/release` entrega as
notas da própria imagem em execução e os metadados públicos injetados pelo
`deploy.sh`: SHA da imagem e horário UTC imediatamente anterior à recriação
do container. A interface identifica esse horário como início da atualização,
não como término do healthcheck. Sem esses metadados, não inventa data local.

As notas são editoriais em `shared/src/releases.ts`, da mais recente para a
mais antiga, com ID estável por entrada. Novas entregas com mudanças visíveis
ao jogador acrescentam uma entrada; commits não viram notas automaticamente.
Um novo deploy atualiza a data/versão, mas só notas novas acionam o indicador.
A leitura fica por navegador em `bi.releaseSeen`, independente da conta.

O endpoint usa `no-store` e fica fora do service worker para não apresentar
metadados antigos como atuais quando a rede falhar. O modal nativo contém o
foco e fecha por Escape; o listener em captura impede que teclas do modal
acionem técnicas no jogo. Não é necessário mudar CSP nem instalar dependências.

## Repositório público, rulesets e revisores automáticos (F-07)

Ao tornar o repositório público, a API passou a permitir ruleset ativo: PR obrigatório, uma aprovação descartada com novos commits, aprovação do último push por outra conta, conversas resolvidas e checks vinculados ao app GitHub Actions. Os nomes dos checks devem refletir o workflow atual (`gitleaks`, `test (22.x)`, `test (24.x)`); exigir o antigo `test` deixaria a nova matriz sem satisfazer a regra. O ruleset não tem bypass, inclusive para administradores.

Administrador de repositório não é necessariamente owner da organização; a instalação inicial do app exigiu acesso do owner. CodeRabbit já publicou review e check reais no repositório. Pela decisão D-004, a aprovação automática vale também para CI, deploy e segurança, após revisão completa do HEAD atual e resolução dos bloqueios, sem atalhos de aprovação. `max_merge_risk: low` exige avaliação atual: risco material deve ser corrigido, não aprovado à força. CODEOWNERS serve para indicar responsáveis; a exigência de aprovação humana foi desativada, mantendo uma aprovação obrigatória do último push por outro ator e os checks do GitHub Actions e do app CodeRabbit. Aprovação do bot não faz merge. Aprovação no chat não substitui `APPROVED` registrado no GitHub. Conferir o estado efetivo do ruleset via API antes de mesclar: sessões paralelas podem alterar bypass e strict checks, e o arquivo local não garante o enforcement remoto.

Repositório público aumenta a exposição de código e histórico, não libera segredos: secret scanning, push protection e alertas de dependências foram habilitados; workflows de forks externos passaram a exigir aprovação. `.env.*` também precisa ser ignorado e excluído do contexto Docker. Gitleaks limpo reduz risco, mas não substitui rotação de qualquer segredo que já tenha sido exposto.

## Deploy em VPS compartilhada (F-13)

A inspeção somente leitura confirmou Nginx nas portas 80/443, Docker Compose e Certbot disponíveis. O Compose original com Caddy disputaria essas portas. A configuração específica para VPS deve publicar o jogo apenas em loopback e persistir SQLite em volume próprio. O workflow prepara a imagem no runner, evitando build concorrente com os outros sites na VPS, e só publica push da `main` depois dos testes. O arquivo Nginx é provisionado separadamente; não se altera o proxy compartilhado a cada release. A identidade SSH deve ser fixada, não descoberta cegamente durante o deploy. O provisionamento foi validado com HTTPS e handshake WebSocket; os 24 arquivos dos outros sites mantiveram os mesmos hashes. O fluxo completo pelo GitHub e a restauração de backup ainda precisam de validação. No Mac ARM, o build amd64 falhou no runtime Go do esbuild sob emulação; o build nativo na VPS passou, limitado a 1 CPU e 1,5 GB. Essa exceção inicial não muda o workflow: releases seguintes são construídas no runner amd64.

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

### Ruído e Esperas no Vitest (F-10)
- **O curinga do `colyseus.js` é reserva, não interceptador.** `Room.dispatchMessage` entrega ao listener do tipo; só sem ele cai no `onMessage("*")`; só sem os dois imprime `onMessage() not registered`. Por isso `quiet()` (registra `"*"` logo ao entrar) cala o aviso sem roubar a mensagem de um `once` registrado depois. Um comentário antigo de `e2e-seguranca.test.ts` dizia o contrário e obrigava a listar os tipos à mão (a lista já estava incompleta: `guild` e `welcome` escapavam).
- **O agente não vê o que a pessoa vê.** Sob agente de IA, o Vitest usa o reporter `minimal`, que esconde o console dos testes que passam; o aviso parecia ter sumido e não tinha. Antes de afirmar "a saída está limpa", rode `npx vitest run --reporter=default`.
- **Espera abaixo do `testTimeout`.** Com `vi.waitFor` de 5 s e `testTimeout` padrão de 5 s, a falha aparecia como "Test timed out" e o `waitFor` seguia consultando durante o teste seguinte. O `testTimeout` agora é 10 s.

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


## 22. Motor declarativo de chefes com fases (W-04)

- **Problema:** Os chefes de mapa e o Chefe Mundial mantinham ataque, defesa e velocidade constantes durante toda a luta, sem transições narrativas ou mecânicas ao perderem vida.
- **Solução (`shared/src/bossPhases.ts`, `server/src/schema.ts`, `server/src/WorldRoom.ts`):** Criamos o motor declarativo `BOSS_PHASES` + `evaluateBossPhase(kind, currentPhase, hp, maxHp)` que avalia limiares decrescentes de HP, suporta saltos de fase em golpes altos sem re-disparar fases anteriores, escala atributos sobre `basePower` e `def.stepMs` (sem acúmulo exponencial) e emite pulsos de controle de grupo (`aoeStatus`) nos jogadores ao redor.

## 23. Correio interno com retirada atômica (W-07)

- **Problema:** itens e kan só chegavam com o jogador online; anúncio expirado com depot cheio ficava preso no mercado.
- **Solução (`server/src/mailbox.ts`):** tabela `mailbox` própria; `take()` usa `DELETE` condicional e só entrega o anexo se apagou a linha, o que impede duplicação por retirada repetida. O `WorldRoom` valida espaço numa cópia do inventário antes de retirar. O mercado usa o correio como destino quando o depot está cheio.

## 24. Arena de duelos 1v1 ranqueada com Rating Elo e anti-cheat de velocidade (W-01)

- **Problema:** O PvP do jogo estava restrito ao mundo aberto com penalidades severas de perda de itens, EXP e marcação de assassino (`skullUntil`), o que impedia duelos competitivos justos, sem risco de perda de inventário e balanceados por poder/habilidade.
- **Solução (`shared/src/arena.ts`, `server/src/arenaManager.ts`, `server/src/WorldRoom.ts`):**
  1. **Fórmulas Puras e Rating Elo Determinístico:** Sistema Elo padrão ($K=32$) com base de 1000 pontos (`DEFAULT_ARENA_RATING`) e divisões competitivas (Bronze a Capitão) calculadas em módulo compartilhado coberto por testes unitários determinísticos.
  2. **Pareamento Dinâmico em Memória:** Fila em memória (`arenaManager.ts`) com expansão de tolerância a cada 10 s (`100 + 50 * floor(t / 10s)` até 500) para garantir partidas rápidas mesmo com densidade variável de jogadores.
  3. **Isolamento Total do PvP de Arena:** Duelos ocorrem na área reservada de Dangai com contagem regressiva de 3 s; durante a contagem, passos e técnicas são travados. O combate em arena não marca `skullUntil` nem `pvpUntil`. O golpe fatal é interceptado como nocaute (KO), curando ambos os duelistas a 100% de HP/Rei e teleportando-os de volta com segurança (sem perda de inventário ou EXP).
  4. **Anti-Cheat de Velocidade no Servidor:** Validação estrita autoritativa de intervalo entre passos (`validateStepInterval` contra `effectiveStepMs` com botas e status ativos) descartando tentativas de manipulação de velocidade ou teleporte pelo cliente.
---

## 8. Eventos Globais no Cliente sem Campo Novo no Schema

### Banner de Evento por Mensagem Pontual (R-12)
- O banner da invasão e do chefe mundial podia virar campo sincronizado no `WorldState`. Não virou: o schema não tem filtro, então todo campo novo vai a todos os clientes a cada patch (`pendencias.md`, P4), e um valor de tipo errado num campo sincronizado derruba a codificação do estado da sala inteira (comentário do handler `step` em `WorldRoom.ts`).
- **Solução:** o servidor manda `event` (`{ kind, phase, until, left }`) só quando a fase muda e guarda o último banner de cada tipo (`banners` em `WorldRoom.ts`). Quem entra no meio recebe os banners ainda válidos em `onJoin` (`sendBanners`). O cliente apaga o banner sozinho quando o prazo passa, sem mensagem de "fim".
- O prazo no cliente sai de `left` (ms que faltam) somado ao relógio do aparelho, e não de `until` com `serverNow()`: o banner de quem entra chega antes da resposta do `time` (`clock.ts`), e um aparelho adiantado apagaria o banner na hora.
- Os textos ficam em `shared/src/events.ts`, e o servidor manda só a fase. O cliente busca o texto com `own(EVENT_BANNER, fase)`: mesmo vindo do servidor, a chave chega pela rede.
- Os avisos de sistema com números (vida, XP, minutos) continuam iguais e a lore vai numa linha separada (canal `lore`), porque os cenários `invasion` e `temporada` conferem trechos desses avisos.

## 9. Arte com o Codex no Windows (R-01)

### Gerar sem bash
- Os scripts antigos de geração (`art/work/gen_*.sh`, só na máquina de quem gerou: `art/work/` fica fora do git) pedem bash, que o Windows deste projeto não tem. O `art/gen_r01.py` faz o mesmo em Python: `codex exec -s workspace-write -C art -i <referência>` com o prompt de `gen_walk8.sh` copiado nele, 9 em paralelo. As 45 imagens dos três personagens saíram na 1ª tentativa, cerca de 1 min cada.
- Rodar o gerador como processo em segundo plano da ferramenta do agente não funcionou (o processo sumia sem log). `Start-Process python -ArgumentList "-u","gen_r01.py" -RedirectStandardOutput ...` funcionou.

### A paleta compartilhada mexe em todas as folhas
- `process.py game` monta uma paleta de 64 cores com todas as folhas. Folha nova muda a paleta, e as ~70 folhas antigas saem com pixels diferentes (no Byakuya, metade dos pixels opacos), sem mudança que se veja.
- **Solução no R-01:** commitar só as folhas novas e voltar as antigas com `git checkout`. As novas ficam com a paleta desta rodada; a próxima pessoa que rodar `process.py` regenera tudo junto (pendência em `pendencias.md` §2).
- `hd.py` refaz todas as folhas HD e levou mais de 25 min. Para regerar só algumas, chame `hd.sheet_hd(*process.GAME_SPRITES[id], name=id)` para cada id (51 s para 6 folhas).
- `process.py` escala pela altura total do desenho: na célula de 48 px, `rel` acima de ~1,04 corta o topo (o chapéu de palha do Shunsui saiu cortado com 1,1). Confira a linha 0 de cada quadro antes de commitar.

## 24. Caçada Offline v2 com Relatório Estruturado e Persistência Unificada (W-05)

- **Problema:** Ao reconectar após caçada offline, o relatório não informava quais monstros foram abatidos, taxas de rendimento por hora nem separava perdas de mortes de ganhos líquidos; além disso, a lógica de snapshot e restauração ficava dispersa em `onLeave`, `restoreWorld` e `onJoin`.
- **Solução (`shared/src/offlineReport.ts`, `server/src/offlineState.ts`, `server/src/WorldRoom.ts`):** Extraímos o cálculo puro de rendimento para `buildOfflineReport`, limitando o tempo ao teto de 12 horas (`OFFLINE_MAX_MS`) e fornecendo `topKills`, `expPerHour`, `killsPerHour` e perdas detalhadas. Unificamos a captura de snapshot e restauração do save em `offlineState.ts`, salvando `offKinds` em `SaveData.offline` com compatibilidade retroativa para saves antigos.

## 25. Trilha imutável de auditoria econômica e anti-duplicação (W-08)

- **Problema:** Movimentações de alto valor de kan, cristais e itens (mercado entre jogadores, correio com anexos, forja do Kisuke, compras de loja e recompensas) não tinham registro histórico persistente. Em caso de relatos de itens sumidos, suspeita de duplicação ou desbalanceamento da economia por injeção excessiva de moeda, não existia uma trilha contábil para auditar o fluxo de bens.
- **Solução (`server/src/economyAudit.ts`, `server/src/WorldRoom.ts`):** Criamos a tabela append-only `economy_audit` no SQLite com prepared statements rápidos indexados por `char_id`, `currency` e `created_at`. Cada transação relevante registra `(accountId, charId, currency, delta, balanceAfter, reason, itemId, details, createdAt)`. O módulo oferece `recordAudit` para inserção atômica, `getAuditTrail(charId, limit)` para suporte ao jogador e `queryEconomyFlow(since, until)` para consolidação agregada de entradas e saídas de kan/cristais da economia.

## 26. Patrulhas idle de Hollows com cálculo determinístico e despacho assíncrono (W-13)

- **Problema:** A progressão offline dependia unicamente de deixar o personagem parado no mapa combatendo monstros em loop (Auto Hunt). Não havia como escolher setores temáticos, despachar expedições de vigília em intervalos de 1h a 12h ou receber bônus de cooperação de grupo de forma desacoplada de ticks ativos de combate.
- **Solução (`shared/src/patrols.ts`, `server/src/WorldRoom.ts`):** Extraímos o catálogo de setores (`PATROL_SECTORS`), as durações válidas (`[1, 4, 8, 12]` h com bônus de eficiência progressivo de até +25%) e o cálculo de recompensas para o pacote compartilhado `shared/src/patrols.ts`. O cálculo de recompensas (`calculatePatrolRewards`) é uma função pura e determinística com gerador pseudo-aleatório baseado em semente (`startedAt`), garantindo que EXP, Kan, fragmentos de Hollow e drops temáticos sejam gerados sem depender do relógio do sistema. No servidor, o estado reside em `Progress.patrol` sem timers em segundo plano — a validação de conclusão ocorre apenas sob demanda no resgate (`patrolClaim`), economizando CPU e memória.

## Foco de teclado: `blur()` no handler do campo muda o que os ouvintes de `window` veem (R-14)

- O `keydown` de um `<input>` roda antes de o evento subir até `window`. Se o handler do campo chama `blur()`, quando o ouvinte de `window` confere `document.activeElement` o campo já não está focado, e ele trata a tecla como se viesse do jogo (o Esc do chat também fecha as janelas; o Enter que envia volta a focar o chat). Para saber de onde a tecla veio, confira `e.target`, ou chame `stopPropagation` no handler do campo.
- `e.target instanceof HTMLInputElement` como regra de "está digitando" erra para os dois lados: deixa passar `<select>` e bloqueia `input type="range"`.

## Fluxo de publicação: uma branch e um PR por entrega

- **Regra (Waldir, 31/10/2026):** depois de acumular 38 commits na `main` local e publicá-los direto, a decisão passou a ser publicar cada entrega em branch própria com PR. Reduz o raio de conflito (o remoto já divergia com o F-10 duplicado) e dá o ponto de revisão adversarial previsto no fluxo do roadmap.

---

## 10. Camada visual do status (M2-06)

### Dano contínuo não é golpe
- O servidor manda cada tick de dano contínuo como `fx` `dmg` com `from` (quem aplicou) e `dot: true`. O cliente tratava todo `dmg` com `from` como golpe: quem aplicou o sangramento avançava sobre o alvo e o corte aparecia a cada segundo, mesmo longe.
- **Solução:** `dotHitStyle` (`client/src/statusFx.ts`) separa o dano contínuo antes da animação de golpe; ele só mostra um número menor, na cor do sangramento, sem som (tocaria a cada segundo).

### Cor de status sem brigar com a cor da forma
- O `onChange` do jogador trocava textura e cor no mesmo `if`, comparando a cor do sprite com a da forma. Com a cor do status por cima, o clarão branco do golpe (`setTintFill`) fazia a comparação falhar no patch seguinte, e a textura era trocada no meio do clarão. A troca de textura e a de cor ficaram separadas, a cor usa `desiredTint(status, cor da forma)` (também no `restoreTint`), e nada mexe na cor enquanto `tintFill` estiver ligado.
- A lógica que dá para testar sem Phaser (ler `statusFlags` só com os status conhecidos, prioridade da cor, estilo do número) fica num módulo puro com teste em `client/test/`. A ordem vem de `STATUS_KINDS`, exportada por `shared/src/combatStatus.ts`, e o teste confere contra `formatStatusFlags` do servidor.

### `process.env` no corpo do teste chega depois dos imports
- Em ESM, os `import` estáticos são avaliados antes do corpo do arquivo. Um teste que faz `import * as db from "../src/db"` e só depois `process.env.DB_FILE = ":memory:"` abre o `bleach-idle.sqlite` do disco. Era o caso de `auth.test`, `arena.test` e `e2e-world-gameplay.test`: três workers no mesmo arquivo, e o CI falhava às vezes com `database is locked` (run 41302928162). Rodando em casa, os testes ainda escreviam no banco de quem desenvolve.
- **Solução:** `env: { DB_FILE: ":memory:" }` no `vitest.config.ts`, que vale em todos os workers antes de qualquer import (cobre também `guilds.ts` e `economyAudit.ts`, que leem `DB_FILE` ao carregar). `server/test/test-env.test.ts` falha sem isso.
