# Revisão independente da composição — 04/11/2026

Revisor: agente `review_map_art`, distinto do implementador, somente leitura. Veredito local: sem achados bloqueantes na revisão de composição e na revisão incremental de cache/fixtures/captura. Não representa aprovação de PR remoto.

Conferido pelo revisor: render/depth pelos pés, escala na captura jogador/mobs, coordenadas de interação, IDs Tiled únicos/próximos IDs válidos e imagens existentes; lógica igual ao commit anterior em seis mapas e apenas correção de encoding do nome do portal no Dangai. Executou união alpha dos objetos: nenhum sólido de objetos totalmente sem cobertura nos sete mapas. Conferiu capacidade geométrica de todos os spawns fora de PZ.

Incremental: URLs WebP usam MAP_VERSION; fixture de interação na rua (13,16) conserva distância e comportamento. Captura opt-in liga BI_DEV somente no subprocesso temporário com BI_MAP_PREVIEW=1; fluxo normal define BI_DEV=0 e continua com banco/build/porta isolados. Nenhum handler ou configuração de produção foi acrescentado.

O revisor não executou Vitest/E2E; os resultados executados pelo implementador estão em `docs/baseline.md`. Gitleaks indisponível no PATH. Desempenho móvel não medido; estimativa RGBA das cenas 85,6 MiB além dos assets existentes. Alpha exclui chão/água e não prova precisão do contorno nem ocupação dinâmica de jogadores/mobs.
