# 17 - Kit de animações do personagem principal

Como o jogador ganha um clipe para cada coisa que acontece com ele. A norma de escala e baseline continua em [07](07-diretrizes-normalizacao-sprites-e-testes.md).

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
python geradores/gen_player_kit.py slash_a:left
```

Para regenerar, apague antes a imagem bruta em `arts/codex/kit/`, porque o gerador pula o que já existe.

```bash
python geradores/process_player_kit.py --out src/assets/characters/ichigo_shikai/anims
```

```bash
python geradores/validate_player_kit.py
```

O roteiro quadro a quadro está em `geradores/player_kit_anims.py`. A folha de conferência sai de `geradores/preview_player_kit.py`.

## Por que a escala não vem da caixa do sprite

Num ataque, a caixa inclui a espada, então normalizar por ela encolhe o corpo justo no golpe. A régua é a raiz da área da maior mancha de cabelo. O ajuste da régua é por vista, a partir do `idle`, e o corpo parado fica com os 107 px da norma.

O quadro varia por clipe (128 a 256 px) para caber a espada sem gastar memória de vídeo no resto. A baseline é proporcional ao quadro, então um plano proporcional mantém pés e escala no mesmo lugar.
