# Cenários contínuos — revisão de composição

Esta revisão substitui a apresentação por atlas da primeira entrega. Rafael autorizou redesenhar caminhos e composição e pediu coerência com Bleach e escala jogável. As regiões representam recortes de exploração: não comprimem uma cidade ou palácio inteiro ao tamanho de uma sala.

## Entrega jogável

- Chão contínuo sem edifícios/árvores fundidos; props completos transparentes, independentes, ordenados pela base junto dos atores.
- Coordenadas do mundo continuam em células de 32 px. Não aumentamos os atores para simular escala. Karakura/Falsa: 64×48; Soul/Hueco/Las Noches/Wandenreich: 48×40; Dangai: 36×26.
- `client/public/maps/*.tmj`: lógica, colisão e apresentação Tiled. `client/src/worldSceneData.json`: metadados visuais correspondentes; teste compara todos os objetos com o Tiled.
- `baseline/`: snapshots anteriores ao redesenho, usados para preservar os objetos de lógica. Não substituir esses snapshots por mapas atuais para fazer testes passarem.
- Fontes geradas e prompts adjacentes nesta pasta; fontes reaproveitadas em `../renewal/`. As imagens `*-layout-guide.png` são guias técnicos. `karakura-ground-source.png` é exploração medieval descartada; a fonte aceita é `karakura-canon-ground.png`.
- `*-composed-preview.png` são composições de inspeção; não são carregadas como cenário. `karakura-personagem-mobs.png` é captura real de navegador com movimento validado no servidor.

## Manutenção

`build_karakura.py` e `build_regions.py` materializam a composição explicitamente autorizada a partir dos snapshots. Sobrescrevem os respectivos mapas atuais: não executar sobre novas edições do Tiled sem revisar/incorporar essas edições. Os geradores legados `build_maps.py` não participam deste fluxo.

Verificações: `npx vitest run client/test/worldScenes.test.ts` (lógica, equivalência editor/runtime, navegação e capacidade dos spawns); `python art/maps/scenes/check_scene_alpha.py` (nenhuma célula sólida de objeto totalmente sem arte, excluindo chão/água); `npm run test:e2e` (inclui deslocamento real e presença de mobs na câmera). O teste alpha é cobertura visual, não prova precisão de cada contorno de colisão.

Capturas dos sete destinos em `runtime/`, reunidas em `runtime-contact-sheet.jpg`. Reprodução no PowerShell: `$env:BI_MAP_PREVIEW='1'; npm exec -w e2e -- playwright test mapas.spec.ts --grep viaja`. A opção liga Dev explicitamente somente no servidor temporário para viajar com nível 150 e imortalidade; o E2E padrão mantém Dev desligado e ignora esse teste de captura.

Direção por região e fontes oficiais: `docs/features/renovacao-mapas/REFERENCIAS-lore.md`. Limitações de carga e cobertura: `docs/baseline.md` e `docs/pendencias.md`.

## Revisão das ferramentas

`python art/maps/scenes/test_tools.py` cobre remoção de fundo sem apagar detalhes internos roxos, preservação das chamadas de posicionamento com Python otimizado, falha de cobertura sob `-O`, conflitos entre casas/árvores, validação antes de publicar atlases e clipping explícito das prévias. Os mesmos testes podem rodar com `python -O`.

A fachada de Las Noches é um limite ambiental ao norte: sua largura de 704 px é intencional, com o topo continuando além do mundo. Não é um portal atravessável nem uma miniatura de todo o palácio. As células bloqueadas visíveis precisam continuar cobertas pela parte inferior da fachada. A prévia recorta explicitamente a região que cabe no canvas, sem passar coordenadas negativas ao compositor.
