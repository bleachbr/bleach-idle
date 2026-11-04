# Arte dos mapas — renovação de 03/11/2026

**Histórico da primeira revisão.** A composição por atlas abaixo foi superada pelo redesenho autorizado em 04/11/2026: runtime, fontes atuais e verificações em [`../scenes/README.md`](../scenes/README.md). Esta pasta conserva fontes reutilizadas e atlases de suporte. As afirmações abaixo sobre layouts/flags e métricas descrevem o commit `161fe07`, não os mapas atuais. O catálogo agora registra os hashes dos mapas redesenhados; o teste atual de estrutura está em `client/test/worldScenes.test.ts`.

**Entrega local validada, sem publicação.** Rafael autorizou ajustar o cenário ao contorno da arte nova, desde que pequeno. Foram alteradas somente quatro flags `solido: true → false` por mapa, nos cantos vazios de `casa0_6x5` em Karakura/Falsa: tiles 198, 203, 222 e 227; células (20,18), (25,18), (20,22) e (25,22). O corpo da casa continua sólido. Revisão independente confirmou o delta exato; passaram typecheck, 439 testes Vitest, 8 E2E, regressão Pillow, build e 29 verificações do cenário mapcheck.

15 fontes geradas com a ferramenta nativa `image_gen`, com os prompts ao lado de cada PNG. `*-ground.png` contém somente os materiais do chão, em quatro quadrantes. As outras fontes contêm um único objeto inteiro sobre magenta para remoção determinística do fundo.

## Arquivos editáveis

- `terrain/`: texturas contínuas de 128 × 128 px, usadas como blocos de 4 × 4 tiles.
- `props/`: 48 objetos completos em RGBA, com transparência, ancorados embaixo. Fachadas e telhados da mesma construção ficam juntos; objetos independentes não são fundidos ao chão.
- `retained/`: cópia dos atlases anteriores, fonte dos objetos secundários reutilizados (bancos, lixeiras, portais, rochas, muros etc.). A origem fica explícita em `manifest.json`.
- `catalog.json`: catálogo dos índices e hashes originais/revisados dos `.tmj`, incluindo o ajuste aprovado de colisão. Obtido por introspecção em memória das chaves do código legado, com os gravadores desativados. Os `.tmj` não foram regenerados; as oito flags foram editadas pontualmente, preservando todos os demais bytes. `retained/maps/` guarda os dois mapas originais para comparação estrutural nos testes.
- `manifest.json`: hashes dos atlases anteriores e novos, prompts, fontes e dimensões dos objetos.
- `previews/`: composição dos sete `.tmj` com a arte final. `karakura-runtime.png` é captura do navegador, com o jogo rodando em ambiente de teste isolado.

## Montagem

```powershell
python art/maps/renewal/assemble.py
```

Requer Python com Pillow. O montador valida todos os hashes dos mapas antes de gravar os atlases. Se alguém editar um `.tmj`, revise o catálogo primeiro; não substitua seu hash apenas para silenciar a validação. O comando não escreve mapas, colisões, spawns ou lógica. Karakura Falsa e Wandenreich recebem a arte de Karakura/Soul com tratamento de cor próprio, sem executar `build_endgame.py`.

As camadas originais `chao`, `objetos`, `acima` e `logica` continuam no Tiled. O runtime usa os mesmos índices, dimensões e separação de camadas. A grade de 32 px e as áreas vazias dos layouts existentes foram preservadas; não houve conversão para cenário 3D nem redesenho das ruas. Animações e partículas ambientais existentes continuam disponíveis; não foram criadas novas folhas de animação.

## Verificação

- `client/test/mapArt.test.ts`: dimensões e hashes dos sete atlases, 15 fontes com prompts, 48 objetos RGBA e comparação dos mapas permitindo apenas as quatro flags de cada cidade. A matriz de colisão também deve diferir apenas nas quatro células esperadas por mapa.
- `python art/maps/renewal/test_assemble.py`: nenhum tile sólido usado no mapa que era visível pode tornar-se completamente transparente. Demonstrou falha em 24 tiles de Karakura/Falsa antes da correção de proporção das fachadas.
- `e2e/tests/mapas.spec.ts`: carregamento das sete imagens versionadas e captura de Karakura; não substitui um teste completo com um service worker antigo instalado.
- `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e` e `cd server; npx tsx scripts/mapcheck.ts`.

Executado também `cd server; npx tsx scripts/test.ts mapcheck`: 29 verificações aprovadas com servidor de teste isolado. Não executada a bateria completa de cenários nem gitleaks (executável ausente). Há células sólidas transparentes preexistentes na arte antiga; a regressão verifica que esta entrega não adiciona novas paredes invisíveis.

No Windows, os testes de deploy precisam do Git Bash no `PATH`. O runtime passou de 531.533 para 1.903.364 bytes nos sete PNGs; as dimensões das texturas de GPU e o número de arquivos carregados permanecem iguais. As fontes de alta resolução ficam somente em `art/` e não entram no build público.
