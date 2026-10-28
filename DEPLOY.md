# Colocar o Bleach Idle online

Tudo o que o código precisa para ir ao ar já está pronto. O que falta é **contratar (ou conseguir de graça) um servidor e um domínio**: essa decisão é sua, e nada aqui foi contratado.

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
git clone https://github.com/rafael2267/bleach-idle.git && cd bleach-idle

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
npm start          # abre em http://localhost:2567
```

## O que ainda não foi testado
- **A imagem Docker não foi construída aqui:** o Docker não está instalado nesta máquina. O modo de produção sem Docker (`npm run build` + `npm start`) foi testado: página, mapas, manifesto, `/healthz`, backup e proteção contra caminhos com `..`.
- **Nunca rodou atrás de HTTPS de verdade:** o Caddy segue a configuração padrão dele, mas só vai ser exercitado no primeiro deploy.

## Antes de abrir para o público (não é obrigatório para testar com amigos)
- **Senha:** recuperação por e-mail (hoje não existe).
- **Abuso:** limite de criação de contas por IP (existe só para tentativas de login) e moderação de chat (silenciar, banir).
- **Jogo:** balanceamento dos mapas mais avançados.
- **Direitos:** sem monetização, o risco de direitos autorais (Bleach é da Shueisha) é baixo; com monetização, espere pedidos de remoção.
