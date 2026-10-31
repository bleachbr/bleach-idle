@AGENTS.md

## Claude Code

- Skills do projeto em `.claude/skills/` (índice na seção 7 do AGENTS.md).
- `.claude/settings.json` é compartilhado: `git push`, `rm -rf`, `npm audit fix` e `build_maps.py` pedem confirmação, e `push --force` e `reset --hard` são negados. Preferências pessoais ficam em `.claude/settings.local.json`, que o Git ignora.
