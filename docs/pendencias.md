# Pendências e Débitos Técnicos Registrados

Este documento mapeia todas as pendências conhecidas, limitações da arquitetura atual e débitos técnicos acumulados no **Bleach Idle**.

---

## 1. Sistema de NPCs e Eventos Narrativos ⚠️ (Prioridade Atual)

| Item | Situação Atual | Impacto / Necessidade |
| :--- | :--- | :--- |
| **Suporte a Múltiplos NPCs no Mapa** | O mapa Tiled só reconhece o tipo `loja` com sprite único `npc_shop`. | Não é possível posicionar capitães, tenentes ou instrutores com visual e falas próprias no Seireitei ou outras cidades. |
| **Diálogos e Árvores de Conversa** | Ao interagir com a loja, abre diretamente o menu do Kisuke. | Falta um sistema de balões/janela de diálogo com opções de resposta, lore e ativação de eventos. |
| **Eventos Semanais da Lore de Bleach** | Apenas invasões de Hollows (a cada 3h) e Chefe Mundial (a cada 2h) estão programados. Desde o R-12 os dois têm linha de lore no chat e banner no topo da tela. | Criar um gerenciador de rotação semanal que exiba eventos históricos (Invasão de Karakura, Traição no Soukyoku, Resgate de Rukia, etc.). |
| **NPCs do Seireitei (M1-03): sobras** | (1) Quem saiu do jogo num dos tiles que viraram NPC, (21,14), (26,13) ou (23,16) do Soul Society, volta no templo de Karakura, porque o tile salvo deixou de ser andável. (2) O `mapcheck` não confere se o tile do NPC era andável antes nem se a chegada continua ligada ao portal e ao portão (busca em largura). (3) Clicar no NPC manda `move` para um tile sólido, que o servidor descarta. | (1) `nearestWalkable` no mesmo mapa em `fromSave`. (2) Busca em largura no `mapcheck`. (3) Vira `interact` com `kind: "npc"` no M1-04. |
| **Crônicas: semanas 3 a 5 fora do PRD** | O catálogo do M1-08 (`shared/src/chronicles.ts`) diverge do PRD aceito: semana 3 inclui Las Noches e os chefes `privaron` e `ayon`; semana 4 inclui `privaron`, `ayon` e `yhwach`; semana 5 pede 20 Hollows em vez de 1 sessão de treino (`trained` do ADR-002). As semanas 1 e 2 foram alinhadas no `fix/m1-08-itens-da-spec`. Os ids da semana 1 também nascem em Karakura. | Alinhar código ou PRD antes do M1-06 (Waldir), que é quem passa a contar os abates por `quest.monsters`; contar só abates no mapa da crônica. |
| **Temporizador de fuga do chefe mundial e de fim da invasão** | Lido em `WorldRoom.ts`: o `setTimeout` de 15 min que chama `endWorldBoss` (agendado em `spawnWorldBoss`) não é cancelado quando o chefe morre, e o que chama `endInvasion(false)` (agendado em `startInvasion`) não é cancelado na vitória. Se outro chefe ou outra invasão começar antes de o timer antigo vencer (pelo modo Dev, `debugWorldBoss` ou `debugInvasion`), o timer antigo encerra o evento novo antes da hora e, desde o R-12, narra a fuga (`bossGone`) ou a retirada (`invLost`) e troca o banner. Pelo ciclo normal (2 h e 3 h) não acontece. | Guardar o `Delayed` de cada timer e cancelá-lo em `worldBossKilled` e na vitória da invasão. PR próprio, com cenário. |
| **Fases sem teste automático no R-12** | O aviso do chefe (`bossWarn`) e a fuga (`bossGone`) só disparam pelo relógio (5 min antes e 15 min depois do chefe); os cenários desligam esses timers. O banner no cliente (`client/src/events.ts`: vencimento, duas linhas juntas, `left` inválido) não tem teste: o projeto não testa o cliente (ver Playwright, §6). Leitor de tela e layout no celular foram conferidos só pelo código. | Cobrir as fases quando o motor de eventos ganhar relógio injetável ou um gatilho de debug próprio; o cliente, com M5-03. |

---

## 2. Combate e Habilidades

