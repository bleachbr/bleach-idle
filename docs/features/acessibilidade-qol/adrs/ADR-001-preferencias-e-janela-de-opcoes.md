# ADR-001: Preferências do jogador e janela de opções (R-14)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Proposto. Rascunho do Rafael em 01/11/2026 |
| **Contexto** | [PRD Acessibilidade e QoL](../PRD-acessibilidade-qol.md) §3.1, RF-01 a RF-03 |

---

## 1. Contexto

O cliente guarda três coisas no `localStorage`, cada uma lida e gravada no próprio lugar e sempre dentro de `try/catch`:
- `bi.token`: o token da sessão (`main.ts`, `store`);
- `bi_hd`: `"1"` ou `"0"` (`main.ts`, `bindHd`);
- `bi_mute`: `"1"` ou `"0"` (`sfx.ts`).

O Auto Helper (cura, reiatsu, local de caça) é do personagem e fica no servidor (`room.send("auto")`). Não há janela de opções: HD e som são ícones no cabeçalho `.who` (`index.html`).

## 2. Decisão

### 2.1. Módulo `client/src/prefs.ts`, puro
- Tipo `Prefs` com os campos e os valores aceitos em lista fixa:
  - `hd: boolean`, `mute: boolean`;
  - `textScale: 100 | 125 | 150`;
  - `contrast: "auto" | "on" | "off"`, `motion: "auto" | "reduced" | "full"`;
  - `keys: Record<Action, string[]>` (ADR-003);
  - `touchSide: "left" | "right"`, `touchSize: 52 | 64 | 76`, `oneHand: boolean`.
- `parsePrefs(raw: unknown): Prefs` monta um objeto novo percorrendo a lista fixa de campos e copiando só o que passa na validação: tipo errado ou valor fora da lista volta ao padrão daquele campo, sem descartar o resto. Chaves que não estão na lista (inclusive `__proto__` e `constructor` vindos do `JSON.parse`) nunca são lidas.
- `DEFAULT_PREFS` é o comportamento de hoje. `"auto"` em contraste e movimento segue as media queries (`prefers-contrast: more`, `prefers-reduced-motion: reduce`), resolvidas fora do módulo puro.
- Tudo numa chave só, `bi.prefs`, em JSON. Gravar e ler continuam em `try/catch` (navegação privada sem armazenamento: as preferências valem só na sessão).

### 2.2. Migração
- Na primeira leitura sem `bi.prefs`, `migrate(old)` lê `bi_hd` e `bi_mute` e preenche `hd` e `mute`. Durante uma versão, gravar `hd` e `mute` também regrava `bi_hd` e `bi_mute`, para quem voltar a um build antigo não perder a escolha; as chaves antigas saem num PR seguinte.
- O `sfx.ts` hoje lê `bi_mute` ao carregar o módulo. Ele continua com essa leitura como valor inicial, e `applyPrefs` chama `sfx.setMuted` com o valor das preferências logo depois, então a fonte de verdade passa a ser `bi.prefs`.

### 2.3. Aplicação
- `applyPrefs(p)` no cliente (fora do módulo puro): põe classes no `body` (`contrast`, `reduced-motion`, `touch-right`, `one-hand`), variáveis CSS (`--text-scale`, `--touch-size`) e avisa a `GameScene` (HD, escala do texto do canvas, movimento).
- Os ícones de HD e som do cabeçalho passam a ler e gravar pelas preferências.

### 2.4. Janela `#options`
- Mesmo padrão das outras janelas (`#ranking`, `#book`): cabeçalho com ✕ (`aria-label="Fechar"`), corpo com abas Visual, Som, Teclas, Toque. Entra na lista `WINDOWS` de `main.ts` para fechar com as outras.
- Botão ⚙ no cabeçalho `.who`, com `aria-label="Opções"`.
- O corpo é montado com `textContent` e elementos criados por código. Nenhum texto vindo do armazenamento entra por `innerHTML`.

## 3. Alternativas

- **Preferências no servidor (no save do personagem):** seguiriam o jogador entre aparelhos, mas exigem mensagem nova, validação de handler e campo no save, e misturam preferência de aparelho (tamanho do botão no celular) com a do personagem. Rejeitado para a R-14; volta no HUD customizável.
- **Uma chave por preferência no `localStorage`**, como hoje: sem migração, mas cada leitura repete o `try/catch` e a validação. Rejeitado.

## 4. Consequências

- **Positivas:** a validação fica num lugar só e tem teste sem DOM; preferências novas entram como campo novo.
- **Negativas:** limpar os dados do site zera as preferências (já é assim com HD e som).
- **Segurança:** o conteúdo do `localStorage` é tratado como entrada não confiável (outra extensão ou o próprio jogador podem editá-lo). Valor inválido vira padrão; nada dele vira HTML.
- **Rótulos na tela** (tecla configurada no `<kbd>` das técnicas e na legenda) saem de uma tabela fixa `code → texto` no `keymap.ts`, nunca do valor cru, e entram por `textContent` ou `escHtml`. Isso vale também para `renderTechs`, que hoje monta o HTML por `innerHTML`.
- **Testes:** `parsePrefs` com campos válidos, inválidos e faltando, e com `__proto__`/`constructor` vindos de `JSON.parse('{"__proto__": …}')` (um literal JS `{ __proto__: x }` muda o protótipo e não testa nada); `migrate` com e sem as chaves antigas.
