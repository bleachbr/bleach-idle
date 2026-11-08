# Roadmap

Fonte única do que está aberto. Caixa entregue fica numa linha; o relato vai para [_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md). Estado de hoje: [STATUS.md](STATUS.md).

**Última atualização:** 2026-11-07

A visão que estava em `ENTREGAS_ROADMAP.md` mora aqui desde 2026-11-07. Aquele arquivo só aponta para este.

## Frente 0 — já está no código

- [x] Loop Vite/Three com arena, câmera orbital e billboards (`src/main.js`, [direcionamento/05](direcionamento/05-camera-orbital-movimento-e-billboard-360.md))
- [x] Pipeline de sprites e normalização 360 (`geradores/`, [direcionamento/07](direcionamento/07-diretrizes-normalizacao-sprites-e-testes.md))
- [x] Ichigo shikai com ciclo de 8 frames em `src/assets/characters/ichigo_shikai/`
- [x] FX por configuração (`src/fx/`, [direcionamento/09](direcionamento/09-arquitetura-escalavel-fx-e-projeteis.md))
- [x] Horda, reishi, level-up, armas e boss Menos Grande, com tela de fim (tempo, nível, abates, dano, censo, dano por arma)
- [x] Gerador de mapas procedural por diretrizes de IA e bioma Hueco Mundo 3D com dunas, 99 props e estúdio 360° ([_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md))

## Frente 1 — aceite da versão 1

- [x] Partida jogada no browser com evidência no changelog: sobrevivência no Hueco Mundo, 3 cartas de level-up em tempo real, confronto e purificação do Menos Grande Gillian, tela de vitória com estatísticas e reinício em memória sem reload ([_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md))
- [x] Menu de início estilo PokéBonk e volta ao menu com nickname Shinigami, rotação orbital cinemática de fundo, botões de estúdios 360° e retorno ao menu via pausa/fim de jogo (`src/menu.js`, [direcionamento/13](direcionamento/13-menu-login-pokebonk-e-navegacao-de-estudios.md))
- [x] Visual canônico e unificado dos Hollows da V1: horda composta por Fishbone D e Chefão Menos Grande Gillian com ciclo walk8 de 8 frames em 4 direções, eliminando placeholders provisórios (`src/assets/monsters/`, [direcionamento/14](direcionamento/14-normalizacao-hollows-v1-fishbone-e-gillian.md))
- [x] Hollow elite (contorno carmesim, 200 HP, escala 2.2x, drop de 6 Reishi e censo) como entidade ativa em campo (`src/main.js`, [direcionamento/15](direcionamento/15-joystick-virtual-mobile-e-hollow-elite.md))
- [x] Joystick virtual no mobile com stick analógico flutuante, arrasto de câmera touch e botão de salto dedicado (`src/joystick.js`, [direcionamento/15](direcionamento/15-joystick-virtual-mobile-e-hollow-elite.md))

## Frente 2 — versão 2

- [x] Integração de Kidō com projéteis e sprites canônicos: Hadō #4 Byakurai (raio elétrico perfurante veloz) e Hadō #31 Shakkahō vinculados ao FXManager (`src/fx/`, [_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md))
- [ ] Variedade adicional de hollows (Shrieker com aproximação em zigue-zague, Acidwire com projéteis ácidos)
- [ ] Mapas Soul Society, Karakura Town e Dangai
- [ ] Shikai no nível 15 e Bankai no nível 35, com troca de sprite
- [ ] Elenco jogável além do Ichigo shikai em uso
- [ ] Metaprogressão na loja do Urahara
- [ ] Modo infinito e boss rush

## Frente 3 — engenharia do protótipo

- [x] CI diz a verdade sobre este `package.json`: gitleaks, quality e build; jobs do bleach-idle removidos ([_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md))
- [ ] `make docker-build` gera imagem (pendência 2)
- [ ] Um alvo de teste do jogo, versionado, para câmera, sprite e FX. Os scripts em `scratch/` não entram no git

## Radar

Pedido novo que passou pela skill `triagem-pedido` entra aqui numa linha: data, veredicto (`aceito`, `adiado` ou `recusado`) e motivo. Sem pedido triado nesta data.
