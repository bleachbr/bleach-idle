@AGENTS.md

## Claude Code

- Skills do projeto em `.claude/skills/` (índice na seção 7 do AGENTS.md).
- `.claude/settings.json` é compartilhado. Pedem confirmação: `git push`, `gh pr merge`, `rm -rf`, `npm audit fix` e os scripts que regeneram mapas. São negados: `git push` com `--force`, `-f` ou `+ref`, `git reset --hard`, `git clean` e a leitura de `.env`. As regras casam pelo início do comando e protegem só no Claude Code; não são uma fronteira de segurança (`git -C . push`, por exemplo, não casa). Preferências pessoais ficam em `.claude/settings.local.json`, que o Git ignora.
