# Colocar o Bleach Idle online

Há dois caminhos: o Compose original com Caddy para uma VPS exclusiva, ou o deploy abaixo para a VPS compartilhada com Nginx. Não execute o Compose original na VPS compartilhada: ele tenta ocupar as portas 80 e 443.

## VPS compartilhada: bleach.acoplum.com

O job `deploy` de `.github/workflows/ci.yml` roda apenas em push na `main`, depois do job `test` aprovado. PRs não recebem credenciais de deploy. O runner constrói a imagem, envia por SSH e chama `/opt/bleach-idle/deploy.sh` com o SHA do commit. A VPS não precisa acessar o repositório privado nem receber token do GitHub.

Configure nos Actions secrets do repositório GitHub os secrets `VPS_HOST`, `VPS_USER`, `VPS_PORT` (opcional, padrão 22), `VPS_SSH_KEY` e `VPS_KNOWN_HOSTS`. Use uma chave dedicada; valide a identidade SSH da VPS por um canal confiável antes de cadastrar `VPS_KNOWN_HOSTS`. O usuário precisa escrever em `/opt/bleach-idle` e `/var/lock/bleach-deploy.lock` e executar Docker. Acesso ao Docker equivale a acesso administrativo: não trate o grupo `docker` como isolamento de privilégios.

`deploy/compose.vps.yml` mantém somente o jogo em `127.0.0.1:2567`, no projeto Compose `bleach`, com rede `bleach-interna` e volume persistente `bleach-dados`. O script descobre o gateway dessa rede para `TRUST_PROXY`. O Nginx sobrescreve `X-Forwarded-For` com o IP da conexão, em vez de aceitar um IP escolhido pelo cliente. Não há CDN prevista nessa configuração.

O primeiro provisionamento é manual e requer revisão: criar o virtual host exclusivo, validar DNS e emitir certificado para `bleach.acoplum.com` e `www.bleach.acoplum.com`. `deploy/nginx.conf` é a configuração final e pressupõe certificado existente em `/etc/letsencrypt/live/bleach.acoplum.com/`. O desafio ACME usa `/var/www/bleach-acme`; mantenha a renovação com Certbot e um hook de reload após `nginx -t`. Nunca sobrescreva um virtual host alheio.

O workflow não altera Nginx nem certificados. Deploys são serializados, esperam o healthcheck do container e verificam `/healthz` por HTTPS. Falha não restaura automaticamente uma imagem antiga: mudanças futuras no esquema SQLite podem tornar rollback incompatível. O marcador `/opt/bleach-idle/deployed-revision` só é gravado após o healthcheck do container. Há desconexão breve de jogadores durante a recriação.

Banco e backups ficam em `/data` no volume `bleach-dados`; não use `docker compose down -v`. As imagens anteriores permanecem na VPS; monitore o disco e remova apenas versões explicitamente escolhidas. Backups no mesmo volume não substituem cópia externa.

Primeiro deploy realizado após revisão independente e autorização humana: `https://bleach.acoplum.com` responde 200; `https://www.bleach.acoplum.com` redireciona para o endereço principal. HTTP redireciona para HTTPS e o handshake WebSocket por TLS foi aceito. O container está saudável, com porta somente em loopback e volume `bleach-dados`. Os 24 arquivos de sites existentes mantiveram os mesmos hashes, e o laboratório cripto manteve a resposta 401 esperada. Não houve restart de serviços existentes, apenas reload validado do Nginx.

A versão inicial da aplicação é `57e181ad5bee0f40630dae480297374e95ce6399` (a `main` local naquele momento; a configuração de deploy vem desta branch). O build inicial foi nativo na VPS, com builder legado limitado a 1 CPU e 1,5 GB, após o esbuild falhar sob emulação amd64 no Mac ARM. Os próximos builds usam o runner nativo amd64 do GitHub; não dependem do builder legado da VPS.

