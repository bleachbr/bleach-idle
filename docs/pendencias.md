# Pendências

Dívida aberta. Item resolvido sai daqui e vira entrada em [_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md). O número não se reusa.

**Última atualização:** 2026-11-08

Registrar aqui é a saída, não o default. Antes, tente resolver na branch aberta. O motivo precisa conter uma destas frases: `fora do escopo`, `depende de terceiro`, `decisão de outra pessoa`, `falta evidência medida`.

## 3. Teste de jogo não é alvo

**Impacto:** médio (regressão de câmera, sprite e FX só aparece se alguém lembrar do script)

**Por que não resolvido aqui:** falta evidência medida — `scratch/` está no `.gitignore`, então não dá para promover aqueles scripts a gate sem ver o que eles exigem de browser e de asset local. O `make validate-sprites` cobre uma fatia (Ichigo, altura, baseline, despill) e não o loop.

Não abrir um segundo checklist para isto no roadmap: é a caixa correspondente da frente 3.
