# Changelog de entregas

Passado. A entrada nova fica no topo. Número de pendência ou de aprendizado que aparecer aqui já saiu do arquivo aberto, ou ainda está aberto e o texto diz isso.

## 2026-11-07

Governança de agentes para Claude, Antigravity, Kiro e Grok. O contrato único é `AGENTS.md`. `CLAUDE.md` e `GEMINI.md` são delta. Skills canônicas em `.agents/skills/`, com symlink só para `.claude/skills` e `.kiro/skills`. Grok e Antigravity leem `.agents/skills` direto.

`docs/ROADMAP.md` passou a ser a fonte do plano executável. `ENTREGAS_ROADMAP.md` guarda a visão de produto e aponta para esse roadmap, sem caixa. `make docs-sync` reescreve o bloco de progresso do STATUS. `make docs-check` reprova numeração, motivo de pendência, bloco divergente e link relativo quebrado. O job `docs` do CI roda o teste do checker e o check.

Oito links `file://` absolutos em `docs/direcionamento/` (05, 06, 08 e 09) viraram caminho relativo. O check reprova `file:` daqui em diante. Aprendizado 4.

O Stop do Claude não injeta texto puro. O hook desse evento usa `--format claude-stop` (`hookSpecificOutput.additionalContext`) e fica mudo quando o stdin traz `stop_hook_active: true`. O SessionStart continua em texto puro. Aprendizado 5.

O Stop do Antigravity ignora `injectSteps`. Esse evento usa `--format antigravity-stop`: `decision: continue` e `reason` quando há aviso, `decision: stop` quando não há, e `decision: stop` de novo se `executionNum` é maior que 1. O `SessionStart` continua com `injectSteps`. Aprendizado 6.

A frente 1 separou a partida jogada do menu. O reinício que existe é `location.reload()` no `btn-restart`. Menu de início e volta ao menu é outra caixa, aberta. Nenhuma caixa da frente 1 foi marcada. O código da frente 0 já estava em `main` antes desta entrega.
