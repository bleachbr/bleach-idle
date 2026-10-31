# Pendências e Débitos Técnicos Registrados

Este documento mapeia todas as pendências conhecidas, limitações da arquitetura atual e débitos técnicos acumulados no **Bleach Idle**.

---

## 1. Sistema de NPCs e Eventos Narrativos ⚠️ (Prioridade Atual)

| Item | Situação Atual | Impacto / Necessidade |
| :--- | :--- | :--- |
| **Suporte a Múltiplos NPCs no Mapa** | O mapa Tiled só reconhece o tipo `loja` com sprite único `npc_shop`. | Não é possível posicionar capitães, tenentes ou instrutores com visual e falas próprias no Seireitei ou outras cidades. |
| **Diálogos e Árvores de Conversa** | Ao interagir com a loja, abre diretamente o menu do Kisuke. | Falta um sistema de balões/janela de diálogo com opções de resposta, lore e ativação de eventos. |
| **Eventos Semanais da Lore de Bleach** | Apenas invasões de Hollows (a cada 3h) e Chefe Mundial (a cada 2h) estão programados. Desde o R-12 os dois têm linha de lore no chat e banner no topo da tela. | Criar um gerenciador de rotação semanal que exiba eventos históricos (Invasão de Karakura, Traição no Soukyoku, Resgate de Rukia, etc.). |
| **Temporizador de fuga do chefe mundial e de fim da invasão** | Lido em `WorldRoom.ts`: o `setTimeout` de 15 min que chama `endWorldBoss` (agendado em `spawnWorldBoss`) não é cancelado quando o chefe morre, e o que chama `endInvasion(false)` (agendado em `startInvasion`) não é cancelado na vitória. Se outro chefe ou outra invasão começar antes de o timer antigo vencer (pelo modo Dev, `debugWorldBoss` ou `debugInvasion`), o timer antigo encerra o evento novo antes da hora e, desde o R-12, narra a fuga (`bossGone`) ou a retirada (`invLost`) e troca o banner. Pelo ciclo normal (2 h e 3 h) não acontece. | Guardar o `Delayed` de cada timer e cancelá-lo em `worldBossKilled` e na vitória da invasão. PR próprio, com cenário. |
| **Fases sem teste automático no R-12** | O aviso do chefe (`bossWarn`) e a fuga (`bossGone`) só disparam pelo relógio (5 min antes e 15 min depois do chefe); os cenários desligam esses timers. O banner no cliente (`client/src/events.ts`: vencimento, duas linhas juntas, `left` inválido) não tem teste: o projeto não testa o cliente (ver Playwright, §6). Leitor de tela e layout no celular foram conferidos só pelo código. | Cobrir as fases quando o motor de eventos ganhar relógio injetável ou um gatilho de debug próprio; o cliente, com M5-03. |

---

## 2. Combate e Habilidades

| Item | Situação Atual | Impacto / Necessidade |
| :--- | :--- | :--- |
| **Efeitos de Controle de Grupo (CC)** | Apenas dano direto e dano em área (`area`) estão implementados na `main`. | Congelamento (*Freeze* da Rukia/Hitsugaya), Sangramento (*Bleed*) e Atordoamento (*Stun*) precisam ser integrados ao motor autoritativo. |
| **Visual de Equipamentos Restrito** | Apenas o Haori de Capitão e a Máscara Hollow alteram o sprite do personagem (e apenas em Ichigo, Rukia e Renji). | Novos equipamentos (Elmo de Osso, botas, itens de Quincy e Fullbringer) ainda não têm representação visual nos personagens. |
| **Tempo de Recarga Numérico na UI** | A barra de técnicas mostra indicação de recarga básica. | Adicionar contagem regressiva em segundos sobre o slot da habilidade no HUD para melhor legibilidade. |

---

## 3. Economia e Social

