# Agentes — Bleach: Soul Survivor

Contrato único deste repositório. Claude, Antigravity, Kiro, Grok, Codex e Cursor carregam este arquivo. O mapa de quem lê o quê está em [`docs/governanca/harness.md`](docs/governanca/harness.md). Em conflito, este arquivo vence.

Não copie estas regras para `CLAUDE.md`, `GEMINI.md` ou steering. Esses arquivos são delta de harness. Duplicar faz o Grok e o Antigravity carregarem o contrato duas vezes.

## O jogo

Protótipo de survivor 2.5D no navegador (Three.js + Vite), arena de Karakura, sprites em billboard. A visão de produto da V1/V2 foi parar em [`docs/ROADMAP.md`](docs/ROADMAP.md). `ENTREGAS_ROADMAP.md` é só a ponte.

O histórico git mistura este protótipo com o jogo anterior `bleach-idle` (sete mapas, CI, deploy). Não "conserte" o CI para um `package.json` que você imaginou. Leia [`docs/aprendizados.md`](docs/aprendizados.md) item 3 antes.

## Comandos

| Comando | Para quê |
|---|---|
| `make dev` | Jogo local com Vite |
| `make build` | Build de produção |
| `make validate-sprites` | Altura, baseline e despill do Ichigo |
| `make docs-sync` | Recalcula o bloco de progresso do STATUS a partir das caixas do ROADMAP |
| `make docs-check` | Falha se pendência, aprendizado, progresso ou link relativo estiver incoerente |
| `make docs-test` | Testes do checker |

Não existe `npm test` nem `make check` de jogo. O workflow em `.github/workflows/ci.yml` ainda descreve o bleach-idle. Isso é a pendência 1, não um comando seu.

Mudança que o jogador vê se verifica jogando (`make dev`): clique, movimento, câmera, combate. Um screenshot parado não fecha o item.

## Docs vivos

Cada fato mora num arquivo. Os outros linkam.

| Arquivo | Papel |
|---|---|
| [`docs/STATUS.md`](docs/STATUS.md) | Fotografia de hoje. Sem histórico e sem plano |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | O que está aberto e a ordem. Caixa `[x]` é uma linha, o relato vai para o changelog |
| [`docs/pendencias.md`](docs/pendencias.md) | Dívida aberta. Resolvida sai daqui |
| [`docs/aprendizados.md`](docs/aprendizados.md) | Causa raiz que não era óbvia |
| [`docs/_arquivo/changelog-entregas.md`](docs/_arquivo/changelog-entregas.md) | Passado, com data |
| [`docs/README.md`](docs/README.md) | Índice. Arquivo novo em `docs/` entra aqui |
| [`docs/direcionamento/`](docs/direcionamento/01-engenharia-reversa-pokebonk.md) | Referência de câmera, mapa, sprite e FX. Não é plano |

Durante a sessão, no momento em que acontece:

- Pegadinha não óbvia: próximo `## N.` em `docs/aprendizados.md`, com `**Causa raiz:**` e `**Evidência:**`. O número é `max + 1` e não se reusa.
- Dívida que não cabe nesta branch: próximo `## N.` em `docs/pendencias.md`, com `**Impacto:**` (`alto`, `médio` ou `baixo`) e `**Por que não resolvido aqui:**`. O motivo contém uma destas frases: `fora do escopo`, `depende de terceiro`, `decisão de outra pessoa`, `falta evidência medida`. "Não tem relação" não é motivo.

Ao encerrar trabalho que mudou estado (código do jogo, caixa do roadmap, pendência, aprendizado):

1. Siga a skill `fechamento-sessao`.
2. Rode `make docs-sync` e `make docs-check`.
3. Não invente entrega. Caixa só vira `[x]` com evidência no changelog (comando, teste ou sessão de jogo).

Pedido de feature que ainda não está no código passa pela skill `triagem-pedido` antes de nascer arquivo novo.

## Invariantes

- Câmera orbital e billboard: [`docs/direcionamento/05-camera-orbital-movimento-e-billboard-360.md`](docs/direcionamento/05-camera-orbital-movimento-e-billboard-360.md). Personagem e hollow não giram no eixo errado "para ficar mais fácil".
- Sprite: [`docs/direcionamento/07-diretrizes-normalizacao-sprites-e-testes.md`](docs/direcionamento/07-diretrizes-normalizacao-sprites-e-testes.md). Quadro 128, pés na baseline, altura estável nas quatro vistas. Sem `make validate-sprites`, o sprite não entra em `src/assets/`.
- FX: configuração em `src/fx/`, não número mágico espalhado no loop. Ver [`docs/direcionamento/09-arquitetura-escalavel-fx-e-projeteis.md`](docs/direcionamento/09-arquitetura-escalavel-fx-e-projeteis.md).
- `src/main.js` já concentra o loop. Função nova nasce curta, com nome do que ela faz. Não abra um framework em volta do protótipo.

## Idioma

| Onde | Idioma |
|---|---|
| Conversa, `docs/`, este arquivo, skills | PT |
| Identificador e código novo | EN, no estilo do arquivo que você está editando |
| Comentário | O idioma do arquivo. Não traduza `src/main.js` inteiro numa passagem |
| Mensagem de commit | EN, Conventional Commits (`feat`, `fix`, `docs`, `refactor`, `test`) |

## Git

- Trabalho que vai commitar nasce fora do checkout principal, a partir de `main`: `orca worktree create --name <nome> --branch <prefixo/nome> --base-branch main --no-parent --json`. Sem Orca: `git worktree add -b <prefixo/nome> <caminho> main`.
- Não use `git add .`. Outra sessão pode ter deixado arquivo na árvore.
- Não reverta mudança que você não fez.
- Commit só quando o humano pedir.

## O que não fazer

- Não criar um segundo roadmap, status ou lista de pendências.
- Não marcar `[x]` porque o código "parece" ter a função. A frente 0 descreve o que já está em `src/main.js`. A frente 1 pede evidência de jogo.
- Não disparar deploy, VPS ou segredo. O job `deploy` do CI é do bleach-idle.
