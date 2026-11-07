# Pendências

Dívida aberta. Item resolvido sai daqui e vira entrada em [_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md). O número não se reusa.

**Última atualização:** 2026-11-07

Registrar aqui é a saída, não o default. Antes, tente resolver na branch aberta. O motivo precisa conter uma destas frases: `fora do escopo`, `depende de terceiro`, `decisão de outra pessoa`, `falta evidência medida`.

## 1. O CI ainda descreve o bleach-idle

**Impacto:** alto (todo push em `main` dispara jobs que este `package.json` não cumpre)

**Por que não resolvido aqui:** fora do escopo — esta entrega instala a governança dos agentes. Aposentar ou reescrever o workflow decide o que acontece com o histórico `bleach-idle`, e isso não é decisão desta branch.

O job `test` roda `npm run typecheck`, `npm test` e `npm run test:scripts`. O job `e2e` espera o workspace `e2e` e o cenário dos sete mapas. O job `deploy` publica a imagem `bleach-idle` num VPS. O `package.json` do protótipo só declara `dev`, `build` e `preview`. O job `docs` acrescentado em 2026-11-07 não substitui esses três.

## 2. Dockerfile vazio

**Impacto:** médio (`make docker-build` não produz imagem)

**Por que não resolvido aqui:** fora do escopo — o alvo do Makefile e o job de deploy apontam para uma imagem que este protótipo ainda não empacota. Empacotar sem decidir a porta e o conteúdo estático seria chute.

O `Dockerfile` na raiz tem tamanho zero. `make docker-run` publica a porta 5173 em cima dessa imagem.

## 3. Teste de jogo não é alvo

**Impacto:** médio (regressão de câmera, sprite e FX só aparece se alguém lembrar do script)

**Por que não resolvido aqui:** falta evidência medida — `scratch/` está no `.gitignore`, então não dá para promover aqueles scripts a gate sem ver o que eles exigem de browser e de asset local. O `make validate-sprites` cobre uma fatia (Ichigo, altura, baseline, despill) e não o loop.

Não abrir um segundo checklist para isto no roadmap: é a caixa correspondente da frente 3.