| Item | Situação Atual | Impacto / Necessidade |
| :--- | :--- | :--- |
| **Troca Direta (Trade 1v1)** | Toda negociação é mediada pelo Mercado do Kisuke (anúncio público, 5% de taxa, 7 dias de validade). | Jogadores lado a lado não conseguem trocar itens ou kan de forma direta e segura. |
| **Abas de Chat no Cliente** | Todas as mensagens (`Geral`, `/pm`, `/p`, `/g`, logs de sistema) aparecem em uma única janela de rolagem. | O chat fica poluído rapidamente em caçadas com party e eventos globais. Necessário criar abas dedicadas. |
| **Banco e Sede de Guilda** | Apenas kan pode ser doado para a guilda. | Permitir cofre de itens compartilhado com controle de acesso por cargo (Líder, Oficial, Membro). |
| **Moderação e Segurança no Chat** | A moderação se resume ao comando `/ignorar Nome`. | Falta filtro automático de spam, mute temporário e comandos de administração para Game Masters (GM). |

---

## 4. Contas e Infraestrutura de Servidor

| Item | Situação Atual | Impacto / Necessidade |
| :--- | :--- | :--- |
| **Recuperação de Senha por E-mail** | As contas possuem apenas `login` e `senha` criptografada com scrypt. | Se o jogador esquecer a senha, não há como recuperar o acesso sem intervenção manual no banco SQLite. |
| **Rate Limiter em Memória** | O bloqueio por tentativas excessivas de login reside na memória do processo Node.js. | Em caso de reinício do servidor ou clusterização com múltiplos workers, os limites de tentativas são zerados. |
| **Multi-servidores / Sharding** | Um único processo gerencia todo o mundo e todas as conexões. | Para suportar centenas de jogadores simultâneos sem aumento de latência no tick de 100ms, será necessário particionar salas por mapa (`karakura`, `soul`, `hueco`, etc.). |

---

## 5. Automação e Qualidade de Vida (QoL)

| Item | Situação Atual | Impacto / Necessidade |
| :--- | :--- | :--- |
| **Filtros Customizados de Loot** | O Auto Helper recolhe tudo e converte em kan via Auto Venda apenas o excedente. | Jogadores de nível alto gostariam de ignorar lixo de monstros fracos e pegar apenas itens raros ou consumíveis específicos. |
| **Interiores de Edifícios e Andares** | Os edifícios nos mapas são sólidos sem entrada ou interiores exploráveis. | Quartéis do Seireitei, loja do Kisuke e palácios poderiam ter mapas internos dedicados. |

---

## 6. Testes e Automação de CI

| Item | Situação Atual | Impacto / Necessidade |
| :--- | :--- | :--- |
| **Migração Completa para Vitest** | O projeto possui 141 testes rápidos no Vitest e 31 scripts de integração em `server/scripts/test.ts`. | Consolidar os 31 cenários legados no Vitest para unificar a execução em um único runner padronizado. |
| **Testes de Interface (Playwright)** | O cliente Phaser 3 não possui testes de regressão visual ou de cliques automatizados. | Implementar testes E2E com Playwright para validar a tela de login, menus e HUD. |

---

## 7. Segurança e integridade (verificado em 31/10/2026)

Cada item foi reproduzido num servidor isolado (porta própria, banco temporário) ou lido no código, como indicado. Nenhum foi corrigido neste PR: são mudanças em código de produção, que merecem PR próprio (`fix/seguranca-servidor`). Checklist de revisão: skill `seguranca-servidor`.

