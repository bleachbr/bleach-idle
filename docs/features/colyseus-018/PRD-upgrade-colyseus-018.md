# PRD: Upgrade do Colyseus 0.15 para 0.18 (F-12)

| Metadado | Detalhe |
| :--- | :--- |
| **Feature** | Migração do runtime Colyseus 0.15 para 0.18 |
| **Item do roadmap** | `F-12` |
| **Status** | Proposto — PRD e ADRs em revisão; ainda não autoriza a alteração das dependências |
| **Data da proposta** | 01/11/2026 |
| **Dono** | Waldir, fila W |
| **Dependências** | Nenhuma para a spec; a implementação deve anteceder M4, W-16 e W-17 |

> Esta entrega define a migração. Ela não altera `package.json`, `package-lock.json` nem o código de produção. O upgrade de dependências será um PR posterior, depois da aprovação deste PRD e dos ADRs pelas duas pessoas.

## 1. Problema e contexto

O servidor usa `@colyseus/core` `0.15.57`, `@colyseus/ws-transport` `0.15.3` e `@colyseus/schema` `2.0.37`. O cliente e os cenários importam `colyseus.js` `0.15.28`. A pendência S5 registra um advisory alto e dois moderados na cadeia do Colyseus 0.15; a correção não deve ser feita com `npm audit fix --force`.

O upgrade é maior porque as versões intermediárias mudam o pacote do cliente, os callbacks do Schema, os genéricos de `Room`/`Client`, alguns hooks do ciclo de vida e códigos de fechamento WebSocket. A versão 0.18 também reduz o limite seguro de campos de um `Schema` para 63. O estado atual usa um `WorldState` com três mapas e classes `Player`, `Monster` e `Bag`, portanto a implementação precisa conferir a contagem antes de subir o servidor.

A aplicação não usa `@colyseus/auth`, `@colyseus/database`, `@colyseus/admin`, fossil-delta, `StateView` ou client-side prediction. A autenticação própria continua em `LobbyRoom`/`auth.ts`, com scrypt, sessões SQLite e tokens da aplicação. O upgrade não pode introduzir uma migração de senha nem trocar a persistência do jogo.

Referências oficiais consultadas:

