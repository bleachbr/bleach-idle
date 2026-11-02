# PRD: Testes de ponta a ponta no navegador (M5-03)

| Metadado | Detalhe |
| :--- | :--- |
| **Feature** | Testes E2E com Playwright: login, lobby, entrada no mundo e HUD |
| **Status** | Aceito em 01/11/2026 por Rafael e Waldir: Waldir aprovou o PR #29 ([revisão](https://github.com/bleachbr/bleach-idle/pull/29#pullrequestreview-5729186922)), e Rafael confirmou o aceite. As propostas dos pontos em aberto valem como decisão até alguém reabrir |
| **Item do roadmap** | M5-03 |
| **ADR** | [ADR-001 Playwright no CI](adrs/ADR-001-playwright-no-ci.md) |

---

## 1. Problema

O que existe hoje (conferido em 01/11/2026):
- **Vitest** (`npm test`): regras puras e um servidor Colyseus real dentro do processo (`server/test/helpers/testServer.ts`). Os testes falam com o servidor pelo `colyseus.js`, sem página nem navegador.
- **Cenários** (`npm run test:scripts`): 31 roteiros com bots contra um servidor de teste isolado.
- **Jogador-IA** (`test/`, do F-16): já usa Playwright e Chromium, sobe servidor e Vite próprios (portas 2578 e 5183) e grava vídeo. Mas é um playtest guiado por IA (precisa de `GEMINI_API_KEY`) e usa espera por tempo. O próprio `test/README.md` diz que não é teste de regressão.

Nada confere o cliente. Neste mês, dois problemas só apareceriam no navegador:
- o banner de evento do R-12 (layout e `aria-live`);
- os ícones de status do M2-06 (clarão do golpe).

Os dois foram conferidos só lendo o código. (O `soul.tmj` velho no cache do service worker, do M1-03, também, mas este teste não o pega: cada contexto do Playwright começa com o cache limpo; ver §5.)

## 2. Objetivos

1. Um conjunto pequeno e estável de testes no navegador que roda em todo PR e quebra quando o caminho principal do jogador quebra.
2. Esperar sempre por condição na página (elemento visível, texto, estado), nunca por tempo (skill `testes-deterministicos`).
3. Rodar em menos de 5 minutos no CI.

Fora do escopo: comparação de imagem (regressão visual), testes de jogabilidade longa (isso é o Jogador-IA), celular real.

## 3. Fluxos cobertos na primeira entrega

| # | Fluxo | O que confere |
| :-- | :--- | :--- |
| 1 | Cadastro e login | `#auth-form` cria conta; senha errada no login mostra "Login ou senha incorretos." em `#auth-error` (senha curta não serve: `#login-pass` tem `minlength="6"` e o navegador nem envia); login certo entra no `#lobby` |
| 2 | Criar personagem | `#create-form` com `#new-name` (até 16 caracteres) e um `button.char` do `#chars`; o personagem aparece em `#char-list` |
| 3 | Entrar no mundo | "Jogar" abre `#app`; o canvas em `#game` existe; `#chatlog` mostra "entrou no mundo" |
| 4 | HUD | `#techs` mostra as 4 técnicas, `#inv` tem o kit inicial, `#pname` tem o nome |
| 5 | Chat | Escrever em `#chatin` e apertar Enter mostra a linha no `#chatlog` |
| 6 | Trocar de personagem e voltar | `#exit-btn` (Trocar de personagem) pede confirmação com `confirm()`: o teste aceita o diálogo (`page.on("dialog", (d) => d.accept())`, porque o Playwright recusa diálogos por padrão) e volta ao lobby; com `#remember` (Lembrar neste navegador), recarregar a página pula o login |
| 7 | Evento narrado (R-12) | Um cliente `colyseus.js` no próprio teste, logado pelo lobby, manda `debugInvasion` (nada no cliente do jogo envia essa mensagem, e o `window.__bi` não existe no build). A invasão é global: a página mostra `#event-banner` com "Invasão de Hollows" e a linha de lore no chat. O teste termina com `debugInvasionEnd` e roda por último, porque os Hollows da praça atrapalhariam os outros fluxos no mesmo servidor |

## 4. Requisitos

- **RF01** Cada teste cria a própria conta (nome com sufixo aleatório) e não depende de outro teste.
- **RF02** O servidor de teste usa banco em arquivo temporário apagado no fim, nunca o `bleach-idle.sqlite` de quem desenvolve.
- **RF03** Falha no CI guarda o *trace* do Playwright e a captura de tela como artefato.
- **RNF01** Sem `waitForTimeout`. Só `expect(...).toBeVisible()`, `toHaveText` e `page.waitForFunction` com condição.
- **RNF02** Os arquivos se chamam `*.spec.ts` e ficam fora do `include` do Vitest (`**/*.test.ts`), para o `npm test` não tentar rodá-los.

## 5. Pontos em aberto

| # | Pergunta | Proposta |
| :-- | :--- | :--- |
| 1 | O job novo vira check obrigatório da `main` (ruleset)? | Não no início: obrigatório depois de 2 semanas sem falha aleatória |
| 2 | Rodar contra `vite dev`, `vite preview` ou o servidor de produção? | O servidor do jogo servindo o build (`STATIC_DIR`), como em produção: pega erro de CSP e de WebSocket na mesma origem (ADR-001 §2.2) |
| 3 | Navegadores | Só Chromium no CI; Firefox e WebKit à mão, quando mexer em CSS |
| 4 | Reaproveitar o `test/` do Jogador-IA? | Reaproveitar só o jeito de subir o servidor; os testes ficam numa pasta nova `e2e/` |
| 5 | Testar o service worker com mapa velho no cache (o caso do M1-03)? | Fica para depois: exige servir duas versões do build no mesmo teste |
