# Renovação visual dos sete mapas

Data: 03/11/2026. Pedido de Rafael: aproximar os cenários das referências de JRPG em pixel art detalhado. Decisão confirmada: preservar os layouts existentes.

Complemento aprovado por Rafael: permitir ajuste pequeno do cenário para acomodar a arte nova. Aplicado somente aos quatro cantos vazios da casa `casa0_6x5` em Karakura e Karakura Falsa: tiles 198/203/222/227, células (20,18), (25,18), (20,22), (25,22). Apenas suas flags de solidez mudam para false; nenhuma posição, camada ou objeto de lógica muda.

## Resultado

Renovar pisos, arquitetura e objetos ambientais de Karakura, Soul Society, Hueco Mundo, Las Noches, Dangai, Karakura Falsa e Wandenreich. Manter câmera ortogonal, escala de 32 px por célula, IDs e arquivos Tiled existentes. Cada região conserva sua identidade: cidade japonesa, arquitetura da Seireitei, deserto branco, palácio Arrancar, corredor espiritual, cidade ao crepúsculo e ocupação Quincy.

## Contrato de arte

Texturas contínuas de chão em blocos de 4 × 4 células; objetos completos extraídos em arquivos transparentes antes de fatiar o atlas. Não juntar edifícios, vegetação ou interativos ao chão. Partes contíguas de um mesmo objeto devem ser processadas juntas para evitar emendas. Manter `chao`, `objetos`, `acima` e `logica`; a lógica e colisão continuam pertencendo ao servidor. Arte original de referência não deve ser copiada literalmente.

## Restrições e verificação

Não executar os geradores legados nem regenerar mapas. Editar pontualmente apenas as oito flags de colisão aprovadas, preservando os demais bytes dos dois `.tmj`; os outros cinco ficam intactos. Gerar arte com image_gen; scripts apenas recortam, removem fundo e montam imagens. Guardar prompts, fontes, catálogo dos recortes, hashes originais/revisados e prévias compostas. Comparar toda a estrutura dos mapas com os originais permitindo somente essas flags; conferir matriz de colisão, alpha e dimensões dos atlases. Executar typecheck, Vitest, mapcheck, build e navegador. Não publicar sem autorização.
