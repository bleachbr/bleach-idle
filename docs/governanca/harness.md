# Onde cada harness lê

Uma regra mora em `AGENTS.md`. O resto é descoberta ou delta. Se um arquivo desta tabela repetir o contrato, apague a cópia.

| Harness | Sempre no contexto | Sob demanda | Hook de sessão |
|---|---|---|---|
| Grok | `AGENTS.md`, e também `CLAUDE.md` se existir. Não lê `GEMINI.md`. Não expande `@AGENTS.md`; a linha fica literal | `.agents/skills/` (já deduplica pelo nome o symlink `.claude/skills`) | não tem hook de repo. O ritual está no contrato e na skill |
| Claude Code | `CLAUDE.md`, que importa `AGENTS.md` com `@AGENTS.md` | `.claude/skills/` → `.agents/skills/` | `.claude/settings.json` |
| Antigravity | `AGENTS.md` e `GEMINI.md` juntos | `.agents/skills/`, `.agents/rules/` com `trigger` | `.agents/hooks.json` |
| Kiro | `AGENTS.md` (sempre; steering não desliga isso) | `.kiro/skills/` → `.agents/skills/`, `.kiro/steering/` em `fileMatch` | `.kiro/hooks/session-hint.json` |
| Codex, Cursor, Copilot | `AGENTS.md`. Copilot também lê `.github/copilot-instructions.md` | `.agents/skills/` quando o produto descobrir skills | — |

Skills canônicas, um `SKILL.md` cada:

- `.agents/skills/fechamento-sessao/`
- `.agents/skills/triagem-pedido/`

`.claude/skills` e `.kiro/skills` são symlinks do diretório. Claude e Kiro não leem `.agents/skills`. Grok, Antigravity e Gemini CLI leem, então não há `.grok/skills` nem `.gemini/skills`: o segundo symlink listaria a mesma skill de novo. Não copie o markdown para o outro lado.

## Por que o delta é curto

Medido nos manuais, não por preferência:

- O Grok carrega todo `AGENTS.md` e todo `CLAUDE.md` do diretório, e ainda os `*.md` de `.claude/rules/`. Uma regra em `.claude/rules/` entra no Grok em toda sessão.
- O Antigravity soma `AGENTS.md` + `GEMINI.md` + `.agents/rules/`. `AGENTS.md` e `GEMINI.md` não usam frontmatter e ficam sempre ligados.
- O Kiro inclui `AGENTS.md` sempre, além de `.kiro/steering/` com `inclusion: always`. Steering de fundação que repete o contrato custa contexto em toda conversa. O que é específico de arquivo fica em `fileMatch`.

## O que é automático de verdade

O agente marca a caixa e escreve o changelog. A máquina não inventa esse texto.

`make docs-sync` reescreve, entre `<!-- docs:progress:start -->` e `<!-- docs:progress:end -->` em `docs/STATUS.md`, a contagem de caixas de `docs/ROADMAP.md`. `make docs-check` reprova se o bloco divergir, se o número de pendência ou aprendizado repetir, se a pendência não disser por que ficou aberta, ou se um link relativo quebrar. O job `docs` do CI roda os dois comandos de teste e de check.

Na abertura, Claude e Kiro recebem texto; o Antigravity recebe `injectSteps` no `SessionStart`. No fim, e só quando código do jogo mudou (`src/`, `geradores/`, `index.html`, `preview.html`, `vite.config.js`) sem um doc vivo, o Claude devolve o aviso com `hookSpecificOutput.additionalContext` e o Antigravity com `decision: continue` mais `reason`. Os dois reentram no loop. O Claude corta o seguinte se `stop_hook_active` é true. O Antigravity corta quando `executionNum` é maior que 1, e sem aviso emite `decision: stop`. `injectSteps` no Stop do Antigravity é ignorado. O Stop do Kiro não injeta stdout. Nenhum hook marca caixa sozinho.
