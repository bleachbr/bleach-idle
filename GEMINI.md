# Antigravity — delta

O contrato é `AGENTS.md`, e este harness já o carrega junto com este arquivo. Não repita regras aqui.

- Skills: `.agents/skills/` (`fechamento-sessao`, `triagem-pedido`).
- Lembrete ao editar sprite: `.agents/rules/sprites.md` (glob). A norma continua em `docs/direcionamento/07-diretrizes-normalizacao-sprites-e-testes.md`.
- `.agents/hooks.json` injeta o estado no `SessionStart` com `injectSteps`. No `Stop`, aviso vira `decision: continue` e `reason`, e o loop reentra uma vez. Sem aviso, `decision: stop`. `executionNum` maior que 1 força o stop.
- Ao mudar estado do jogo ou da doc viva, rode a skill `fechamento-sessao`.
