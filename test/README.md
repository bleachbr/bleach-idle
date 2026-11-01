# Jogador-IA

Quatro instâncias de IA (Gemini com visão) jogando **Bleach Idle** ao mesmo tempo, como jogadores reais, e entregando feedback consolidado. Não é teste de integração, E2E nem regressão: é um playtest avançado que roda na sua máquina local (os testes de regressão de bug ficam à parte, em `regressao/`, descritos no fim).

Inspirado no [Cradle](https://github.com/BAAI-Agents/Cradle): cada agente vê a captura de tela (`1280x720`), age com clique e teclado, reflete periodicamente sobre o que aprendeu e mantém memória entre sessões.

## Como funciona

- **4 personas em paralelo** no mesmo mundo, cada uma no próprio contexto de navegador e com conta/personagem próprios reaproveitados entre rodadas (`runs/jogo.sqlite`):
  - `novato` (`ia_novato` / `IANovato`): descobre tudo pela interface e anota qualquer atrito de onboarding.
  - `explorador` (`ia_explorador` / `IAExplorad`): abre todos os painéis, abas, mapas e NPCs.
  - `grinder` (`ia_grinder` / `IAGrinder`): foca em combate, automações (Auto Hunt / Auto Treino), ritmo de XP, ouro e drops.
  - `caotico` (`ia_caotico` / `IACaotico`): clica rápido, abre/fecha modais, testa entradas estranhas e ações fora de ordem para tentar quebrar o jogo.
- **2 fases configuráveis por tempo**:
  1. **Explorar** (`--explorar 30`, padrão 30 min): as 4 instâncias jogam sem parar explorando o jogo de forma natural (sem atalhos ou botões DEV).
  2. **Retorno** (`--retorno 15`, padrão 0 min ou 15 min quando ativado): ciclos de entrar, jogar (`--ciclo 3` min), sair (alternando saída pelo botão do jogo e fechamento abrupto da aba), esperar fora (`--fora 45` s) e voltar — conferindo persistência, relatório offline e testando as novidades da `main`.
- **Modos de execução (Local, Worktree ou Remoto)**:
  - **Padrão:** faz `git fetch origin main`, prepara worktree isolado em `runs/main`, calcula o changelog desde `runs/checkpoint.json` e sobe servidores locais (2578/5183) sem modo Dev (`BI_DEV=0`).
  - **Produção / Remoto (`--prod` ou `--url <url>`):** conecta diretamente a um servidor remoto como `https://bleach.acoplum.com`, sem subir processos locais, coletando erros reais, métricas e feedbacks.
  - **Árvore local (`--local`):** usa o código atual não commitado.
  - **Modo Dev explícito (`--dev`):** apenas para testes específicos que precisem das ferramentas de admin.
- **Relatórios e vídeos**:
  - Relatório individual e vídeos em `test/runs/<data-hora>/<persona>/relatorio.md`.
  - Relatório consolidado em `test/runs/<data-hora>/relatorio.md` cruzando as notas (0–10), pareceres, cobertura das 22 áreas e achados deduplicados (destacando quando mais de uma persona encontrou o mesmo problema).
  - Vídeos são comprimidos automaticamente via ffmpeg para MP4 (H.264 / `yuv420p` / `+faststart`, <50 MB) compatível direto com WhatsApp, apagando o `.webm` original temporário (use `--raw-video` para desativar).

## Uso

Requer `GEMINI_API_KEY` no `.env` da raiz do repositório (já ignorado pelo `.gitignore`).

```bash
cd test
npm install
npx playwright install chromium   # apenas na primeira vez

# 4 instâncias em paralelo por 30 min (padrão)
npm run play

# Testar diretamente o ambiente de produção (bleach.acoplum.com)
npm run play -- --prod
# ou com URL customizada:
npm run play -- --url https://bleach.acoplum.com --explorar 30

# Meia hora completa: 15 min explorando + 15 min entrando/saindo e testando novidades da main
npm run play -- --explorar 15 --retorno 15

# Rodada rápida ou filtrando personas/foco
npm run play -- --explorar 5 --personas novato,caotico --focus "loja e forja"

# Testar código não commitado da árvore local em vez do worktree da main
npm run play -- --local --explorar 10

# Testes unitários do runner
npm test
```

Modelo padrão: `gemini-3.5-flash-lite` (alterável via `IA_MODEL` no `.env`).

## Isolamento

- `test/` possui `package.json` e `tsconfig.json` próprios, fora dos workspaces da raiz e do Vitest.
- Modo Dev (`BI_DEV`) vem **desligado por padrão**: os agentes jogam como jogadores reais sem atalhos de admin.
- Servidor de teste na porta `2578` e Vite na `5183`, usando `test/runs/jogo.sqlite` (nunca toca no `bleach-idle.sqlite` da raiz).
- `GEMINI_API_KEY` não é repassada aos processos do servidor nem do cliente.

## Regressão de bugs no navegador

`regressao/` guarda testes que reproduzem um bug no Chromium antes da correção e provam o conserto depois. Usam o mesmo `Game` (servidor isolado na `2578`, Vite na `5183`), com banco temporário apagado no fim, e não precisam da `GEMINI_API_KEY`. Toda espera é por condição na página.

```bash
cd test
npm run regressao   # issue #22: mensagens da Arena e da patrulha sem handler no cliente
```

Saída `0` quando passa e `1` quando o bug volta. Usa as mesmas portas do Jogador-IA (`--strictPort`): não rode os dois ao mesmo tempo. Fica fora do CI até o M5-03.
