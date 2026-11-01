# ADR-001: Playwright no CI com servidor e build isolados (M5-03)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Proposto. Rascunho do Rafael em 01/11/2026 |
| **Contexto** | [PRD E2E no navegador](../PRD-e2e-navegador.md) |

---

## 1. Contexto

- O Playwright já é dependência do `test/` (`playwright ^1.50.0`), uma pasta fora dos workspaces da raiz, com lockfile próprio. A raiz, o `server` e o `client` não têm dependência de navegador.
- O cliente acha o servidor por `VITE_SERVER`. Sem ela, usa `ws://<host>:2567` em desenvolvimento e o próprio host em produção (`client/src/main.ts`).
- O CI tem os jobs `gitleaks`, `test` (Node 22 e 24: typecheck, Vitest, cenários; sem build do cliente) e `deploy`. A proteção da `main` exige `gitleaks`, `test (22.x)`, `test (24.x)` e a revisão do CodeRabbit (AGENTS.md §6.9).

## 2. Decisão

### 2.1. Onde fica
- Pasta nova `e2e/` como **workspace da raiz** (`"workspaces": ["server", "client", "e2e"]`), com `@playwright/test` fixado na versão exata, para usar o mesmo `npm ci` do CI.
- `e2e/playwright.config.ts`: `testMatch: "**/*.spec.ts"`, um worker, `retries: 0`, `trace: "retain-on-failure"`, `screenshot: "only-on-failure"`, timeout de 30 s por teste.

### 2.2. Como sobe o jogo
O jogo roda como em produção: o servidor do jogo entrega o build e o WebSocket na mesma origem (`server/src/http.ts`, com a CSP `connect-src 'self' ws: wss:`). Assim o teste pega erro de CSP e de origem, e não precisa de `VITE_SERVER`.

O `globalSetup` do Playwright faz duas coisas:
1. Gera o build do cliente **numa pasta temporária** (`npm -w client run build -- --outDir <tmp>/dist`), sem `VITE_SERVER`. Gerar em `client/dist` sobrescreveria o build local de quem desenvolve.
2. Sobe o servidor com `node --import tsx server/src/index.ts` e estas variáveis:
   - `PORT=2580` e `STATIC_DIR=<tmp>/dist`;
   - `DB_FILE` no mesmo diretório temporário;
   - `BI_DEBUG=1`, para o `debugInvasion` do fluxo 7;
   - `LOGIN_MAX_FAILS_IP` e `REGISTER_MAX_IP` altos;
   - invasão e chefe mundial adiados, como no `server/scripts/test.ts`.

   Espera a linha "Servidor do mundo" na saída, com limite de 30 s. A página é `http://localhost:2580`.

O `globalTeardown` derruba o servidor e apaga o diretório temporário. A porta 2580 não briga com `npm run dev` (2567 e 5173), com a bateria de cenários (2577) nem com o Jogador-IA (2578 e 5183).

`BI_DEBUG=1` libera mensagens de depuração, e o servidor escuta em todas as interfaces (`gameServer.listen(port)` sem host). Na máquina de quem desenvolve, ele fica acessível na rede local enquanto o teste roda. No CI não importa; em casa, rode numa rede de confiança.

### 2.3. Como espera
- Toda espera é por condição na página. Exemplo do fluxo 3: `await expect(page.locator("#chatlog")).toContainText("entrou no mundo")`.
- O `window.__bi` só existe em desenvolvimento, então os testes não dependem dele: tudo que conferem está no DOM.

### 2.4. CI
- Job novo `e2e` em `.github/workflows/ci.yml`:
  - `ubuntu-24.04`, Node 24, `timeout-minutes: 15`;
  - `npm ci`, `npx playwright install --with-deps chromium`, `npm -w e2e test`;
  - em falha, sobe `e2e/test-results/` como artefato com `actions/upload-artifact` fixado por SHA (a convenção que o `server/test/ci-workflow.test.ts` confere).
- O job não entra no ruleset no início (PRD §5, item 1).
- O `server/test/ci-workflow.test.ts` confere o workflow e precisa ser atualizado no mesmo PR.

### 2.5. Higiene
- `e2e/test-results/` e `e2e/playwright-report/` no `.gitignore`.
- O `npm run typecheck` da raiz passa a incluir o `e2e/` (`tsc --noEmit` do workspace).
- Nomes gerados respeitam os limites do formulário: login até 20 caracteres e personagem até 16 (`#new-name`), então o sufixo aleatório é curto (por exemplo, 6 caracteres).

## 3. Consequências

- **Positivas:** o caminho principal do jogador passa a ter teste. Os bugs de cliente deste mês (banner, ícones, cache) ganham onde morar.
- **Negativas:** mais 3 a 5 minutos de CI por PR, um download de navegador e um build do cliente no job novo.
- **Riscos:** teste de navegador tende a ficar instável. Mitigação: um worker, nada de espera por tempo, e o job só vira obrigatório depois de duas semanas estável.
