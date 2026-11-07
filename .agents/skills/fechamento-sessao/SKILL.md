---
name: fechamento-sessao
description: >
  Atualiza STATUS, ROADMAP, pendências, aprendizados e o changelog quando uma
  sessão muda o jogo ou a doc viva. Use ao encerrar trabalho, fechar a sessão,
  marcar entrega, resolver pendência, registrar aprendizado, ou quando src/ ou
  geradores/ mudou e o roadmap ainda não. Também para "atualizar o roadmap".
---

# Fechamento de sessão

O papel de cada arquivo está em `AGENTS.md`. Aqui é a ordem. Não abra os docs inteiros se um `grep` acha o trecho.

## 1. Olhe o diff, não a memória

`git status --short` e `git diff --stat`. Responda:

- Alguma pendência em `docs/pendencias.md` foi resolvida?
- O estado observável mudou (loop, sprite publicado, FX, mapa, comando que o humano usa)?
- Alguma caixa de `docs/ROADMAP.md` avançou, com evidência?
- Surgiu causa raiz não óbvia?
- Surgiu dívida que não cabe nesta branch?
- Nasceu arquivo em `docs/`?

Se todas forem não, pare. Não invente atualização.

## 2. Escreva, nesta ordem

1. Pendência resolvida: entrada `## YYYY-MM-DD` no topo de `docs/_arquivo/changelog-entregas.md`, com o que foi medido. Apague o item e não reuse o número.
2. Dívida nova: próximo `## N.` em `docs/pendencias.md`, com `**Impacto:**` e `**Por que não resolvido aqui:**` contendo `fora do escopo`, `depende de terceiro`, `decisão de outra pessoa` ou `falta evidência medida`.
3. Pegadinha: próximo `## N.` em `docs/aprendizados.md`, com `**Causa raiz:**` e `**Evidência:**`.
4. Estado mudou: edite a seção afetada de `docs/STATUS.md` e a data `**Última atualização:** YYYY-MM-DD`. O antes/depois fica no changelog, não no STATUS.
5. Roadmap avançou: marque `[x]` numa linha e aponte o changelog. Atualize a data do ROADMAP. Caixa sem evidência não marca.
6. Arquivo novo em `docs/`: linha em `docs/README.md`.

## 3. Feche a conta

```bash
make docs-sync
make docs-check
```

`docs-sync` reescreve só o bloco entre `<!-- docs:progress:start -->` e `<!-- docs:progress:end -->`. Não edite esse bloco à mão.

Se o check falhar, corrija o que ele imprimir antes de dizer que a sessão fechou.
