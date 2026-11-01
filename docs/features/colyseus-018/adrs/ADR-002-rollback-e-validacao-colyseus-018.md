# ADR-002: Validação, rollout e rollback do Colyseus 0.18

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Proposto — aguarda aprovação de Waldir e Rafael |
| **Data** | 01/11/2026 |
| **Decisores** | Waldir e Rafael |
| **Relacionamento** | F-12; PRD `PRD-upgrade-colyseus-018.md` |

## Contexto

O Bleach Idle tem uma VPS de produção, sem staging equivalente, e o workflow publica uma imagem Docker depois de `test` e `gitleaks`. O deploy recria o container, pode desconectar jogadores e não faz rollback automático. O SQLite vive no volume persistente `/data`; a imagem anterior pode permanecer disponível, mas um rollback só é seguro se a versão antiga conseguir ler o banco.

O Colyseus 0.18 também altera o protocolo do Schema e usa códigos de fechamento internos na faixa 4000–4010. O SQLite do jogo opera em WAL e o código local já possui um backup consistente via `VACUUM INTO`; copiar apenas o arquivo principal durante o funcionamento pode deixar transações no `-wal`. Uma falha pode aparecer como servidor saudável no HTTP, mas cliente incapaz de autenticar, receber estado ou permanecer no mundo. Por isso, healthcheck isolado não é critério suficiente.

## Decisão

### Gate antes do merge

Os checks automatizados atuais cobrem typecheck, Vitest e cenários nos dois Node da matriz. Até que o workflow ganhe jobs próprios para build e imagem, `npm run build`, `docker build` e a validação do contêiner são gates manuais que precisam aparecer como evidência no PR de implementação.

1. PRD e ADRs estiverem aprovados pelas duas pessoas.
2. A instalação limpa reproduzir as versões exatas em Node 22 e Node 24.
3. `npm run typecheck`, `npm test`, `npm run test:scripts`, `npm run build` e `gitleaks git --redact -c .gitleaks.toml .` passarem.
4. `docker build` e um contêiner descartável validarem usuário `node`, `/healthz`, WebSocket e o caminho de assets.
5. O smoke E2E confirmar login, ticket, entrada no mundo, estado, mensagens, logout, reconexão e fechamento de sessão duplicada.
6. Um banco temporário criado com o código anterior for aberto pelo código novo e, depois, pelo código anterior novamente.

### Gate antes do deploy

Depois do merge, o CI obrigatório precisa estar verde em Node 22, Node 24, gitleaks e deploy. Antes de autorizar a execução em produção, registrar:

- confirmar que a porta do jogo não é pública, que o Nginx/Caddy é a única entrada e que ele sobrescreve os headers de origem antes de aceitar o `context.ip` do Colyseus;
- SHA do último deploy saudável;
- SHA da imagem nova;
- cópia/backup verificado do SQLite fora do caminho de experimentação;
- confirmação de que nenhum `ALTER TABLE`, migração de save ou mudança de senha faz parte do PR;
- plano de observação de login, criação de personagem, entrada no mundo, `/healthz`, `/metrics` e tick.

O workflow existente continua sendo o único caminho de publicação. Não executar comandos manuais no banco de produção nem `docker compose down -v`.

### Smoke pós-deploy

Após o healthcheck do workflow, fazer uma verificação funcional curta:

1. Abrir a página por HTTPS e confirmar que o bundle entregue é o da mesma revisão.
2. Registrar ou usar uma conta de teste, entrar no lobby e receber a lista de personagens.
3. Entrar no mundo, confirmar estado inicial e uma mensagem de ida e volta.
4. Confirmar que `/healthz` responde e que o servidor continua aceitando uma segunda conexão.
5. Verificar ausência de erro de Schema, desconexão 4002 inesperada ou aumento anormal da duração do tick.

Falha em qualquer passo bloqueia a validação do F-12 e aciona o rollback. A restauração do backup de produção é uma atividade de F-13 e só pode ser feita em ambiente isolado com autorização operacional específica.

## Procedimento de rollback

1. Parar a progressão do diagnóstico sem alterar o volume ou apagar imagens.
2. Registrar logs, SHA em execução, hora e sintoma sem incluir senha, token ou segredo.
3. Confirmar que a imagem anterior está disponível na VPS e que o seu SHA é o último deploy saudável.
4. Gerar uma cópia consistente pelo caminho de backup da aplicação (`db.backup`, que usa `VACUUM INTO`) ou mecanismo SQLite equivalente; não copiar apenas o arquivo principal enquanto o WAL está ativo. Abrir a cópia em ambiente isolado, executar `PRAGMA integrity_check`, registrar o hash e manter a cópia fora do volume de produção antes de qualquer restauração.
5. Reaplicar a imagem anterior pelo mecanismo de deploy existente, usando o SHA completo exigido por `deploy/deploy.sh`.
6. Aguardar o healthcheck e repetir o smoke mínimo de HTTPS, lobby e mundo.
7. Confirmar que o código anterior abre o banco e que personagens, sessões e saves continuam legíveis.
8. Se a imagem anterior não estiver disponível ou o banco não abrir, parar e pedir intervenção humana. Não tentar downgrade destrutivo do SQLite.

O rollback reinicia a aplicação e desconecta clientes; eles devem recarregar o bundle correspondente à imagem antiga. Como F-12 não altera o banco, não há operação de downgrade de esquema prevista.

## Evidência e encerramento

O PR deve registrar, sem segredos:

- comandos executados e versão de Node;
- versões exatas instaladas;
- resultado dos testes e cenários;
- SHA publicado e SHA de rollback ensaiado;
- resultado do smoke funcional;
- qualquer desvio do PRD e a decisão tomada.

O item F-12 só pode mudar para `Feito` quando a implementação estiver mesclada, CI estiver verde, o smoke pós-deploy tiver sido concluído e não houver achado `BLOQUEIA` ou `ALTA` aberto. A spec aprovada, sozinha, apenas remove o estado `Precisa de spec` e permite abrir o PR de código.

## Alternativas rejeitadas

- **Rollback automático após qualquer falha:** rejeitado porque a aplicação não consegue distinguir um healthcheck HTTP de uma falha de protocolo do cliente, e o rollback automático pode mascarar dados ou causar flapping.
- **Testar restauração sobrescrevendo `/data`:** rejeitado porque mistura evidência de F-13 com dados de produção e pode apagar saves.
- **Manter clientes 0.15 conectados durante o rollout:** rejeitado porque o wire protocol do Schema e o SDK mudam; a imagem deve entregar cliente e servidor compatíveis.
- **Usar somente `curl /healthz` como aprovação:** rejeitado porque não exercita autenticação, matchmaker, Schema, mensagens nem callbacks.