O certificado cobre os dois nomes e vence em 29/01/2027. `certbot.timer` está ativo e habilitado; a renovação usa webroot, com o hook exclusivo `/etc/letsencrypt/renewal-hooks/deploy/bleach-nginx.sh` (fonte: `deploy/renew-certificate.sh`). O hook valida o Nginx antes de recarregar e só age no certificado do Bleach. O bootstrap HTTP usado antes da emissão está em `deploy/nginx.bootstrap.conf`. A simulação `certbot renew --cert-name bleach.acoplum.com --dry-run --non-interactive` passou. Esta versão do Certbot não aceita `--run-deploy-hooks`, então o hook foi executado separadamente com `RENEWED_LINEAGE` do Bleach; a validação e o reload passaram, preservando os hashes dos outros sites.

Usuário `bleach-deploy` com chave dedicada autorizado na VPS e os cinco Actions secrets cadastrados. A chave foi testada com verificação estrita do host e acesso ao Docker. A chave de host cadastrada foi obtida do `known_hosts` local já utilizado pela conexão SSH; falta conferir o fingerprint por console do provedor. O usuário tem acesso administrativo equivalente por pertencer ao grupo Docker; a opção `restrict` em `authorized_keys` desliga encaminhamentos e PTY, mas não limita comandos remotos. O lock de deploy é recriado após reboot por `/etc/tmpfiles.d/bleach-deploy.conf`.

O workflow de produção só será ativado quando estas alterações chegarem à `main`; publicar a branch e abrir o PR não dispara deploy. O PR leva somente a infraestrutura de deploy, sem os dez commits exclusivos da `main` local usados na versão inicial da VPS. O primeiro deploy automático usará o código da `main` remota após o merge, que pode diferir da versão inicialmente publicada. Ainda faltam execução real pelo GitHub Actions, teste de persistência entre recriações, restauração de backup em ambiente isolado e cópia externa dos backups.

