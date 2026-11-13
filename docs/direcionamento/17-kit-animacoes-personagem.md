# 17 - Kit de animações dos personagens jogáveis

Como o jogador ganha um clipe para cada coisa que acontece com ele. A norma de escala e baseline continua em [07](07-diretrizes-normalizacao-sprites-e-testes.md).

## Elenco

O elenco jogável é Ichigo (shikai), Ishida, Sado e Grimmjow, e a escolha fica no menu. Todos têm os mesmos 22 clipes, com o mesmo id e o mesmo ritmo, porque a máquina de estados é uma só. Muda o corpo e o golpe:

| Personagem | Arma no roteiro | Asauchi | Getsuga | Byakurai | Shakkahō | Régua |
|---|---|---|---|---|---|---|
| Ichigo | espada nas costas | combo de espada | corte carregado | dedo apontado | palma aberta | cabelo laranja |
| Ishida | arco na mão esquerda, lâmina curta na direita | combo de lâmina | disparo carregado do arco | flecha rápida | disparo ajoelhado | fixa |
| Sado | dois braços blindados, sem arma | combo de socos | soco carregado | soco reto à distância | garra do braço esquerdo | fixa |
| Grimmjow | katana na cintura | cortes de katana | rasgo de garras | soco rápido | disparo pela palma | fixa |
| Ichigo Bankai (forma, nível 35) | katana preta na mão direita | combo de katana | corte carregado | dedo apontado | palma aberta | cabelo laranja |

O projétil e o FX continuam os mesmos para todos; só a pose é do personagem. Quem é cada um e qual roteiro usa está em `geradores/kit_cast.py`. Os clipes de corpo (parado, andar, correr, pular, dano, morte, celebração e AFK) vêm do roteiro do Ichigo, com a espada trocada pela pose do personagem. Os golpes ficam em `geradores/cast_<id>.py`.

O personagem só aparece na escolha depois que `src/assets/characters/<id>/anims/manifest.json` existe.

O Bankai não é uma escolha do menu: é uma forma do Ichigo. `src/playerForm.js` diz qual forma vale para o nível, e `loadPlayerKit` carrega o kit dela (e as texturas de todas as formas já na escolha do personagem). Os golpes do Bankai são os do shikai com a espada trocada, em `geradores/cast_ichigo_bankai.py`.

## O que existe no jogo e qual clipe cobre

Cada clipe tem 12 quadros e 3 vistas desenhadas (frente, perfil esquerdo, costas). O perfil direito espelha o esquerdo pela UV.

| Situação no código | Clipe |
|---|---|
| Parado | `idle` |
| Andando (`updatePlayer`) | `walk` |
| Andando com Shunpo, prólogo no Dangai | `run` |
| Pulo no ar, quadro segue `vy` (`updatePlayerJump`) | `jump` |
| Tocou o chão parado | `land` |
| Asauchi parado, combo de três | `slash_a`, `slash_b`, `slash_c` |
| Asauchi andando / no ar | `move_slash` / `air_slash` |
| Getsuga parado / andando / no ar | `getsuga` / `move_getsuga` / `air_slash` |
| Byakurai e Shakkahō parado | `byakurai`, `shakkaho` |
| Kidō andando | `move_kido` |
| Dano de hollow comum e elite | `hurt` |
| Dano do Menos Grande | `hurt_heavy` |
| Dano no ar | `hurt_air` |
| HP zerado | `death`, depois a tela de fim |
| Fim da escolha de level-up | `level_up` |
| Menos Grande derrotado | `victory` |
| Pausa ou perda de foco (`isAFK`) | `afk` |

Quem decide é `src/playerAnimation.js`, sem Three.js. Quem desenha é `src/playerSprite.js`.

## Regras da máquina de estados

- Ataque de prioridade menor não interrompe o maior. Ordem: `slash`, kidō, `getsuga`, dano, `death`.
- As variantes de um golpe têm os mesmos tempos. Começar a andar no meio troca a variante e mantém o quadro.
- Dano tem espera de 1,5 s no clipe, senão a multidão congela o sprite. O dano em si não muda.
- Em movimento, dano mostra só os 5 primeiros quadros, porque o resto tem os pés plantados.
- Celebrações e `land` cancelam ao andar.

## Regenerar

```bash
python geradores/gen_player_kit.py --char ishida slash_a:left
```

Para regenerar, apague antes a imagem bruta em `arts/codex/kit/<id>/`, porque o gerador pula o que já existe. As referências do kit são `front`, `side_l` e `back` em `src/assets/characters/<id>/`. Quem não tem caminhada no repositório (o Grimmjow) ganha as três vistas com `python geradores/gen_cast_ref.py grimmjow`.

```bash
python geradores/process_player_kit.py --char ishida --out src/assets/characters/ishida/anims
```

```bash
python geradores/validate_player_kit.py --char ishida
```

O roteiro quadro a quadro do Ichigo está em `geradores/player_kit_anims.py`. A folha de conferência sai de `geradores/preview_player_kit.py`.

## Por que a escala não vem da caixa do sprite

Num ataque, a caixa inclui a espada, então normalizar por ela encolhe o corpo justo no golpe. A régua é a raiz da área da maior mancha de cabelo. O ajuste da régua é por vista, a partir do `idle`, e o corpo parado fica com os 107 px da norma.

Cabelo só serve de régua quando a mancha dele é a mesma em toda pose. O preto-azulado do Ishida se mistura ao contorno, o castanho do Sado se mistura à pele, e o cabelo espetado do Grimmjow muda de área quando ele se mexe. Para os três, a régua é fixa: a escala de cada vista sai do `idle` e vale para todos os clipes. Isso funciona porque o Codex mantém o tamanho absoluto do personagem entre imagens: no piloto, o quadro neutro de um golpe mediu de 1 a 3% a mais ou a menos que o `idle`. Ver [aprendizados](../aprendizados.md) item 16.

O quadro varia por clipe (128 a 256 px) para caber a espada sem gastar memória de vídeo no resto. A baseline é proporcional ao quadro, então um plano proporcional mantém pés e escala no mesmo lugar.
