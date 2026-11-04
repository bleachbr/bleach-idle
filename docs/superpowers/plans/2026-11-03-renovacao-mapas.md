# Plano de renovação dos mapas

**Registro histórico da primeira revisão (03/11/2026).** Este plano foi superado pelo redesenho autorizado de composição e caminhos. O escopo atual está no [PRD](../../features/renovacao-mapas/PRD-renovacao-mapas.md) e na [revisão de composição](../../features/renovacao-mapas/REVISAO-composicao.md): chão contínuo nos sete mapas e objetos completos separados. As restrições e o checklist abaixo documentam a etapa inicial.

**Objetivo:** renovar a arte dos sete mapas preservando integralmente os layouts aprovados.
**Arquitetura:** substituir apenas os pixels dos atlases existentes. Fontes geradas, objetos transparentes e catálogo de recortes ficam em art/maps/renewal. Cinco mapas ficam intactos; dois recebem somente as quatro flags de colisão por mapa aprovadas por Rafael, sem mover camadas ou objetos de lógica.
**Tecnologias:** image_gen, Pillow, Phaser, Tiled JSON e Vitest.
**Spec:** docs/features/renovacao-mapas/PRD-renovacao-mapas.md.

- [x] Registrar hashes dos mapas e catálogo dos tiles; escrever teste de integração dos assets e demonstrar falha antes da renovação.
- [x] Gerar novas texturas e objetos com prompts preservados; montar atlases por catálogo sem executar geradores de mapa.
- [x] Atualizar a versão de cache das imagens; conferir URLs versionadas no carregamento; atualização com worker antigo real fica registrada como lacuna.
- [x] Compor e inspecionar prévias dos sete mapas; conferir transparência, emendas e pontos importantes.
- [x] Executar typecheck, testes, mapcheck, build e navegador; registrar resultados e atualizar roadmap e aprendizados.

## Atenção na revisão

Verificar ordens x/y dos blocos, objetos que atravessam linhas do atlas, alpha e margens dos recortes, alteração indevida da lógica e cache antigo de PWA. Testes cobrem hashes e dimensões; inspeção visual cobre composição e escala.