| ID | Item | Evidência | Prioridade | Correção proposta |
| :-- | :--- | :--- | :--- | :--- |
| S1 | **Modo Dev ligado por omissão.** `DEV_MODE` em `WorldRoom.ts` liga quando `NODE_ENV` não é `production` | Executado: servidor iniciado sem `NODE_ENV` respondeu à mensagem `dev` com "nível 300" e "+1.000.000 kan"; com `production`, o handler não existe. O `Dockerfile` define `production`; o README manda `npm run build && npm start` fora do Docker (o DEPLOY.md já usa `NODE_ENV=production`) | Corrigido | **Corrigido em `fix/seguranca-servidor`.** `DEV_MODE` e `BI_DEBUG` só ligam com `=== "1"` (`server/src/flags.ts`); `npm run dev` carrega `server/dev.env` com `BI_DEV=1`; o runner dos cenários exporta `BI_DEV=1`. Medido: sem `NODE_ENV`, com `NODE_ENV=development` e em produção o servidor deixa de responder a `dev` e desconecta quem o envia; com `BI_DEV=1` o modo Dev continua. Teste: `server/test/e2e-seguranca.test.ts`, `flags.test.ts` |
| S2 | **Chaves de protótipo aceitas.** `CHARS[m?.charId]` e outras buscas em objeto comum | Executado: `create` com `constructor`, `__proto__`, `toString` e `hasOwnProperty` cria personagem; entrar com ele falha; `shopBuy` lança `NOT NULL constraint failed: wallets.crystals`; `questAccept` com `constructor` aceita a missão "Object". Servidor segue vivo | Corrigido | **Corrigido em `fix/seguranca-servidor`.** `own()` e `isOwnKey()` (`shared/src/lookup.ts`) em `create`, `buy`, `questAccept`, `questAbandon`, `questTurnIn`, `shopBuy` e `shopEquip`. Teste: `e2e-seguranca.test.ts` (falha 8 de 9 no código anterior), `shared/test/lookup.test.ts` |
| S3 | **Limite de login por IP é compartilhado atrás do proxy.** `LobbyRoom.onAuth` (linha 34) lê o IP da conexão | Executado: 30 falhas de logins diferentes e o pedido seguinte de outra pessoa levou 429. Não testado com o Caddy: o `reverse_proxy` do Caddy 2 envia `X-Forwarded-For` por padrão (documentação do Caddy), e o jogo ignora o cabeçalho | Corrigido | **Corrigido em `fix/seguranca-servidor`.** `clientIp()` (`server/src/clientIp.ts`): lista explícita de CIDRs de proxies confiáveis via `net.BlockList` (`TRUST_PROXY="172.28.0.0/24"` no `docker-compose.yml`). Vale o último item de `X-Forwarded-For` só quando a conexão vem do proxy confiável. Teste: `server/test/clientIp.test.ts` |
| S4 | **Cristais por personagem, carteira por conta.** Diária e conquistas | Diária executada: 2 personagens da mesma conta, saldo 5 depois 10. Conquistas lidas no código. Limite de 5 personagens por conta | Decidido por Waldir; aguarda o Rafael | **D-001 (31/10/2026): a trava fica por personagem.** Sem mudança de código; recompensa nova conta com até 5 personagens por conta |
| S5 | **Dependência com advisory alto** (`nanoid`, via Colyseus 0.15) | `npm audit --omit=dev`: 1 alto e 2 moderados. O Colyseus chama `nanoid` com tamanho fixo nos pontos lidos | Baixa | Upgrade maior do Colyseus em PR próprio, com a bateria completa. Não usar `npm audit fix --force`. O alto (GHSA-xwg4-73v4-xw9w) só é explorável com `size` de 2^31 ou mais vindo do usuário |
| S6 | **`createAccount` e `createChar` tratam qualquer exceção como "já existe"** | Lido em `db.ts` | Baixa | Capturar só a violação de `UNIQUE` |
| S7 | **Sem CSP nem cabeçalhos de segurança**; sessão de 30 dias em `localStorage` | Nenhum cabeçalho em `http.ts`, `index.html` ou `deploy/Caddyfile` | Baixa | CSP no Caddy; manter o rigor de `escHtml` e `textContent` |
| S8 | **`main` sem proteção de branch** | API do GitHub: `protected: false`; proteção de branch e rulesets respondem 403 ("Upgrade to GitHub Pro or make this repository public"). Não consegui ler Dependabot nem varredura de segredos | Média | Plano pago, repositório público, ou combinado escrito mais hook `pre-push` local (F-07) |
| S9 | **Contêiner roda como root** | Executado: `id -un` devolveu `root` na imagem | Baixa | `USER node` no `Dockerfile`, com o volume `/data` acessível a ele |
| S10 | **Cliente real desconectado com modo Dev desligado.** O cliente envia `devHello` ao entrar; sem handler, o Colyseus desconecta com código 4002 | Executado: em produção e com `npm start`, o cliente caía ao entrar no mundo | Corrigido | **Corrigido em `fix/seguranca-servidor`.** `devHello` é sempre registrado no `WorldRoom`, mas só responde se `BI_DEV=1`. Teste: `server/test/e2e-seguranca.test.ts` |
| S11 | **Mensagem de rede `__proto__` derruba o processo.** `onMessageHandlers` do Colyseus é objeto comum com protótipo | Executado: envio de tipo `__proto__` lançava `TypeError` fora de try/catch e matava o servidor Node | Corrigido | **Corrigido em `fix/seguranca-servidor`.** `GameRoom` anula o protótipo: `Object.setPrototypeOf(onMessageHandlers, null)`. Teste: `server/test/e2e-seguranca.test.ts` |
| S12 | **`docker-compose.yml` com sintaxe YAML inválida.** Interpolação de `DOMINIO` com dois pontos sem aspas | `docker compose config` falhava com erro de mapeamento na linha 21 | Corrigido | **Corrigido em `fix/seguranca-servidor`.** Interpolação entre aspas e subnet fixa `172.28.0.0/24` na rede interna |