| Item | Situação Atual | Impacto / Necessidade |
| :--- | :--- | :--- |
| **Efeitos de Controle de Grupo (CC)** | **Feito.** Motor no servidor (M2-01 a M2-05: congelamento, lentidão, dano contínuo e atordoamento, `shared/src/combatStatus.ts`) e camada visual (M2-06: cor no sprite, ícone ao lado da barra de vida e número do dano contínuo, `client/src/statusFx.ts`). | Falta conferir no navegador a leitura dos ícones de 7 px em monstros grandes e no modo HD. |
| **Visual de Equipamentos Restrito** | Apenas o Haori de Capitão e a Máscara Hollow alteram o sprite do personagem (e apenas em Ichigo, Rukia e Renji). | Novos equipamentos (Elmo de Osso, botas, itens de Quincy e Fullbringer) ainda não têm representação visual nos personagens. |
| **Tempo de Recarga Numérico na UI** | **Feito (M2-07).** A barra de técnicas mostra os segundos que faltam em cada técnica, atualizados a cada 250 ms (`renderTechs` em `client/src/main.ts`). Ao recarregar a página, a contagem zera; durante a caçada automática, o servidor mantém a recarga e a barra mostra o custo até ela terminar. | No toque, o botão ⚔ usa a técnica mais forte pronta e não mostra recarga; só se alguém pedir. |
| **Paleta das folhas fora de sincronia (R-01)** | As 15 folhas da Yoruichi, do Ukitake e do Shunsui saíram com a paleta de 64 cores recalculada no R-01; as outras ~70 continuam com a anterior (o PR voltou as antigas para não mexer nelas). Visualmente não se nota. | O próximo `python art/process.py game` regrava todas as folhas: fazer isso num PR próprio (`chore:`), sem misturar com conteúdo novo. |
| **Números do R-01 sem revisão do Waldir** | `balance.ts` no nível 60, forma base: Yoruichi 861 mil XP/h, Shunsui 865 mil e Ukitake 761 mil, contra 763 mil (Byakuya) a 862 mil (Kenpachi) dos 8 atuais. A Yoruichi é a mais rápida em todos os estágios (`stepMs` 230 a 120). Com o motor de status do M2, o Bakudō 61 (Rikujōkōrō) atordoa por 1,5 s (o Byakurai do Byakuya atordoa por 1,2 s); o Utsusemi (esquiva na obra) só causa dano. | Revisão de números pela outra pessoa (regra 6 do `roadmap-duplas.md`). |

---

## 3. Economia e Social

| Item | Situação Atual | Impacto / Necessidade |
| :--- | :--- | :--- |
| **Troca Direta (Trade 1v1)** | Toda negociação é mediada pelo Mercado do Kisuke (anúncio público, 5% de taxa, 7 dias de validade). | Jogadores lado a lado não conseguem trocar itens ou kan de forma direta e segura. |
| **Abas de Chat no Cliente** | Todas as mensagens (`Geral`, `/pm`, `/p`, `/g`, logs de sistema) aparecem em uma única janela de rolagem. | O chat fica poluído rapidamente em caçadas com party e eventos globais. Necessário criar abas dedicadas. |
| **Banco e Sede de Guilda** | Apenas kan pode ser doado para a guilda. | Permitir cofre de itens compartilhado com controle de acesso por cargo (Líder, Oficial, Membro). |
| **Janela de duplicação entre módulos** | Conferido na revisão da spec do social (01/11/2026): `/guilda depositar` e `marketSell`/`marketBuy` gravam o banco da guilda ou o anúncio na hora, mas o personagem só no `saveAll` (10 s). Uma queda nesse intervalo duplica kan ou item. Cada módulo abre a própria conexão SQLite, então não há transação entre eles. | ADR-001 e ADR-004 de `features/social-avancado/`: conexão única com `transaction(fn)` e save do personagem na mesma transação. |
| **Auditoria de economia incompleta** | `recordAudit` usa `charId: p.name` (nome de exibição) na maioria das chamadas e o id no `creditSeller` offline; depósito e saque de guilda, reembolso de guilda, `bagTake`, `depot`, `giveLoot` e a Auto Venda não auditam. | Padronizar o id do personagem e auditar as entradas e saídas que faltam (W-08). |
| **Moderação e Segurança no Chat** | A moderação se resume ao comando `/ignorar Nome`. | Falta filtro automático de spam, mute temporário e comandos de administração para Game Masters (GM). |
| **Preços dos trajes sem revisão do Waldir (R-13)** | Uniforme do Colégio Karakura 150 cristais, haori de capitão 250, máscara Vizard 300 (as auras vão de 180 a 500). Fora do R-13 por decisão: haori de cada divisão e braçadeira de tenente, porque o detalhe não aparece em 48 px. | Revisão de preços pela outra pessoa (regra 6 do `roadmap-duplas.md`). |
| **Folha de traje que falha no download (R-13)** | `GameScene.loadLazy` pede cada folha uma vez só. Se o download falha (rede, offline), o personagem fica com a folha da forma base até recarregar a página. | Tentar de novo com espera crescente, se aparecer reclamação. Tentar a cada atualização de estado inundaria a rede. |

