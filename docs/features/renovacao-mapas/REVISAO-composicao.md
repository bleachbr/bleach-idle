# Revisão: compor cenários inteiros

03/11/2026. Rafael rejeitou a primeira renovação: continuava visualmente quadrada e fragmentada, com assets espalhados. Autorizou redesenhar composição e caminhos, preservando os pontos importantes de jogo e validando a navegação.

## Direção

Migrar a apresentação para `scene_mode`: chão contínuo gerado como uma paisagem inteira, props transparentes completos e ordenados pela base, atores entre os objetos e oclusão natural de copas. O Tiled continua sendo a fonte autoritativa de colisões e lógica. Não usar uma imagem com prédios/árvores fundidos ao chão como mapa jogável.

Começar por Karakura na câmera real do jogo. Praça central conectada, vias com transições orgânicas, arquitetura agrupada ao redor dos caminhos, vegetação em massas irregulares e travessia do rio legível. Remover a malha repetitiva de quarteirões e árvores equidistantes. As outras regiões precisam de composição própria; não repetir o mesmo desenho com outra cor.

## Plano de execução e validação

1. Gerar chão contínuo de Karakura e uma referência vestida da mesma base; a referência não entra no runtime.
2. Montar objetos separados e metadados de posição/escala/base; refazer camadas visuais e colisões do Tiled de forma pontual, preservando `logica`.
3. Implementar renderização de cenário em módulo próprio e teste determinístico de metadados, profundidade e navegação antes do código.
4. Capturar a câmera real para conferir composição, escala, emendas, oclusão e leitura dos caminhos antes de propagar a direção aos outros mapas.
5. Executar tipos, Vitest, testes visuais, mapcheck, build e navegador. Atualizar memória e revisão independente antes de publicação.

Formato do cenário: imagem de chão em coordenadas do mundo, lista de sprites completos com âncora centro/base e `sortY`, limites da câmera e referência ao `.tmj`. Spawns, templo, PZ, NPCs, depot e portais continuam vindos do Tiled. Fontes e prompts preservados em `art/maps/scenes/`.
