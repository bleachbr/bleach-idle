# ADR-001: Estratégia da migração para Colyseus 0.18

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Proposto — aguarda aprovação de Waldir e Rafael |
| **Data** | 01/11/2026 |
| **Decisores** | Waldir e Rafael |
| **Relacionamento** | F-12; PRD `PRD-upgrade-colyseus-018.md` |

## Contexto

O Bleach Idle está em Colyseus 0.15 e usa uma combinação pequena de pacotes diretos: core, transporte WebSocket e Schema no servidor, mais `colyseus.js` no cliente e nos testes. O servidor também usa um `http.Server` próprio para entregar a aplicação web e o WebSocket na mesma porta.

A documentação oficial separa as mudanças de 0.15→0.16, 0.16→0.17 e 0.17→0.18. Mesmo que o código faça a atualização final diretamente para 0.18, a implementação precisa conferir as mudanças de cada etapa. Em especial, os callbacks do Schema saíram das instâncias no 0.16, o pacote `@colyseus/sdk` substituiu `colyseus.js` no 0.17 e o 0.18 atualiza esse SDK, exige Schema 5.x, limita o Schema a 63 campos e reserva novos códigos internos de fechamento.

## Decisão

Faremos uma única migração de runtime em um PR próprio, a partir da `main` que contém a spec aprovada, com estas regras:

1. **Alinhar os pacotes de runtime na linha 0.18.x.** Usaremos `@colyseus/core`, `@colyseus/ws-transport` e `@colyseus/sdk` em 0.18.x, e `@colyseus/schema` na linha 5.x compatível. As versões serão exatas no manifesto e no lockfile.
2. **Preservar o transporte atual.** Continuaremos com `new WebSocketTransport({ server: http })` e o HTTP customizado. O pacote agregador `colyseus` e os pacotes opcionais não entram apenas para seguir o template novo.
3. **Preservar a autoridade e o protocolo de jogo.** `lobby`, `world`, tickets, mensagens fire-and-forget, `this.handle`, estado Schema, autenticação própria e persistência SQLite continuam com o mesmo comportamento.
4. **Adotar somente as APIs necessárias.** `setSimulationInterval` será trocado por `setTimestep` se o typecheck confirmar a mesma cadência. `GameRoom` será ajustado aos genéricos atuais de `Room`. Não adotaremos `setFixedTimestep`, `room.request()` ou client-side prediction.
5. **Migrar callbacks de estado pelo API atual do SDK.** `Callbacks.get(room)` será o ponto único para `onAdd`, `onRemove`, `onChange` e `listen`. O acesso de leitura ao estado e `room.onMessage`/`room.send` permanecem.
6. **Corrigir o código de fechamento customizado.** A constante usada quando o mesmo personagem entra em outra janela sairá de `4001` e usará um valor de aplicação fora de `4000–4010`, faixa ocupada pelo Colyseus 0.17/0.18. O valor e o motivo serão cobertos por teste.
7. **Manter autenticação e dados fora do Colyseus Auth.** O projeto não usa `@colyseus/auth`; portanto, não haverá `AUTH_SALT`, reset coletivo de senhas, `@colyseus/database` nem mudança nas tabelas do SQLite.
8. **Adaptar a fronteira de autenticação e o dispatcher.** `LobbyRoom.onAuth` deve consumir o contexto 0.18, mas não pode tratar `context.ip`/headers como prova de que o peer TCP é confiável. A produção continuará expondo o app somente por Nginx/Caddy, em loopback/rede interna, com `X-Forwarded-For` sobrescrito; o caminho direto com header forjado deve ser bloqueado e testado. A proteção S11 contra tipos de mensagem maliciosos deve ser revalidada; se o dispatcher interno mudou, o código deve usar uma API suportada ou um adaptador compatível antes de manter o comportamento.

## Alternativas rejeitadas

### Atualizar apenas as versões do `package.json`

Rejeitada porque deixaria imports de `colyseus.js`, callbacks diretos do Schema, genéricos antigos e o código de fechamento `4001` sem verificação. Um processo que apenas instala a nova versão não comprova compatibilidade.

### Reescrever tudo para `defineServer`/`defineRoom`

Rejeitada para este item. A forma nova pode ser adotada se a API antiga deixar de compilar, mas uma reestruturação do entrypoint aumentaria o risco no servidor HTTP, no healthcheck e no deploy sem benefício funcional para F-12.

### Ficar em 0.17 como etapa permanente

Rejeitada porque o roadmap exige 0.18 e a redução do advisory depende da linha alvo. Uma instalação intermediária só pode ser usada localmente para diagnosticar uma quebra, nunca como estado final ou como branch de produto.

### Instalar pacotes opcionais do ecossistema 0.18

Rejeitada porque SQLite, autenticação, métricas e operação já têm implementações locais. Adicionar pacotes de persistência ou auth criaria migrações e superfícies novas fora do escopo.

## Consequências

### Positivas

- Remove a dependência direta do SDK cliente 0.15 e atualiza o Schema para a linha exigida pelo Colyseus 0.18.
- Expõe incompatibilidades de tipos e de callbacks no build local, antes do deploy.
- Evita conflitar a migração com mudanças de regra do jogo ou com a cadeia M1.
- Mantém um rollback simples do código porque o PR não altera o formato do banco.

### Negativas e cuidados

- `GameScene.ts`, `main.ts`, `inventory.ts`, todos os testes e todos os scripts que criam `Client` precisarão ser revisados.
- `LobbyRoom.onAuth` recebe um contexto diferente no 0.18; o framework resolve `context.ip` a partir de headers antes do peer TCP. A política de rate limit só será segura se a exposição direta for bloqueada e o proxy confiável sobrescrever os headers.
- A proteção contra tipos de mensagem usa hoje um detalhe interno do `Room`; a migração deve testar S11 e não assumir que `onMessageHandlers` mantém o mesmo formato.
- A alteração do SDK pode mudar detalhes de reconexão, mensagens não registradas e tipos de `Room`; a matriz do PRD é obrigatória.
- Um servidor atualizado pode desconectar clientes antigos. A imagem deve servir o bundle 0.18 correspondente, e o deploy deve ser tratado como troca atômica.
- O código antigo `4001` já precisa ser corrigido para não colidir com o protocolo interno do Colyseus.

## Critério para rever esta decisão

Reabrir este ADR se o typecheck do 0.18 exigir:

- uso do pacote `colyseus` agregador ou `defineServer` para iniciar o servidor;
- uma mudança de formato no Schema ou no SQLite;
- autenticação via `@colyseus/auth`;
- alteração do protocolo de mensagens além da adaptação de tipos e callbacks.

Qualquer desses casos deve entrar no PRD como mudança de escopo antes do código ser publicado.
