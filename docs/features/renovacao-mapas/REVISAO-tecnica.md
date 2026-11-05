# Revisão independente da composição — 04/11/2026

## Revisão remota e correções

Publicação dividida em PR #339 (fontes/ferramentas) e #338 (integração), pois o limite disponível do CodeRabbit era de 100 arquivos revisáveis. O CodeRabbit solicitou alterações nas ferramentas: chroma removendo roxo interno; chamadas de posicionamento eliminadas por `-O`; casa sobre árvores; checagem alpha desativada por otimização; gravação de atlas antes de validar todos os insumos. Corrigidos com regressões que demonstraram a falha antes e passaram depois.

A proposta de reduzir a fachada de Las Noches para 281 px não foi aplicada: o marco de 704 px representa um limite norte monumental intencionalmente recortado. A decisão foi documentada, a prévia passou a recortar explicitamente a parte visível e a cobertura das 110 células bloqueadas foi verificada. O acesso ao Privaron permanece livre.

A primeira correção de chroma deixou magenta em vazios internos da folhagem; a segunda versão distingue bolsões com chave quase pura de roxo legítimo. A revisão independente confirmou zero pixels magenta opacos nas escalas 72/80/88/96 do WebP de Zelkova, em NEAREST e LANCZOS, e preservação dos 10.325 pixels roxos do pilar. Restam contornos púrpuras finos perceptíveis na fonte ampliada, sem manchas materiais na escala de jogo. As validações locais não substituem aprovação remota do HEAD atual e CI antes do merge.

## Revisão local inicial

Revisor: agente `review_map_art`, distinto do implementador, somente leitura. Veredito local: sem achados bloqueantes na revisão de composição e na revisão incremental de cache/fixtures/captura. Não representa aprovação de PR remoto.

Conferido pelo revisor: render/depth pelos pés, escala na captura jogador/mobs, coordenadas de interação, IDs Tiled únicos/próximos IDs válidos e imagens existentes; lógica igual ao commit anterior em seis mapas e apenas correção de encoding do nome do portal no Dangai. Executou união alpha dos objetos: nenhum sólido de objetos totalmente sem cobertura nos sete mapas. Conferiu capacidade geométrica de todos os spawns fora de PZ.

Incremental: URLs WebP usam MAP_VERSION; fixture de interação na rua (13,16) conserva distância e comportamento. Captura opt-in liga BI_DEV somente no subprocesso temporário com BI_MAP_PREVIEW=1; fluxo normal define BI_DEV=0 e continua com banco/build/porta isolados. Nenhum handler ou configuração de produção foi acrescentado.

O revisor não executou Vitest/E2E; os resultados executados pelo implementador estão em `docs/baseline.md`. Gitleaks indisponível no PATH. Desempenho móvel não medido; estimativa RGBA das cenas 85,6 MiB além dos assets existentes. Alpha exclui chão/água e não prova precisão do contorno nem ocupação dinâmica de jogadores/mobs.