---

## 4. Contas e Infraestrutura de Servidor

| Item | Situação Atual | Impacto / Necessidade |
| :--- | :--- | :--- |
| **Recuperação de Senha por E-mail** | As contas possuem apenas `login` e `senha` criptografada com scrypt. | Se o jogador esquecer a senha, não há como recuperar o acesso sem intervenção manual no banco SQLite. |
| **Operação do deploy VPS (F-13)** | HTTPS e handshake WebSocket validados; secrets configurados; workflow rodando na main desde o merge. O deploy só confere o `/healthz`, que passou mesmo com o estado do Colyseus vazio (corrigido em `fix/tsx-tsconfig-container`). | Exercitar persistência entre recriações e restauração isolada; configurar cópia externa de backups e conferir fingerprint SSH pelo console do provedor. Não há rollback automático em falha de healthcheck; monitorar acúmulo de imagens. Avaliar um teste pós-deploy que confira o estado sincronizado (entrar no mundo e ver o próprio jogador), não só o `/healthz`. |
| **Rate Limiter em Memória** | O bloqueio por tentativas excessivas de login reside na memória do processo Node.js. | Em caso de reinício do servidor ou clusterização com múltiplos workers, os limites de tentativas são zerados. |
| **Multi-servidores / Sharding** | Um único processo gerencia todo o mundo e todas as conexões. | Para suportar centenas de jogadores simultâneos sem aumento de latência no tick de 100ms, será necessário particionar salas por mapa (`karakura`, `soul`, `hueco`, etc.). |

---

## 5. Automação e Qualidade de Vida (QoL)

| Item | Situação Atual | Impacto / Necessidade |
| :--- | :--- | :--- |
| **Filtros Customizados de Loot** | O Auto Helper recolhe tudo e converte em kan via Auto Venda apenas o excedente. | Jogadores de nível alto gostariam de ignorar lixo de monstros fracos e pegar apenas itens raros ou consumíveis específicos. |
| **Interiores de Edifícios e Andares** | Os edifícios nos mapas são sólidos sem entrada ou interiores exploráveis. | Quartéis do Seireitei, loja do Kisuke e palácios poderiam ter mapas internos dedicados. |
| **Minimapa sem o alvo das diárias e da Crônica (R-10)** | O minimapa marca só o alvo das missões do Kisuke. O alvo da missão diária de caça fica no servidor (`prog.dm`; o `book` manda só o texto), e o estado da Crônica Semanal ainda não chega ao cliente (M1-04/M1-06). | Mandar o `target` da diária na mensagem que já existe e, quando a Crônica tiver estado no cliente, somar as espécies dela em `questTargetKinds`. |
| **Atalhos que vazam do foco (R-14)** | `GameScene.bindKeys` só ignora teclas com foco em `input`: com o `<select id="hunt-spot">` focado, setas, dígitos, T e R chegam ao jogo, e um `range` do Auto Helper focado bloqueia os atalhos. O `#chatin` tira o foco antes de o evento subir: o Esc também fecha as janelas, e o Enter que envia volta a focar o chat (os dois deduzidos da ordem de propagação em `main.ts`, sem teste no navegador). | Consertar no 1º PR da R-14 (RF-08 da spec em `docs/features/acessibilidade-qol/`). |

---

## 6. Testes e Automação de CI