## 8. Qualidade de testes e CI

| ID | Item | Evidência | Prioridade | Situação |
| :-- | :--- | :--- | :--- | :--- |
| Q1 | Cenários `social` e `rebirth` falham aos sábados e domingos | CI do PR #2 (run 41209911669) e execução local em 31/10/2026: XP 66 em vez de 33 e 132 em vez de 66, por causa de `xpWeekend` | Alta | **Corrigido neste PR** (commit `test:`); 29 verificações dos dois cenários passam num sábado |
| Q2 | `sleep` fixo nos testes | 3 chamadas no Vitest e 213 nos cenários | Média | Trocar por `vi.waitFor` ou `once` ao mexer em cada teste (skill `testes-deterministicos`) |
| Q3 | Ruído `colyseus.js: onMessage() not registered` na saída do Vitest | Visto em `npm test` | Baixa | Registrar os tipos no helper |
| Q4 | CI sem `permissions` e com actions em tag móvel | Lido em `ci.yml` | Média | **Corrigido neste PR**: `contents: read`, SHAs fixados (v4.4.0) e `timeout-minutes: 25` |
| Q5 | Actions em Node 20 (aviso do GitHub: serão forçadas ao Node 24) | Anotação do run do PR #2 | Baixa | Subir para checkout v7 e setup-node v7 em PR próprio e conferir o CI |
| Q6 | `DEPLOY.md` diz que a imagem Docker nunca foi construída | Executado: ela constrói e responde 200 | Baixa | **Corrigido neste PR** (`DEPLOY.md`). Continua sem teste: HTTPS atrás do Caddy |
| Q7 | Hooks de commit | Nenhum hook ativo em `.git/hooks` | Baixa | Opcional: rodar `gitleaks` antes de cada commit |
| Q8 | CI sem varredura de segredos (`gitleaks` só roda se alguém lembrar) | Lido em `ci.yml` | Média | F-11: job de gitleaks com binário fixado e verificado por hash |
| Q9 | `ubuntu-latest` migra para o Ubuntu 26 (aviso do GitHub no run do PR #2) | Anotação do run 41209911669 | Baixa | F-11: fixar `ubuntu-24.04` |
| Q10 | CI testa Node 22 e o `Dockerfile` roda Node 24 | `ci.yml` e `Dockerfile`; typecheck, Vitest e a bateria completa passam nos dois (medido) | Baixa | F-11: matriz com os dois |

## 9. Desempenho

Números e método em [`baseline.md`](baseline.md). Skill: `performance-servidor`.

| ID | Item | Evidência | Prioridade |
| :-- | :--- | :--- | :--- |
| P1 | Reconstrução do ranking bloqueia o tick | `db.allChars()` com 1.000 personagens: p50 10,2 a 10,4 ms, máximo visto 15,7 ms, cerca de 10% de um tick de 100 ms (3 rodadas; ver baseline) | Baixa hoje; cresce com a base |
| P2 | Salvamento em lote é síncrono | `saveMany` de 200 saves: p50 1,40 a 1,43 ms, máximo 1,7 ms, a cada 10 s (banco em memória; disco soma o fsync) | Baixa hoje |
| P3 | Não há métrica da duração do tick | Nenhuma ocorrência no código | Média: sem ela, as demais são estimativas |
| P4 | Schema sem filtro e `broadcast` global | 33 `broadcast` no `WorldRoom` (31 antes do R-12, que soma o `chat` de lore e o `event`; os dois só saem na troca de fase de um evento); estado de todos os mapas vai a todos os clientes | Média, cresce com o número de jogadores |
| P5 | Um único JavaScript de 1,67 MB | Build do Vite avisa acima de 500 kB | Baixa |
