# Renovação visual dos sete mapas

Data inicial: 03/11/2026; escopo revisto em 04/11/2026. Pedido de Rafael: aproximar os cenários das referências de JRPG em pixel art detalhado. Após rejeitar a composição ainda quadrada da primeira versão, Rafael autorizou redesenhar composição e caminhos, preservando os pontos importantes de jogo, e pediu coerência com o lore de Bleach e proporções jogáveis.

Histórico: a primeira versão alterava somente quatro cantos vazios de uma casa em Karakura/Falsa. Essa restrição foi superada pela autorização explícita de redesenho. A revisão atual está em [REVISAO-composicao.md](REVISAO-composicao.md) e as fontes de lore em [REFERENCIAS-lore.md](REFERENCIAS-lore.md).

## Resultado

Renovar os sete mapas com chão contínuo, objetos completos separados e profundidade pela base. Manter câmera ortogonal, escala de 32 px por célula, dimensões, IDs e objetos de lógica. Cada mapa representa um recorte: Karakura contemporânea; transição Rukongai/Seireitei; deserto branco de Hueco Mundo; acesso monumental de Las Noches; passagem dimensional Dangai; réplica de Karakura com quatro Tenkai Ketchū; arquitetura Quincy do Wandenreich.

## Contrato de arte

O renderer usa chão contínuo e sprites completos com âncora centro/base. Não juntar edifícios, vegetação ou interativos ao chão. Tiled contém apresentação, colisão e `logica`; servidor conserva autoridade. Os atlases permanecem como suporte para colisão, minimapa e fallback. Arte original de referência não deve ser copiada literalmente.

## Restrições e verificação

Não executar geradores legados. Scripts em `art/maps/scenes/` materializam esta composição autorizada a partir de snapshots explícitos; não devem sobrescrever futuras edições Tiled. Guardar fontes, prompts, hashes e prévias. Comparar `logica`, equivalência Tiled/runtime, navegação, capacidade dos spawns e cobertura alpha dos sólidos de objetos. Capturar movimento real e mobs no navegador. Executar tipos, Vitest, cenários afetados, build e E2E. Não publicar sem autorização.