| Item | Situação Atual | Impacto / Necessidade |
| :--- | :--- | :--- |
| **Migração Completa para Vitest** | O projeto possui 141 testes rápidos no Vitest e 31 scripts de integração em `server/scripts/test.ts`. | Consolidar os 31 cenários legados no Vitest para unificar a execução em um único runner padronizado. |
| **Testes de Interface (Playwright)** | O cliente Phaser 3 não possui testes de regressão visual ou de cliques automatizados. Desde a issue #22 há um primeiro teste de regressão no navegador em `test/regressao/` (`cd test && npm run regressao`), reaproveitando o servidor isolado do Jogador-IA; ele roda só localmente, fora do CI. | Implementar testes E2E com Playwright para validar a tela de login, menus e HUD (M5-03) e levar `test/regressao/` para o workspace definido na spec. |
| **Mensagens do servidor sem handler no cliente** | Lido em 01/11/2026: além das quatro da Arena e da patrulha (corrigidas na issue #22), o servidor manda `mail` (`showMail`, chamado por `/correio`) e `emailOk` (`LobbyRoom`, mensagem `email`) e o cliente não registra handler para elas. O `/correio` dispara o aviso do colyseus.js no console; o `emailOk` só aparece se algo mandar `email`, e o cliente de hoje não manda. `arenaMatchFound` e `arenaResult` ganharam handler na #22, mas o teste no navegador não os exercita (pedem dois jogadores pareados). | Registrar os handlers em PR próprio, com o teste de regressão no navegador cobrindo `/correio`; estender o teste com dois contextos pareados na fila e `/arena desistir`. |

---

## 7. Segurança e integridade (verificado em 31/10/2026)

Cada item foi reproduzido num servidor isolado (porta própria, banco temporário) ou lido no código, como indicado. Nenhum foi corrigido neste PR: são mudanças em código de produção, que merecem PR próprio (`fix/seguranca-servidor`). Checklist de revisão: skill `seguranca-servidor`.

| ID | Item | Evidência | Prioridade | Correção proposta |
| :-- | :--- | :--- | :--- | :--- |
| S1 | **Modo Dev ligado por omissão.** `DEV_MODE` em `WorldRoom.ts` liga quando `NODE_ENV` não é `production` | Executado: servidor iniciado sem `NODE_ENV` respondeu à mensagem `dev` com "nível 300" e "+1.000.000 kan"; com `production`, o handler não existe. O `Dockerfile` define `production`; o README manda `npm run build && npm start` fora do Docker (o DEPLOY.md já usa `NODE_ENV=production`) | Corrigido | **Corrigido em `fix/seguranca-servidor`.** `DEV_MODE` e `BI_DEBUG` só ligam com `=== "1"` (`server/src/flags.ts`); `npm run dev` carrega `server/dev.env` com `BI_DEV=1`; o runner dos cenários exporta `BI_DEV=1`. Medido: sem `NODE_ENV`, com `NODE_ENV=development` e em produção o servidor deixa de responder a `dev` e desconecta quem o envia; com `BI_DEV=1` o modo Dev continua. Teste: `server/test/e2e-seguranca.test.ts`, `flags.test.ts` |
| S2 | **Chaves de protótipo aceitas.** `CHARS[m?.charId]` e outras buscas em objeto comum | Executado: `create` com `constructor`, `__proto__`, `toString` e `hasOwnProperty` cria personagem; entrar com ele falha; `shopBuy` lança `NOT NULL constraint failed: wallets.crystals`; `questAccept` com `constructor` aceita a missão "Object". Servidor segue vivo | Corrigido | **Corrigido em `fix/seguranca-servidor`.** `own()` e `isOwnKey()` (`shared/src/lookup.ts`) em `create`, `buy`, `questAccept`, `questAbandon`, `questTurnIn`, `shopBuy` e `shopEquip`. Teste: `e2e-seguranca.test.ts` (falha 8 de 9 no código anterior), `shared/test/lookup.test.ts` |
| S3 | **Limite de login por IP é compartilhado atrás do proxy.** `LobbyRoom.onAuth` (linha 34) lê o IP da conexão | Executado: 30 falhas de logins diferentes e o pedido seguinte de outra pessoa levou 429. Não testado com o Caddy: o `reverse_proxy` do Caddy 2 envia `X-Forwarded-For` por padrão (documentação do Caddy), e o jogo ignora o cabeçalho | Corrigido | **Corrigido em `fix/seguranca-servidor`.** `clientIp()` (`server/src/clientIp.ts`): lista explícita de CIDRs de proxies confiáveis via `net.BlockList` (`TRUST_PROXY="172.28.0.0/24"` no `docker-compose.yml`). Vale o último item de `X-Forwarded-For` só quando a conexão vem do proxy confiável. Teste: `server/test/clientIp.test.ts` |
| S4 | **Cristais por personagem, carteira por conta.** Diária e conquistas | Diária executada: 2 personagens da mesma conta, saldo 5 depois 10. Conquistas lidas no código. Limite de 5 personagens por conta | Decidido por Waldir; confirmado pelo Rafael em 31/10/2026 | **D-001 (31/10/2026): a trava fica por personagem.** Sem mudança de código; recompensa nova conta com até 5 personagens por conta |
| S5 | **Dependência com advisory alto** (`nanoid`, via Colyseus 0.15) | `npm audit --omit=dev`: 1 alto e 2 moderados. O Colyseus chama `nanoid` com tamanho fixo nos pontos lidos | Baixa | Upgrade maior do Colyseus em PR próprio, com a bateria completa. A spec de migração está em [`features/colyseus-018/`](features/colyseus-018/). Não usar `npm audit fix --force`. O alto (GHSA-xwg4-73v4-xw9w) só é explorável com `size` de 2^31 ou mais vindo do usuário |
| S6 | **`createAccount` e `createChar` tratam qualquer exceção como "já existe"** | Executado: `NOT NULL` em `createAccount` e `FOREIGN KEY` em `createChar` devolviam `null`/`false` em vez de lançar | Corrigido | **Corrigido em `fix/f-04-unique-db`.** `isUniqueConstraintError` em `server/src/db.ts` captura apenas `SQLITE_CONSTRAINT_PRIMARYKEY` (`1555`) e `SQLITE_CONSTRAINT_UNIQUE` (`2067`). Teste: `server/test/db.test.ts` |
| S7 | **Sem CSP nem cabeçalhos de segurança**; sessão de 30 dias em `localStorage` | Nenhum cabeçalho em `http.ts`, `index.html` ou `deploy/Caddyfile` | Corrigido | **Corrigido em `feat/f-06-caddy-csp-headers`.** `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` e `X-Frame-Options: DENY` em `deploy/Caddyfile` e `server/src/http.ts`, além dos MIME types `.webp` e `.jpg` em `TYPES`. Validado por `server/test/http-security-headers.test.ts` e `caddy validate` |
| S8 | **Proteção da `main` pública** | Ruleset `protect-main` (26294474): exclusão/force-push bloqueados, PR, uma aprovação atualizada, conversas resolvidas, branch atualizada e checks de CI e CodeRabbit, sem bypass. Secret scanning/push protection habilitados | Aprovação automática em validação | PRs #7 e #11 já mesclados por outra sessão. D-004 autoriza aprovação do CodeRabbit inclusive em CI/deploy/segurança após revisão completa e sem bloqueios, sem Code Owner humano obrigatório. CODEOWNERS indica responsáveis. Validar `APPROVED` do bot no HEAD atual e deploy pelo Actions. Não usar atalhos de aprovação nem bypass. |
| S9 | **Contêiner roda como root** | Executado: `id -un` devolveu `root` na imagem | Corrigido | **Corrigido em `fix/f-05-docker-user-node`.** `COPY --chown=node:node`, `RUN mkdir -p /data/backups && chown -R node:node /data` antes de `VOLUME /data` e `USER node` no estágio final do `Dockerfile`. Validado em contêiner descartável com volume nomeado novo e por `server/test/infra-security.test.ts` |
| S10 | **Cliente real desconectado com modo Dev desligado.** O cliente envia `devHello` ao entrar; sem handler, o Colyseus desconecta com código 4002 | Executado: em produção e com `npm start`, o cliente caía ao entrar no mundo | Corrigido | **Corrigido em `fix/seguranca-servidor`.** `devHello` é sempre registrado no `WorldRoom`, mas só responde se `BI_DEV=1`. Teste: `server/test/e2e-seguranca.test.ts` |
| S11 | **Mensagem de rede `__proto__` derruba o processo.** `onMessageHandlers` do Colyseus é objeto comum com protótipo | Executado: envio de tipo `__proto__` lançava `TypeError` fora de try/catch e matava o servidor Node | Corrigido | **Corrigido em `fix/seguranca-servidor`.** `GameRoom` anula o protótipo: `Object.setPrototypeOf(onMessageHandlers, null)`. Teste: `server/test/e2e-seguranca.test.ts` |
| S12 | **`docker-compose.yml` com sintaxe YAML inválida.** Interpolação de `DOMINIO` com dois pontos sem aspas | `docker compose config` falhava com erro de mapeamento na linha 21 | Corrigido | **Corrigido em `fix/seguranca-servidor`.** Interpolação entre aspas e subnet fixa `172.28.0.0/24` na rede interna |

## 8. Qualidade de testes e CI

| ID | Item | Evidência | Prioridade | Situação |
| :-- | :--- | :--- | :--- | :--- |
| Q1 | Cenários `social` e `rebirth` falham aos sábados e domingos | CI do PR #2 (run 41209911669) e execução local em 31/10/2026: XP 66 em vez de 33 e 132 em vez de 66, por causa de `xpWeekend` | Alta | **Corrigido neste PR** (commit `test:`); 29 verificações dos dois cenários passam num sábado |
| Q2 | `sleep` fixo nos testes | 0 chamadas no Vitest (trocadas por `vi.waitFor` e `sleep` removido de `testServer.ts` em `F-10`/`F-16`) e 213 nos cenários | Corrigido no Vitest | **Corrigido no Vitest (`test/f-10-vitest-sem-ruido`).** Nos cenários legados, trocar por laço com predicado ao mexer em cada cenário |
| Q3 | Ruído `colyseus.js: onMessage() not registered` na saída do Vitest | Visto em `npm test` | Corrigido | **Corrigido em `test/f-10-vitest-sem-ruido`.** `testServer.ts` intercepta `Client.prototype.createRoom` para registrar handlers `noop` de todas as mensagens conhecidas (`KNOWN_ROOM_MESSAGES`) antes do primeiro frame de `onJoin`, e `once()` remove seu listener após disparar |
| Q4 | CI sem `permissions` e com actions em tag móvel | Lido em `ci.yml` | Média | **Corrigido neste PR**: `contents: read`, SHAs fixados (v4.4.0) e `timeout-minutes: 25` |
| Q5 | Actions em Node 20 (aviso do GitHub: serão forçadas ao Node 24) | Anotação do run do PR #2 | Corrigido | **Corrigido em `ci/f-11-ci-gitleaks-matrix`.** `actions/checkout` v7.0.1 (`3d3c42e5...`) e `actions/setup-node` v7.1.0 (`949feb24...`) fixadas por SHA |
| Q6 | `DEPLOY.md` diz que a imagem Docker nunca foi construída | Executado: ela constrói e responde 200 | Baixa | **Corrigido neste PR** (`DEPLOY.md`). Continua sem teste: HTTPS atrás do Caddy |
| Q7 | Hooks de commit | Nenhum hook ativo em `.git/hooks` | Baixa | Opcional: rodar `gitleaks` antes de cada commit |
| Q8 | CI sem varredura de segredos (`gitleaks` só roda se alguém lembrar) | Lido em `ci.yml` | Corrigido | **Corrigido em `ci/f-11-ci-gitleaks-matrix`.** Job `gitleaks` com `fetch-depth: 0` e binário `v8.30.1` verificado por SHA-256 (`551f6fc8...`) |
| Q9 | `ubuntu-latest` migra para o Ubuntu 26 (aviso do GitHub no run do PR #2) | Anotação do run 41209911669 | Corrigido | **Corrigido em `ci/f-11-ci-gitleaks-matrix`.** `runs-on: ubuntu-24.04` fixado em todos os jobs |
| Q10 | CI testa Node 22 e o `Dockerfile` roda Node 24 | `ci.yml` e `Dockerfile`; typecheck, Vitest e a bateria completa passam nos dois (medido) | Corrigido | **Corrigido em `ci/f-11-ci-gitleaks-matrix`.** Matriz `node-version: ["22.x", "24.x"]` com `fail-fast: false` |
| Q11 | Cenário `quests` não conclui a patrulha no limite de espera | Em 01/11/2026, bateria de F-18: 332 verificações OK e 3 falhas em `quests` (6/10 abates). Reproduzido com `npx tsx scripts/test.ts quests` na `main` base `fd42553`: 4 OK e as mesmas 3 falhas (9/10). `server/scripts/quests.ts` espera até 150 s por 10 abates; entrega e missão única falham em cascata. | Alta | Investigar em entrega própria por que a caça não conclui no prazo; causa raiz ainda não determinada. Não aumentar timeout nem alterar combate junto de F-18. |
| Q12 | Cenário `hunt` instável: `e não cria sacola no chão` falha às vezes | Revisão do M1-03 (01/11/2026): 2 falhas em 5 rodadas, também com o servidor da `main`; usa `sleep` fixo e roda em Karakura | Média | Trocar os `sleep` por espera por condição (rotina do Q2) |

## 9. Desempenho

Números e método em [`baseline.md`](baseline.md). Skill: `performance-servidor`.

| ID | Item | Evidência | Prioridade |
| :-- | :--- | :--- | :--- |
| P1 | Reconstrução do ranking bloqueia o tick | **Corrigido em `perf/f-09-ranking-incremental`** (`server/src/ranking.ts`): p50 caiu de `10,29 ms` para `0,10 ms` (máx `0,45 ms`) com 1.000 personagens | Corrigido |
| P2 | Salvamento em lote é síncrono | `saveMany` de 200 saves: p50 1,40 a 1,43 ms, máximo 1,7 ms, a cada 10 s (banco em memória; disco soma o fsync) | Baixa hoje |
| P3 | Não há métrica da duração do tick | **Corrigido em `feat/f-08-metrica-tick`** (`server/src/tickStats.ts`, exposto em `/healthz` e com aviso `> 50 ms`) | Corrigido |
| P4 | Schema sem filtro e `broadcast` global | 33 `broadcast` no `WorldRoom` (31 antes do R-12, que soma o `chat` de lore e o `event`; os dois só saem na troca de fase de um evento); estado de todos os mapas vai a todos os clientes | Média, cresce com o número de jogadores |
| P5 | Um único JavaScript de 1,67 MB | Build do Vite avisa acima de 500 kB | Baixa |

- **Correio interno (W-07):** falta a janela no cliente (mensagens `mailList`/`mailTake` e `mail` já existem; hoje só `/correio`) e o envio de cartas entre jogadores, que exige limite e moderação próprios. Itens de recompensa (chefe mundial, diária) ainda pagam direto; migrar para carta quando o inventário estiver cheio.

---

## 10. Achados Registrados pelo Jogador-IA (Playtest de 01/11/2026)

| Issue | Tipo | Descrição |
| :--- | :--- | :--- |
| [#22](https://github.com/bleachbr/bleach-idle/issues/22) | Bug | Handlers `arenaData` e `patrolData` ausentes no colyseus.js do cliente |
| [#23](https://github.com/bleachbr/bleach-idle/issues/23) | Bug | Botão "Pegar a recompensa de hoje" (Diário) não coleta recompensa diária |
| [#24](https://github.com/bleachbr/bleach-idle/issues/24) | Bug | Encoding de texto corrompido no título da Crônica ("Orônloa: A Cidade Quieta") |
| [#25](https://github.com/bleachbr/bleach-idle/issues/25) | UX | Adicionar acesso direto e evidente ao Inventário na barra principal/superior |
| [#26](https://github.com/bleachbr/bleach-idle/issues/26) | UX | Melhorar interação com NPC Kisuke (loja) e evitar abertura acidental de Depot |
| [#27](https://github.com/bleachbr/bleach-idle/issues/27) | UX | Desmembrar mensagem genérica de habilidade indisponível ("recarga, reiatsu ou alcance") |
| [#34](https://github.com/bleachbr/bleach-idle/issues/34) | UX | Cards de recompensas do Passe de Temporada sem interação ou explicação de resgate |
| [#35](https://github.com/bleachbr/bleach-idle/issues/35) | UX | Substituir `window.confirm()` nativo no Renascimento (Rebirth) por modal do jogo |
| [#36](https://github.com/bleachbr/bleach-idle/issues/36) | UX | Adicionar tela/modal de atributos e estatísticas detalhadas ao clicar no perfil da barra lateral |
| [#37](https://github.com/bleachbr/bleach-idle/issues/37) | UX | Adicionar placeholders informativos e explicações nas abas vazias do Ranking |
| [#38](https://github.com/bleachbr/bleach-idle/issues/38) | UX | Adicionar navegação de retorno (Voltar) e indicador de "Lido" nas Crônicas da Loja de Cristais |
| [#39](https://github.com/bleachbr/bleach-idle/issues/39) | Balance | Avaliar atenuante para penalidade de morte por perda de itens e XP na Invasão de Hollows |
| [#40](https://github.com/bleachbr/bleach-idle/issues/40) | UX | Adicionar confirmação ou feedback visual imediato ao usar "Zerar contagem" na Caçada do Livro |
| [#41](https://github.com/bleachbr/bleach-idle/issues/41) | UX | Exibir feedback visual no HUD ao tentar usar poções com HP ou Reiatsu cheios |
