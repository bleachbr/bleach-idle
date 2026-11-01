# Jogador-IA

Quatro instâncias de IA (Gemini com visão) jogando **Bleach Idle** ao mesmo tempo, como jogadores reais, e entregando feedback consolidado. Não é teste de integração, E2E nem regressão: é um playtest avançado que roda na sua máquina local.

Inspirado no [Cradle](https://github.com/BAAI-Agents/Cradle): cada agente vê a captura de tela (`1280x720`), age com clique e teclado, reflete periodicamente sobre o que aprendeu e mantém memória entre sessões.

## Como funciona

- **4 personas em paralelo** no mesmo mundo, cada uma no próprio contexto de navegador e com conta/personagem próprios reaproveitados entre rodadas (`runs/jogo.sqlite`):
  - `novato` (`ia_novato` / `IANovato`): descobre tudo pela interface e anota qualquer atrito de onboarding.
  - `explorador` (`ia_explorador` / `IAExplorad`): abre todos os painéis, abas, mapas e NPCs.
  - `grinder` (`ia_grinder` / `IAGrinder`): foca em combate, automações (Auto Hunt / Auto Treino), ritmo de XP, ouro e drops.
  - `caotico` (`ia_caotico` / `IACaotico`): clica rápido, abre/fecha modais, testa entradas estranhas e ações fora de ordem para tentar quebrar o jogo.
- **2 fases configuráveis por tempo**:
  1. **Explorar** (`--explorar 15`, padrão 15 min): as 4 instâncias jogam sem parar explorando o jogo.
  2. **Retorno** (`--retorno 15`, padrão 0 min ou 15 min quando ativado): ciclos de entrar, jogar (`--ciclo 3` min), sair (alternando saída pelo botão do jogo e fechamento abrupto da aba), esperar fora (`--fora 45` s) e voltar — conferindo persistência, relatório offline e testando as novidades da `main`.
- **Checkout isolado da `main` + checkpoint**:
  - Faz `git fetch origin main`, prepara um worktree isolado em `runs/main` (ou usa a árvore atual com `--local`), calcula o changelog desde `runs/checkpoint.json` e entrega os commits novos para as IAs testarem.
- **Relatórios e vídeos**:
  - Relatório individual e vídeos em `test/runs/<data-hora>/<persona>/relatorio.md`.
  - Relatório consolidado em `test/runs/<data-hora>/relatorio.md` cruzando as notas (0–10), pareceres, cobertura das 22 áreas e achados deduplicados (destacando quando mais de uma persona encontrou o mesmo problema).

## Uso

Requer `GEMINI_API_KEY` no `.env` da raiz do repositório (já ignorado pelo `.gitignore`).

```bash
cd test
npm install
npx playwright install chromium   # apenas na primeira vez

# 4 instâncias em paralelo por 15 min (padrão)
npm run play

# Meia hora completa: 15 min explorando + 15 min entrando/saindo e testando novidades da main
npm run play -- --explorar 15 --retorno 15

# Rodada rápida ou filtrando personas/foco
npm run play -- --explorar 5 --personas novato,caotico --focus "loja e forja"

# Testar código não commitado da árvore local em vez do worktree da main
npm run play -- --local --explorar 10
```

Modelo padrão: `gemini-3.5-flash-lite` (alterável via `IA_MODEL` no `.env`).

## Isolamento

- `test/` possui `package.json` e `tsconfig.json` próprios, fora dos workspaces da raiz e do Vitest.
- Servidor de teste na porta `2578` e Vite na `5183`, usando `test/runs/jogo.sqlite` (nunca toca no `bleach-idle.sqlite` da raiz).
- `GEMINI_API_KEY` não é repassada aos processos do servidor nem do cliente.