## Como o jogo roda em produção
- **Um processo só** (`npm start` ou o container): serve a página do jogo (`client/dist`), o WebSocket do servidor e o `/healthz` na mesma porta (2567).
- **HTTPS:** o [Caddy](https://caddyserver.com/) do `docker-compose.yml` pede e renova o certificado sozinho (Let's Encrypt, grátis) e repassa tudo ao jogo. Sem HTTPS a senha trafega aberta, então não publique sem ele.
- **Banco:** SQLite em `/data/bleach-idle.sqlite`, dentro do volume `dados`.
- **Backups:** automáticos a cada 6 h em `/data/backups`, guardando os 28 últimos (1 semana). Copie essa pasta para fora do servidor de vez em quando.
- **Hunt offline:** o processo precisa ficar ligado 24 h. Se ele reiniciar, quem estava caçando volta a caçar sozinho.

### Variáveis de ambiente
| Variável | Padrão | Para quê |
|---|---|---|
| `PORT` | 2567 | porta HTTP + WebSocket |
| `DB_FILE` | `bleach-idle.sqlite` (container: `/data/bleach-idle.sqlite`) | arquivo do banco |
| `STATIC_DIR` | `client/dist` | pasta do cliente pronto |
| `BACKUP_DIR` | sem backup (container: `/data/backups`) | onde salvar os backups |
| `BACKUP_HOURS` / `BACKUP_KEEP` | 6 / 28 | intervalo e quantidade |
| `DOMINIO` | (obrigatório no compose) | domínio para o HTTPS |
| `EXP_RATE` | 1 | taxa de XP dos monstros (0,3 = 30%); simule antes com `server/scripts/balance.ts` |
| `INVASION_FIRST_MS` / `INVASION_EVERY_MS` | 30 min / 3 h | quando começa a primeira invasão de Hollows e o intervalo entre elas |
| `LOGIN_MAX_FAILS_IP` | 30 | senhas erradas por IP antes do bloqueio de 1 min |
| `REGISTER_MAX_IP` | 5 | contas novas criadas pelo mesmo IP por janela de 1 h |
| `TRUST_PROXY` | desligado (o `docker-compose.yml` define `172.28.0.0/24`) | lista de CIDRs confiáveis (separados por vírgula). Atrás do Caddy, conta as tentativas pelo IP real (`X-Forwarded-For`) só quando a conexão vem dessa rede. Só ligue se o jogo não for alcançável direto da internet |
| `BI_DEV` | desligado | `1` liga o modo Dev (nível, kan e itens de graça). Só para desenvolvimento: nunca em produção |

## Opções de servidor (preços conferidos em out/2026; confira antes de contratar)
| Opção | Custo | Observações |
|---|---|---|
| **Oracle Cloud Always Free** (ARM Ampere A1) | R$ 0 | Em 2026 o limite grátis caiu para 2 OCPU e 12 GB de RAM no total, o que ainda sobra para o jogo. Pede cartão para verificar a conta. Às vezes dá "Out of host capacity" ao criar a máquina ([InfoQ](https://infoq.com/news/2026/07/oracle-cloud-free-tier-limits/), [terminalbytes](https://terminalbytes.com/oracle-cloud-free-tier-changes-2026)). |
| **Hetzner Cloud CX23** (2 vCPU, 4 GB) | ~€ 5,49/mês + impostos | Simples e estável. Os preços subiram em 2026 ([makerstack](https://makerstack.co/reviews/hetzner-review/), [agentdeals](https://agentdeals.dev/hetzner-pricing-2026)). |

**Domínio:** dá para começar com um subdomínio grátis do [DuckDNS](https://www.duckdns.org/) (ex.: `bleach-idle.duckdns.org`; o HTTPS funciona com ele) e depois trocar por um próprio (um `.com.br` custa cerca de R$ 40 por ano).

**Minha recomendação:** comece com a Oracle grátis + DuckDNS. Se faltar capacidade ou a conta der trabalho, a Hetzner é o plano B barato.

## Passo a passo (servidor Linux com Docker)
```bash
# 1. no servidor: instalar Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh

# 2. baixar o jogo (repositório privado: use um token ou chave de deploy do GitHub)
git clone https://github.com/bleachbr/bleach-idle.git && cd bleach-idle

# 3. apontar o domínio para o IP do servidor (no DuckDNS ou no seu provedor) e subir
DOMINIO=seu-dominio.duckdns.org docker compose up -d --build

# 4. conferir
curl https://seu-dominio.duckdns.org/healthz
```
Libere no firewall do provedor só as portas **22** (SSH), **80** e **443**.

**Atualizar o jogo:** `git pull && DOMINIO=... docker compose up -d --build`. Os jogadores conectados caem por alguns segundos, e quem estava em hunt offline volta a caçar sozinho.

**Ver os logs:** `docker compose logs -f jogo`.

**Restaurar um backup:** pare o jogo (`docker compose stop jogo`), copie o backup escolhido por cima de `/data/bleach-idle.sqlite` dentro do volume e suba de novo.

## Rodar o modo de produção na sua máquina (sem Docker)
```bash
npm install
npm run build
NODE_ENV=production npm start   # abre em http://localhost:2567
```

## O que ainda não foi testado
- **A imagem Docker atual foi testada em contêiner descartável:** roda como `node` (não-root), grava SQLite e backups em volume novo e responde aos endpoints esperados. A imagem inicial da VPS ainda roda como root; o volume existente precisa de validação de permissões antes da atualização. Não altere permissões de dados sem autorização específica.
- **HTTPS real validado com Nginx em 31/10/2026:** página, manifesto, `/healthz`, redirecionamentos e handshake WebSocket TLS responderam como esperado. O caminho alternativo com Caddy permanece sem teste de produção.

## Antes de abrir para o público (não é obrigatório para testar com amigos)
- **Senha:** recuperação por e-mail (hoje não existe).
- **Abuso:** moderação de chat (silenciar, banir). O limite de criação de contas por IP (`REGISTER_MAX_IP`, 5/h) já está ativo.
- **Jogo:** balanceamento dos mapas até o nível 150 (`lasnoches`, `falsa`, `wandenreich`) calibrado e validado via `server/scripts/balance.ts` e `server/test/balance-progression.test.ts`.
- **Direitos:** sem monetização, o risco de direitos autorais (Bleach é da Shueisha) é baixo; com monetização, espere pedidos de remoção.
