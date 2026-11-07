---
trigger: glob
description: Lembrete de normalização ao editar geradores ou assets publicados
globs: geradores/**/*, src/assets/**/*
---

# Sprites

Antes de mudar escala, baseline ou despill, leia `docs/direcionamento/07-diretrizes-normalizacao-sprites-e-testes.md`. O gate é `make validate-sprites`. Sem esse comando, o atlas não entra em `src/assets/`.

A causa de encolher ao virar de costas está no aprendizado 1 de `docs/aprendizados.md`. Não duplique os números da norma neste arquivo.
