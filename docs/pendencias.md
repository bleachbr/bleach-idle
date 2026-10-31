# Pendências e Débitos Técnicos Registrados

Este documento mapeia todas as pendências conhecidas, limitações da arquitetura atual e débitos técnicos acumulados no **Bleach Idle**.

---

## 1. Sistema de NPCs e Eventos Narrativos ⚠️ (Prioridade Atual)

| Item | Situação Atual | Impacto / Necessidade |
| :--- | :--- | :--- |
| **Suporte a Múltiplos NPCs no Mapa** | O mapa Tiled só reconhece o tipo `loja` com sprite único `npc_shop`. | Não é possível posicionar capitães, tenentes ou instrutores com visual e falas próprias no Seireitei ou outras cidades. |
| **Diálogos e Árvores de Conversa** | Ao interagir com a loja, abre diretamente o menu do Kisuke. | Falta um sistema de balões/janela de diálogo com opções de resposta, lore e ativação de eventos. |
| **Eventos Semanais da Lore de Bleach** | Apenas invasões de Hollows (a cada 3h) e Chefe Mundial (a cada 2h) estão programados. | Criar um gerenciador de rotação semanal que exiba eventos históricos (Invasão de Karakura, Traição no Soukyoku, Resgate de Rukia, etc.). |

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
| **Migração Completa para Vitest** | O projeto possui 76 testes rápidos no Vitest e 31 scripts de integração em `server/scripts/test.ts`. | Consolidar os 31 cenários legados no Vitest para unificar a execução em um único runner padronizado. |
| **Testes de Interface (Playwright)** | O cliente Phaser 3 não possui testes de regressão visual ou de cliques automatizados. | Implementar testes E2E com Playwright para validar a tela de login, menus e HUD. |

---

## 7. Segurança e integridade (verificado em 31/10/2026)

Cada item foi reproduzido num servidor isolado (porta própria, banco temporário) ou lido no código, como indicado. Nenhum foi corrigido neste PR: são mudanças em código de produção, que merecem PR próprio (`fix/seguranca-servidor`). Checklist de revisão: skill `seguranca-servidor`.

| ID | Item | Evidência | Prioridade | Correção proposta |
| :-- | :--- | :--- | :--- | :--- |
| S1 | **Modo Dev ligado por omissão.** `DEV_MODE` em `WorldRoom.ts` liga quando `NODE_ENV` não é `production` | Executado: servidor iniciado sem `NODE_ENV` respondeu à mensagem `dev` com "nível 300" e "+1.000.000 kan"; com `production`, o handler não existe. O `Dockerfile` define `production`; README e DEPLOY.md mandam `npm start` fora do Docker | Alta | Ligar só com `BI_DEV=1`. Exportar `BI_DEV=1` em `server/scripts/test.ts` (os cenários `dev` e `endgame` dependem do handler) |
| S2 | **Chaves de protótipo aceitas.** `CHARS[m?.charId]` e outras buscas em objeto comum | Executado: `create` com `constructor`, `__proto__`, `toString` e `hasOwnProperty` cria personagem; entrar com ele falha; `shopBuy` lança `NOT NULL constraint failed: wallets.crystals`; `questAccept` com `constructor` aceita a missão "Object". Servidor segue vivo | Média | `Object.hasOwn` antes de indexar; teste de regressão por handler |
| S3 | **Limite de login por IP é compartilhado atrás do proxy.** `auth.ts` usa o IP da conexão | Executado: 30 falhas de logins diferentes e o pedido seguinte de outra pessoa levou 429. Não testado com o Caddy; pelo código ele não repassa o IP real ao jogo | Média | Ler `X-Forwarded-For` só de proxy confiável |
| S4 | **Cristais por personagem, carteira por conta.** Diária e conquistas | Diária executada: 2 personagens da mesma conta, saldo 5 depois 10. Conquistas lidas no código. Limite de 5 personagens por conta | Decisão de design | Travar por conta ou aceitar o multiplicador (afeta as Crônicas Semanais) |
| S5 | **Dependência com advisory alto** (`nanoid`, via Colyseus 0.15) | `npm audit --omit=dev`: 1 alto e 2 moderados. O Colyseus chama `nanoid` com tamanho fixo nos pontos lidos | Baixa | Upgrade maior do Colyseus em PR próprio, com a bateria completa. Não usar `npm audit fix --force` |
| S6 | **`createAccount` e `createChar` tratam qualquer exceção como "já existe"** | Lido em `db.ts` | Baixa | Capturar só a violação de `UNIQUE` |
| S7 | **Sem CSP nem cabeçalhos de segurança**; sessão de 30 dias em `localStorage` | Nenhum cabeçalho em `http.ts`, `index.html` ou `deploy/Caddyfile` | Baixa | CSP no Caddy; manter o rigor de `escHtml` e `textContent` |
| S8 | **`main` sem proteção de branch** | API do GitHub: `protected: false`. Não consegui ler Dependabot nem varredura de segredos | Média | Exigir CI verde e uma revisão antes do merge |
| S9 | **Contêiner roda como root** | Executado: `id -un` devolveu `root` na imagem | Baixa | `USER node` no `Dockerfile`, com o volume `/data` acessível a ele |

