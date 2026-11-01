# Aprendizados Técnicos do Projeto (Bleach Idle)

Este documento reúne lições práticas, decisões arquiteturais e armadilhas superadas ao longo da construção do **Bleach Idle**. O objetivo é preservar o conhecimento acumulado e evitar que futuras sessões ou agentes repitam erros já solucionados.

---

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

---

## 8. Eventos Globais no Cliente sem Campo Novo no Schema

### Banner de Evento por Mensagem Pontual (R-12)
- O banner da invasão e do chefe mundial podia virar campo sincronizado no `WorldState`. Não virou: o schema não tem filtro, então todo campo novo vai a todos os clientes a cada patch (`pendencias.md`, P4), e um valor de tipo errado num campo sincronizado derruba a codificação do estado da sala inteira (comentário do handler `step` em `WorldRoom.ts`).
- **Solução:** o servidor manda `event` (`{ kind, phase, until, left }`) só quando a fase muda e guarda o último banner de cada tipo (`banners` em `WorldRoom.ts`). Quem entra no meio recebe os banners ainda válidos em `onJoin` (`sendBanners`). O cliente apaga o banner sozinho quando o prazo passa, sem mensagem de "fim".
- O prazo no cliente sai de `left` (ms que faltam) somado ao relógio do aparelho, e não de `until` com `serverNow()`: o banner de quem entra chega antes da resposta do `time` (`clock.ts`), e um aparelho adiantado apagaria o banner na hora.
- Os textos ficam em `shared/src/events.ts`, e o servidor manda só a fase. O cliente busca o texto com `own(EVENT_BANNER, fase)`: mesmo vindo do servidor, a chave chega pela rede.
- Os avisos de sistema com números (vida, XP, minutos) continuam iguais e a lore vai numa linha separada (canal `lore`), porque os cenários `invasion` e `temporada` conferem trechos desses avisos.
