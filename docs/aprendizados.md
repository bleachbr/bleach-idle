# Aprendizados

Causa raiz que custou tempo ou que ia ser redescoberta. Não é plano (isso é o [ROADMAP](ROADMAP.md)) nem dívida aberta (isso é [pendencias.md](pendencias.md)).

**Última atualização:** 2026-11-07

O número é da família inteira. Item novo pega `max + 1` e não reusa número que já saiu.

## 1. Folha com alturas diferentes encolhe o personagem ao virar de costas

**Causa raiz:** frentes, lados e costas da mesma folha não nascem na mesma escala. Um fator único pelo quadro mais alto deixa as costas menores. No caso medido no doc de normalização, a frente tinha 425 px, o lado 375 px e as costas 323 px, 24% abaixo da frente.

**O que fazer:** quadro de 128 px, pés na baseline 117, altura do corpo na faixa 104–107, jitter de no máximo 1 px. O procedimento e o teste estão em [direcionamento/07](direcionamento/07-diretrizes-normalizacao-sprites-e-testes.md). Sem `make validate-sprites`, o atlas não entra em `src/assets/`.

**Evidência:** [direcionamento/07](direcionamento/07-diretrizes-normalizacao-sprites-e-testes.md), seção 1, com as três alturas acima.

## 2. Segundo arquivo de regras no mesmo diretório é carregado junto, não no lugar

**Causa raiz:** o Grok lê `AGENTS.md` e `CLAUDE.md` do mesmo diretório, e ainda todo `*.md` de `.claude/rules/`. O Antigravity soma `AGENTS.md` e `GEMINI.md`, os dois sempre ligados, sem frontmatter. O Kiro inclui `AGENTS.md` sempre e, por cima, steering com `inclusion: always`. Copiar o contrato para o delta faz a regra valer duas vezes e divergir na primeira edição.

**O que fazer:** o contrato fica em `AGENTS.md`. `CLAUDE.md` e `GEMINI.md` só dizem o que é daquele harness. Steering e `.agents/rules/` ou são glob de arquivo, ou não existem. Mapa em [governanca/harness.md](governanca/harness.md).

**Evidência:** guia de project rules do Grok (`AGENTS.md` e `CLAUDE.md` no mesmo diretório entram os dois; `.claude/rules/*.md` entra inteiro) e a descoberta de customização do Antigravity (regras cumulativas; `AGENTS.md` e `GEMINI.md` sempre ativos).

## 3. O git deste checkout conta dois jogos

**Causa raiz:** a história passa por commits do bleach-idle (sete mapas, CI com `npm test`, deploy da imagem `bleach-idle`) e, depois, pelo protótipo Soul Survivor, que trocou o `package.json` e não trocou o workflow. Um agente que lê só o YAML "conserta" o protótipo para satisfazer o jogo antigo, ou apaga o deploy achando que é lixo.

**O que fazer:** tratar `.github/workflows/ci.yml` como descrição do bleach-idle até a pendência 1 fechar. O gate deste protótipo, hoje, é `make build`, `make validate-sprites` e `make docs-check`. O job `docs` do CI é o único job alinhado ao Soul Survivor.

**Evidência:** `package.json` (scripts `dev`, `build`, `preview`) contra os passos `npm run typecheck`, `npm test` e o workspace `e2e` em `.github/workflows/ci.yml`. O projeto Orca deste checkout está registrado como `bleach-idle`.

## 4. Link `file://` absoluto não sai da máquina em que foi clicado

**Causa raiz:** o preview do editor grava o destino como `file:///Users/.../src/main.js`. Esse prefixo é o checkout principal desta máquina. Worktree, CI e outro clone resolvem outro diretório, e o link mente mesmo quando o arquivo existe nos dois lugares.

**O que fazer:** caminho relativo a partir do markdown (`../../src/main.js` desde `docs/direcionamento/`). `make docs-check` reprova alvo que começa com `file:`.

**Evidência:** em 2026-11-07 o `docs-check` no worktree `agent-docs` reprovou oito links em `docs/direcionamento/` (05, 06, 08 e 09) que apontavam para o checkout principal. Trocar por caminho relativo fez o check passar.

## 5. Stdout puro do hook Stop do Claude não entra no contexto

**Causa raiz:** no Claude Code, `SessionStart` entrega stdout ao modelo. No `Stop`, texto puro é descartado. O canal é JSON `hookSpecificOutput.additionalContext` com `hookEventName` `Stop`. Esse campo continua a conversa (turno extra, o mesmo teto de oito continuações do `decision: block`). Se o script escrever de novo com `stop_hook_active: true` no stdin, o turno se repete.

**O que fazer:** `--format claude-stop` só quando há aviso. Saída vazia e exit 0 quando `stop_hook_active` é o booleano `true`, ou quando o stdin não é um objeto. Sem `decision: block`. O SessionStart permanece em `--format text`.

**Evidência:** referência de hooks do Claude Code (Stop decision control, campo `stop_hook_active`) e os testes `test_aviso_sai_como_json_de_stop` e `test_stop_hook_active_cala_mesmo_com_aviso` em `scripts/docs/test_governanca.py`.

## 6. injectSteps no Stop do Antigravity é descartado

**Causa raiz:** em [Hooks](https://antigravity.google/docs/hooks/), `injectSteps` é saída de `SessionStart`, `PreInvocation` e `PostInvocation`. O `Stop` só lê `decision` e `reason`. `decision: continue` impede o término e coloca `reason` como system message. Qualquer outro `decision` deixa o loop parar. JSON com `injectSteps` nesse evento não chega ao modelo.

**O que fazer:** `--format antigravity-stop`. Sem aviso, `{"decision":"stop"}`. Com aviso, `{"decision":"continue","reason":"..."}` só se `executionNum` do stdin estiver ausente ou for no máximo 1. Acima disso, `decision: stop`, para o loop não repetir. O `SessionStart` permanece em `--format antigravity`.

**Evidência:** seção Stop da doc acima (campo `decision` obrigatório; `reason` só entra com `continue`) e os testes `test_aviso_vira_continue` e `test_execution_num_acima_de_um_forca_stop` em `scripts/docs/test_governanca.py`.
