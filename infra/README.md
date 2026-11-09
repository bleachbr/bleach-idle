# Infra — deploy na VPS

Este repo assume o lugar do `bleach-idle` em `https://bleach.acoplum.com`. Nada aqui dispara deploy: são os arquivos e o registro do que roda na VPS.

## Como o jogo chega lá

| Peça | bleach-idle (antes) | bleach-soul-survivor (agora) |
|---|---|---|
| Imagem | `bleach-idle:<sha>`, Node + Colyseus + SQLite | `bleach-soul-survivor:<sha>`, nginx servindo o `dist` do Vite |
| Porta no host | `127.0.0.1:2567` | `127.0.0.1:2567` (igual) |
| Estado | volume `bleach-dados` | nenhum: o jogo não tem servidor |
| Diretório na VPS | `/opt/bleach-idle` (raiz do serviço do jogo na VPS) | `/opt/bleach-idle` |
| Projeto compose, serviço, rede | `bleach`, `jogo`, `bleach-interna` | iguais: o `up` troca o container |
| Lock | `/var/lock/bleach-deploy.lock` | o mesmo, para os dois nunca subirem juntos |
| nginx do host + certbot | `deploy/nginx.conf` | sem mudança (`nginx.host.conf` é só referência) |
| Healthcheck | `/healthz` | `/healthz` (igual) |

Como a porta, o domínio e o certificado não mudam, o corte é trocar o container. O nginx do host não recarrega.

## Arquivos

| Arquivo | Onde roda | Papel |
|---|---|---|
| `../Dockerfile` | CI / sua máquina | Build do Vite + nginx sem root na 2567 |
| `nginx.container.conf` | dentro da imagem | Estáticos, cache de `/assets/`, `/healthz` |
| `compose.vps.yml` | VPS | Sobe o container em `127.0.0.1:2567` |
| `deploy.sh` | VPS | Trava, valida a imagem, `compose up --wait`, grava `deployed-revision` |
| `nginx.host.conf` | referência | Cópia do nginx do host, igual ao do bleach-idle |

## Deploy na VPS

Acesso: `bleach-deploy@69.62.95.136` com a chave `~/.ssh/bleach_github_deploy_ed25519`. Em Mac arm64 use `--platform linux/amd64`; o estágio de build do Dockerfile é nativo de propósito (esbuild quebra sob qemu).

Da raiz do repositório (`/Users/wjunior/projetos/outros/cursos-online-treinamento/v3/bleach-idle`), com o SHA do commit a publicar:
```bash
SHA=$(git rev-parse HEAD)
docker build --platform linux/amd64 -t "bleach-soul-survivor:$SHA" .
docker save "bleach-soul-survivor:$SHA" | gzip | ssh bleach-deploy@69.62.95.136 'gunzip | docker load'
tar -C infra -czf - compose.vps.yml deploy.sh | ssh bleach-deploy@69.62.95.136 'tar -xzf - -C /opt/bleach-idle'
ssh bleach-deploy@69.62.95.136 "bash /opt/bleach-idle/deploy.sh $SHA"
curl --fail https://bleach.acoplum.com/healthz
```

Abra o domínio `https://bleach.acoplum.com` e jogue: o menu, o movimento, áudio e o combate têm que responder. `healthz` verde não prova isso por si só.

## Rollback

- Entre revisões deste jogo: `bash /opt/bleach-idle/deploy.sh <sha anterior>`. A imagem antiga continua na VPS.

## CI

O job `deploy` do `.github/workflows/ci.yml` aponta para `/opt/bleach-idle` e envia `infra/compose.vps.yml` e `infra/deploy.sh`. Os secrets `VPS_*` são os mesmos.

## Registro de deploys