- [Migração 0.15 → 0.16](https://docs.colyseus.io/migrating/0.16), incluindo callbacks do Schema e mudanças de APIs removidas.
- [Migração 0.16 → 0.17](https://docs.colyseus.io/migrating/0.17), incluindo genéricos de `Room`, `onLeave`, pacotes do SDK e códigos de fechamento.
- [Migração 0.17 → 0.18](https://docs.colyseus.io/migrating/0.18), incluindo Schema de 63 campos, `setTimestep`, `client.sessionId` e as mudanças de mensagens.
- [Callbacks de estado do SDK](https://docs.colyseus.io/state/callbacks), para substituir callbacks presos diretamente às instâncias do Schema.

## 2. Objetivos

1. Atualizar o servidor e o cliente para uma linha 0.18.x compatível, com versões diretas fixadas no manifesto e no lockfile.
2. Manter o protocolo de negócio existente: salas `lobby` e `world`, ticket de entrada, mensagens, estado sincronizado, autenticação própria, SQLite, caça offline e tick de 100 ms.
3. Adaptar apenas as APIs exigidas pela migração, sem reescrever o servidor, adotar client-side prediction ou mudar a autoridade do servidor.
4. Manter a execução validada em Node 22 e Node 24, no servidor local, nos testes Vitest, nos 31 cenários e no contêiner de produção.
5. Deixar um procedimento de rollback comprovado para o SHA anterior, sem depender de uma migração destrutiva do SQLite.

## 3. Fora de escopo

- Não instalar `@colyseus/auth`, `@colyseus/database`, `@colyseus/admin`, Redis, monitor ou playground.
- Não mudar o modelo de autenticação, o hash scrypt, a tabela `sessions`, o token da aplicação ou a recuperação de senha.
- Não introduzir request/response messaging, `room.request()`, input prediction, lag compensation, `setFixedTimestep()` ou sharding.
- Não alterar regras de combate, economia, mapas, catálogo de conteúdo ou a cadência de 100 ms.
- Não fazer limpeza geral de `WorldRoom.ts` nem refatorar imports sem relação com a migração.
- Não considerar o deploy em produção parte deste PR. O deploy seguirá o fluxo protegido da `main`, após CI e revisão.

## 4. Inventário atual

| Área | Estado observado | Impacto esperado |
| :--- | :--- | :--- |
| Dependências do servidor | `@colyseus/core` 0.15.57, `@colyseus/ws-transport` 0.15.3, `@colyseus/schema` 2.0.37 | Alinhar para 0.18.x e Schema 5.x; revisar tipos gerados |
| Dependência do cliente | `colyseus.js` 0.15.28 | Migrar para `@colyseus/sdk` 0.18.x e ajustar imports |
| Inicialização | `new Server({ transport: new WebSocketTransport({ server: http }) })`, `define("lobby")`, `define("world")` | Preservar o servidor HTTP próprio; só adotar `defineServer` se o compilador exigir |
| Tick do mundo | `WorldRoom.setSimulationInterval(...)` | Preferir `setTimestep(...)`, preservando exatamente `TICK_MS = 100` |
| Tipagem dos rooms | `GameRoom<S> extends Room<S>` e `WorldRoom extends GameRoom<WorldState>` | Ajustar ao formato de genéricos 0.17/0.18 sem perder o tipo de `state` |
| Callbacks do cliente | `state.players.onAdd`, `state.bags.onRemove`, `entity.onChange` e `entity.listen` | Usar `Callbacks.get(room)` para `onAdd`, `onRemove`, `onChange` e `listen` |
| Código de fechamento | A troca de janela chama `old.leave(4001)` | Usar constante de aplicação fora da faixa interna 4000–4010 do Colyseus 0.17/0.18 |
| Schemas | `Player`, `Monster`, `Bag` e `WorldState` em `server/src/schema.ts` | Contar os campos registrados em `defineTypes` e os herdados; manter cada classe abaixo de 64 |
| Testes e cenários | Importam `Client`/`Room` de `colyseus.js`; o helper intercepta `Client.prototype.createRoom`, embora o SDK esteja hoisted a partir do workspace | Migrar o helper, testes e scripts; declarar `@colyseus/sdk` como `devDependency` exata de `server` e não depender de hoisting acidental |
| Autenticação | `LobbyRoom.onAuth` e `server/src/auth.ts` próprios | Não aplicar a mudança de senha de `@colyseus/auth`, que não está instalado |

## 5. Alvo de dependências

O levantamento de versões publicado em 01/11/2026 indicou este alvo inicial. O PR de implementação deve confirmar as versões disponíveis no momento, escolher o patch compatível mais recente, registrar a decisão no PR e continuar usando números exatos, nunca uma faixa aberta:

| Pacote | Versão alvo de planejamento | Local |
| :--- | :--- | :--- |
| `@colyseus/core` | `0.18.24` | `server/package.json` |
| `@colyseus/ws-transport` | `0.18.4` | `server/package.json` |
| `@colyseus/schema` | `5.0.43` | `server/package.json` |
| `@colyseus/sdk` | `0.18.9` | `client/package.json` e `server/package.json` (`devDependency` para testes/cenários) |

Os pacotes de runtime precisam ficar na mesma linha principal 0.18.x exigida pelos peers: `@colyseus/core`, `@colyseus/ws-transport` e `@colyseus/sdk`. O `@colyseus/schema` segue separadamente a linha 5.x compatível com esses peers. O lockfile deve ser regenerado em uma instalação limpa. Se um patch mais novo for escolhido, a revisão deve registrar os números efetivamente instalados e repetir a matriz de validação; não se deve aceitar `latest` ou `^` para esses quatro pacotes diretos.

## 6. Requisitos técnicos da migração

### RT01 — Dependências e imports

- Remover `colyseus.js` dos workspaces.
- Importar `Client`, `Room` e os tipos do cliente de `@colyseus/sdk` em `client/`, `server/test/` e `server/scripts/`.
- Declarar `@colyseus/sdk` como `devDependency` exata no workspace `server`, pois os testes e cenários o importam diretamente; a instalação não pode depender do hoisting do workspace `client`.
- Manter `@colyseus/core` e `@colyseus/ws-transport` no servidor enquanto a API atual continuar suportada; não adicionar o pacote agregador `colyseus` sem necessidade demonstrada.
- Garantir que não restem referências a versões 0.15, Schema 2.x ou `colyseus.js` no lockfile e no código.

### RT02 — Inicialização e ciclo do servidor

- Manter o `http.Server` criado por `createHttpServer`, porque ele serve os assets, `/healthz`, `/metrics` e o WebSocket na mesma porta.
- Registrar `lobby` e `world`, criar a sala persistente do mundo e conservar `autoDispose = false`.
- Adaptar `LobbyRoom.onAuth` ao contexto de autenticação 0.18. O contexto padrão resolve `ip` a partir de headers antes do endereço remoto e não é prova suficiente de que o peer TCP é um proxy confiável. Portanto, a garantia de `TRUST_PROXY` será operacional: em produção, o app ficará acessível somente pelo Nginx/Caddy confiável, a porta do jogo continuará em loopback/rede interna e o proxy sobrescreverá `X-Forwarded-For`; acesso direto com header forjado não fará parte da superfície pública. O código deve consumir o `context.ip` somente sob essa fronteira, rejeitar/neutralizar headers encaminhados quando a fronteira não estiver configurada e testar a configuração do proxy e o caminho direto bloqueado.
- Trocar `setSimulationInterval` por `setTimestep` somente se a assinatura compilada mantiver o mesmo comportamento. O intervalo efetivo deve continuar em 100 ms; `setFixedTimestep` não faz parte desta migração.
- Ajustar `GameRoom` e `WorldRoom` aos genéricos atuais de `Room`, preservando a validação de mensagens por `handle` e o tratamento de exceções.

### RT03 — Callbacks e estado no cliente

- Obter uma instância de callbacks por sala com a API documentada do SDK 0.18.
- Migrar as adições/remoções de `players`, `monsters` e `bags` para `callbacks.onAdd`/`callbacks.onRemove`.
- Migrar a atualização agregada de cada entidade para `callbacks.onChange(entity, ...)`; quando a lógica depender de um único campo, usar `callbacks.listen(entity, campo, ...)`.
- Manter acesso de leitura a `room.state.players.get(...)` e as mensagens `room.onMessage(...)`/`room.send(...)`, salvo incompatibilidade comprovada pelo typecheck.
- Garantir que listeners sejam removidos no ciclo de vida da sala quando a API retornar uma função/assinatura de cancelamento, para não reter cenas ou painéis.

### RT04 — Protocolos e segurança

- Definir uma constante nomeada para a desconexão por personagem aberto em outra janela. O valor não pode ser 4000–4010; o teste deve provar que o servidor usa o código escolhido.
- Revalidar a proteção S11 de `GameRoom`: a versão 0.15 anula o protótipo de `onMessageHandlers`, uma propriedade interna que pode mudar na migração. Se o dispatcher 0.18 não expuser a mesma propriedade, adaptar o guard a uma API suportada ou encapsular a compatibilidade, e provar que `__proto__`, `__defineGetter__` e `__defineSetter__` não derrubam o processo.
- Não confiar em opções de `join`, payloads ou dados de Schema novos. A migração não pode trocar `this.handle` por `onMessage` nos handlers de produção.
- Preservar `devHello` registrado mesmo com `BI_DEV` desligado e manter o teste que garante que o modo Dev continua desligado por padrão.
- Testar `onAuth` com o contexto 0.18, tanto pelo caminho público atrás do proxy quanto pelo caminho direto bloqueado. A aplicação não deve tratar `context.ip` como prova de proxy confiável: o limite de login/cadastro só pode usar o IP encaminhado depois que a fronteira Nginx/Caddy e `TRUST_PROXY` estiverem verificadas.
- Verificar que nenhuma mudança de dependência reintroduz endpoints de playground, logs de token/senha ou um pacote de autenticação não solicitado.

### RT05 — Schema e compatibilidade de wire

- Contar e documentar somente os campos registrados em `defineTypes` (e os herdados), não todas as propriedades server-only das classes. A linha de base atual é `Player` 46, `Monster` 12, `Bag` 6 e `WorldState` 3; nenhuma classe pode atingir o 64º campo.
- Não adicionar campos sincronizados como parte do F-12. Se a implementação descobrir que uma classe excede o limite, extrair um Schema filho em PR próprio ou registrar a decisão antes de prosseguir.
- Confirmar que MapSchema, `defineTypes`, `uint8`, `uint16`, `uint32`, `int16`, `int32`, `number`, strings e booleanos continuam decodificando nos clientes 0.18.
- Testar um cliente 0.18 novo desde o primeiro frame, sem depender de um cliente 0.15 conectado ao servidor atualizado.

### RT06 — Persistência e autenticação

- Não alterar tabelas SQLite, `fromSave`, backups, sessões, scrypt ou tokens.
- Testar que uma conta e personagem criados antes do upgrade continuam entrando após reinício com o mesmo banco temporário.
- Não configurar `AUTH_SALT`: a recomendação da migração de `@colyseus/auth` não se aplica porque o projeto não usa esse pacote. Essa conclusão deve permanecer explícita no PR de implementação.

## 7. Critérios de aceite

- [ ] PRD e ADR-001/ADR-002 aprovados por Waldir e Rafael antes do PR de código do upgrade.
- [ ] As versões diretas do alvo estão alinhadas, exatas e presentes no lockfile; nenhum pacote 0.15/Schema 2/`colyseus.js` permanece.
- [ ] `npm run typecheck` passa em Node 22 e 24.
- [ ] `npm test` passa sem avisos de `onMessage` não registrado introduzidos pela migração.
- [ ] `npm run test:scripts` passa nos 31 cenários, sem `sleep` novo ou espera arbitrária introduzida pelo upgrade.
- [ ] `npm run build` passa e o cliente consegue registrar callbacks, renderizar entidades, atualizar HUD e sair da sala.
- [ ] Smoke E2E comprova cadastro/login, ticket, entrada no mundo, estado inicial, mudança de posição, mensagens, logout e reconexão.
- [ ] Smoke E2E comprova a troca de janela com código de aplicação fora de 4000–4010 e servidor ainda responsivo.
- [ ] Teste de entrada inválida e `devHello` continua cobrindo autoridade do servidor e modo Dev desligado.
- [ ] Teste S11 cobre `__proto__`, `__defineGetter__` e `__defineSetter__` sem derrubar o processo ou outra conexão.
- [ ] Teste de `onAuth` cobre o contexto 0.18 pelo proxy confiável, o bloqueio do caminho direto, `X-Forwarded-For` adulterado fora da fronteira e os limites de login/cadastro.
- [ ] O servidor inicia com HTTP customizado, WebSocket, `/healthz`, sala `world` persistente e backup configurado.
- [ ] Um banco SQLite criado antes da migração abre no servidor atualizado; nenhum `ALTER TABLE` ou mudança de dados é exigido.
- [ ] `docker build` e um contêiner descartável com usuário `node` passam.
- [ ] `gitleaks git --redact -c .gitleaks.toml .` passa antes do PR.
- [ ] O procedimento de rollback de ADR-002 foi ensaiado com um banco temporário e o SHA anterior, sem destruir dados.

## 8. Matriz de validação

| Camada | Cenário mínimo | Evidência esperada |
| :--- | :--- | :--- |
| Dependências | instalação limpa em Node 22 e 24 | lockfile reproduz as versões aprovadas |
| Servidor | iniciar, `/healthz`, `lobby`, `world` | processo estável e salas disponíveis |
| Autenticação | registrar, login por senha, login por token | mensagens e sessões iguais às atuais |
| Estado | entrar, ver `Player`/`Monster`/`Bag`, alterar posição e HP | callbacks do SDK atualizam a cena |
| Segurança | `devHello` sem Dev, payload inválido, excesso de mensagens, tipos `__proto__`, contexto de `onAuth`, proxy público e porta direta | sem privilégio indevido, crash, bypass de proxy ou limite compartilhado indevidamente |
| Compatibilidade | duplicar personagem, fechar antiga, entrar com nova | código de aplicação não reservado e estado íntegro |
| Persistência | reiniciar com o mesmo SQLite | conta, personagem e save continuam legíveis |
| Produção | imagem, usuário `node`, healthcheck e TLS no fluxo existente | build e smoke sem alterar Nginx ou volume |
| Rollback | restaurar o SHA anterior com cópia do banco | serviço antigo abre o mesmo banco sem perda |

## 9. Plano de rollout

1. Implementar em branch própria, sem basear-se nos PRs encadeados de M1 que ainda estão fora da `main`.
2. Rodar a matriz completa localmente em Node 22 e Node 24.
3. Fazer revisão adversarial independente, com atenção especial aos imports do SDK, códigos de fechamento, callbacks e Schema.
4. Abrir o PR do código somente após a aprovação desta spec e dos ADRs.
5. Depois de CI verde e aprovação exigida, publicar pela Actions. O deploy deve desconectar clientes durante a troca e servir cliente e servidor da mesma imagem.
6. Observar `/healthz`, login, criação de personagem, entrada no mundo, mensagens e tick. Se algum gate falhar, executar ADR-002, não editar o banco de produção.

## 10. Riscos e decisões pendentes

- **API de inicialização:** manter `new Server` reduz escopo; migrar para `defineServer` somente se 0.18 tornar a forma atual incompatível. A decisão final fica registrada no PR de implementação.
- **Callbacks:** a migração tem impacto direto em `GameScene.ts`, `main.ts` e `inventory.ts`. O cenário visual deve comprovar que o listener agregado não perdeu atualizações de movimento, HP, forma, cosméticos ou mapa.
- **Códigos WebSocket:** o código atual `4001` conflita com a faixa usada pelo Colyseus 0.17/0.18. A constante de aplicação precisa ser alterada e coberta por teste.
- **Pacotes publicados:** patches podem avançar antes da implementação. A revisão deve fixar os números realmente testados, sem atualizar outros pacotes por conveniência.
- **Produção sem staging:** o repositório tem uma VPS, não um ambiente de homologação equivalente. O rollback com imagem e backup é obrigatório antes do primeiro deploy.

## 11. Resultado esperado

Ao concluir F-12, o projeto terá Colyseus 0.18.x e Schema 5.x sem mudança de regra de jogo, sem migração de dados e sem dependência opcional nova. O advisory ligado ao runtime 0.15 será reavaliado por `npm audit --omit=dev`, e M4 poderá começar sobre uma versão suportada, depois de sua própria spec.
