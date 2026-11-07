# Claude Code — delta

O contrato é [`AGENTS.md`](AGENTS.md). A linha abaixo é import do Claude Code. Harness que não expande `@` ignora a linha: ele já carregou `AGENTS.md` sozinho. Não repita regras aqui.

@AGENTS.md

## Só neste harness

- `.claude/settings.json` roda `scripts/docs/session_hint.py` no `SessionStart` (texto puro, que entra no contexto) e no `Stop` (`--format claude-stop`). O Stop só escreve JSON `hookSpecificOutput.additionalContext` quando há aviso. Isso abre um turno extra para o agente ver o aviso. Se o stdin vier com `stop_hook_active: true`, o script não escreve nada, para esse turno não chamar o hook de novo. Sem aviso, o Stop fica mudo. Não usa `decision: block`.
- Skills do projeto estão em `.agents/skills/`. `.claude/skills` é symlink para lá. Edite o canônico.
- Não crie `.claude/rules/` com cópia do contrato. O Grok também lê essa pasta, o tempo todo, e o contrato já entrou por `AGENTS.md`.
