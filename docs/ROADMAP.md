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

## Frente 1 — aceite da versão 1

- [ ] Partida jogada no browser, com evidência no changelog: sobreviver, três cartas, boss, vitória ou derrota, e reiniciar. O reinício que existe é `location.reload()` no `btn-restart` (`src/main.js`)
- [ ] Menu de início e volta ao menu. Não há os dois: a partida entra direto e a tela de fim só recarrega a página
- [ ] Shrieker e Acidwire com comportamento próprio (aproximação em zigue-zague, projétil). Hoje os três hollows só diferem em HP e velocidade (`spawnHollow` em `src/main.js`)
- [ ] Hollow elite (contorno e vida) como entidade, não só nome no doc antigo
- [ ] Joystick virtual no mobile

## Frente 2 — versão 2

- [ ] Mapas Soul Society, Hueco Mundo e Dangai
- [ ] Shikai no nível 15 e Bankai no nível 35, com troca de sprite
- [ ] Elenco jogável além do Ichigo shikai em uso
- [ ] Metaprogressão na loja do Urahara
- [ ] Modo infinito e boss rush

## Frente 3 — engenharia do protótipo

- [ ] CI diz a verdade sobre este `package.json`, ou o workflow do bleach-idle sai do caminho (pendência 1)
- [ ] `make docker-build` gera imagem (pendência 2)
- [ ] Um alvo de teste do jogo, versionado, para câmera, sprite e FX. Os scripts em `scratch/` não entram no git

## Radar

Pedido novo que passou pela skill `triagem-pedido` entra aqui numa linha: data, veredicto (`aceito`, `adiado` ou `recusado`) e motivo. Sem pedido triado nesta data.