## 8. Qualidade de testes e CI

| ID | Item | Evidência | Prioridade | Situação |
| :-- | :--- | :--- | :--- | :--- |
| Q1 | Cenários `social` e `rebirth` falham aos sábados e domingos | CI do PR #2 (run 41209911669) e execução local em 31/10/2026: XP 66 em vez de 33 e 132 em vez de 66, por causa de `xpWeekend` | Alta | **Corrigido neste PR** (commit `test:`); 29 verificações dos dois cenários passam num sábado |
| Q2 | `sleep` fixo nos testes | 3 chamadas no Vitest e 213 nos cenários | Média | Trocar por `vi.waitFor` ou `once` ao mexer em cada teste (skill `testes-deterministicos`) |
| Q3 | Ruído `colyseus.js: onMessage() not registered` na saída do Vitest | Visto em `npm test` | Baixa | Registrar os tipos no helper |
| Q4 | CI sem `permissions` e com actions em tag móvel | Lido em `ci.yml` | Média | **Corrigido neste PR**: `contents: read`, SHAs fixados (v4.4.0) e `timeout-minutes: 25` |
| Q5 | Actions em Node 20 (aviso do GitHub: serão forçadas ao Node 24) | Anotação do run do PR #2 | Baixa | Subir para checkout v7 e setup-node v7 em PR próprio e conferir o CI |
| Q6 | `DEPLOY.md` diz que a imagem Docker nunca foi construída | Executado: ela constrói e responde 200 | Baixa | Atualizar o `DEPLOY.md`. Continua sem teste: HTTPS atrás do Caddy |
| Q7 | Hooks de commit | Nenhum hook ativo em `.git/hooks` | Baixa | Opcional: rodar `gitleaks` antes de cada commit |

## 9. Desempenho

Números e método em [`baseline.md`](baseline.md). Skill: `performance-servidor`.

| ID | Item | Evidência | Prioridade |
| :-- | :--- | :--- | :--- |
| P1 | Reconstrução do ranking bloqueia o tick | `db.allChars()` com 1.000 personagens: p50 26 ms, p99 57 ms (tick de 100 ms) | Média, cresce com a base |
| P2 | Salvamento em lote é síncrono | `saveMany` de 200 saves: p50 5,5 ms, p99 17,5 ms, a cada 10 s | Baixa hoje |
| P3 | Não há métrica da duração do tick | Nenhuma ocorrência no código | Média: sem ela, as demais são estimativas |
| P4 | Schema sem filtro e `broadcast` global | 31 `broadcast` no `WorldRoom`; estado de todos os mapas vai a todos os clientes | Média, cresce com o número de jogadores |
| P5 | Um único JavaScript de 1,67 MB | Build do Vite avisa acima de 500 kB | Baixa |