| Data | SHA | Quem | Observação |
|---|---|---|---|
| 2026-11-09 | `69c5065e07015ebec45e1390a097a369f3612a15` | wjunior (via agente) | Kit completo de animações do personagem principal (Ichigo Shikai): 22 clipes direcionais, sprite sheets dinâmicos, integração com máquina de estados de animação e movimentação (#357). Validado em produção (`https://bleach.acoplum.com`). |
| 2026-11-08 | `ff80b9f17ab86ddc7866eceec27e1179cce01d0c` | wjunior (via agente) | Calibração de Volume da Trilha Sonora: redução do volume padrão de 0.45 para 0.20 (redução de ~55%), evitando fadiga auditiva e balanceando BGM com efeitos de combate. Testes unitários atualizados com asserções numéricas de volume (66/66 verdes). Validado em produção (`https://bleach.acoplum.com`). |
| 2026-11-08 | `0312adfc4adfb73a5a87ba19e4875323fa34c281` | wjunior (via agente) | Trilha Sonora Oficial: música na tela de login (All Bleach Openings em loop com desbloqueio de autoplay), silêncio no Prólogo do Dangai, música de batalha Number One no Hueco Mundo (1 execução, sem repetição), servimento de MP3 via Nginx na porta 2567 e 3 testes unitários novos em scripts/test_runtime_safety.py (66/66 verdes). Validado em produção (`https://bleach.acoplum.com`). |
| 2026-11-08 | `ca4f0fd0c793ea5eec592231e679b38466b732fb` | wjunior (via agente) | Reposicionamento canônico da Lua diretamente ao Norte ($X=0, Y=38, Z=-175$) baixa no horizonte com imunidade à neblina (`fog: false`), transição cinemática com recuo da Rukia e corrida do jogador para dentro do portal Senkaimon, e 4 novos testes de proteção em `scripts/test_runtime_safety.py` integrados a `make test` (57/57 verdes). Validado em produção (`https://bleach.acoplum.com`). |
| 2026-11-08 | `271983a48e7fbe2fc596db8935c6fe29b6f3c1fe` | wjunior (via agente) | Hotfix de inicialização: corrigidas referências remanescentes em exposeDebugInterface e handleEscapeKey após extração para levelup.js, restaurando montagem e exibição do mapa e da cena 3D. Validado em produção (`https://bleach.acoplum.com`). |
| 2026-11-08 | `e001a6489489d845d8a39408eaf5d755f4df5349` | wjunior (via agente) | Sobrevivência Infinita (Endless Survivor Loop), temporizador de auto-escolha de 10s no Level-Up, expansão 4x do Hueco Mundo com dunas/floresta/lua/estrelas, modo AFK com camuflagem espiritual e agro dinâmico por Pressão Espiritual (Reiatsu). Validado em produção (`https://bleach.acoplum.com`). |
| 2026-11-08 | `560c15f6b0f66eff779113d457dd9d9e47e1226e` | wjunior (via agente) | Início da jornada no Dangai com esteira de corrida infinita (treadmill runner), travamento de controles do jogador durante o briefing da Rukia, passadas a 10 FPS e transição Senkaimon para Hueco Mundo. Validado em produção (`https://bleach.acoplum.com`). |
| 2026-11-08 | `b28383a93fb0992a9bb3c8e619e29ca17aeff48c` | wjunior (via agente) | Calibração de câmera (distância inicial mais próxima = 10.0, clamp [8.0, 14.0]) e aumento da proporção heroica do personagem para 2.35x2.35. Validado em produção. |
| 2026-11-08 | `39e80ac97284d8f4699d2854214f6d938ded3636` | wjunior (via agente) | Atualização com Prólogo no Dangai (DG), briefing animado com Rukia Kuchiki, transição Senkaimon, Hollows V1 (Fishbone e Elite), joystick virtual mobile, Hall da Fama / Leaderboard global e clamping de câmera PokéBonk. Validado via Playwright em produção (`https://bleach.acoplum.com`). |
| 2026-11-07 | `7c0e4c8a5601e83d42a56ec65abd21c7d79f0298` | wjunior (via agente) | Primeiro corte. Substituiu o bleach-idle `02f4c97302bb80f6a37200121b2350c89f7df22f`, que segue na VPS (imagem e volume `bleach-dados`) para rollback. Imagem buildada da árvore de trabalho com mudanças não commitadas, então o SHA não reproduz a imagem. Esse primeiro build saiu sem sprites (aprendizado 10); corrigido no mesmo dia e republicado com o mesmo SHA. Texturas conferidas pelo domínio (`image/png`). Jogo ainda não jogado em navegador |
