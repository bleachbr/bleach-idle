# 18 - Hollows Shrieker e Acidwire

Dois tipos novos na horda comum, cada um com um comportamento que obriga o jogador a reagir de outro jeito. A norma de escala continua em [07](07-diretrizes-normalizacao-sprites-e-testes.md), e o formato dos clipes é o do kit do jogador em [17](17-kit-animacoes-personagem.md).

## O que cada um faz

| Tipo | Aparece a partir de | Comportamento | Clipes |
|---|---|---|---|
| Fishbone | 0 s | Anda reto até o jogador e dá uma investida com mordida a menos de 1,3 m (só animação) | walk8, `attack`, `hurt`, `death` |
| Shrieker | 25 s | Rápido e frágil. Aproxima em zigue-zague e dá uma investida com as garras a menos de 1,8 m | walk8, `attack`, `hurt`, `death` |
| Acidwire | 50 s | Lento e resistente. Fica entre 5 e 9 m, recua se o jogador chega perto e cospe ácido em arco a até 13 m | walk8, `attack`, `hurt`, `death` |
| Elite | a cada 35 s | Fishbone reforçado (200 HP, escala 2,2), com desenho próprio | walk8, `attack`, `hurt`, `death` |

Atributos, peso no sorteio e tempos de ataque ficam em `HOLLOW_TYPES` (`src/hollowTypes.js`). O módulo não usa Three.js e tem teste em `scripts/test_hollow_types.py`. O elite continua sendo um Fishbone reforçado nos atributos, mas tem sprites próprios em `src/assets/monsters/elite` (`python geradores/gen_codex.py elite`, depois `--walk8 elite`, `sprite_processor.py -c monsters -t walk8 --approve` e `gen_hollow_clips.py elite`). Teste em `scripts/test_hollow_elite.py`.

O cuspe mira onde o jogador estava no disparo, então quem se move desvia, e o pulo passa por cima do arco. A configuração do projétil fica em `hollow_acid_spit` (`src/fx/fxConfig.js`), e o desenho em `src/fx/acidSpit.js`. O dano (14) está no ataque do Acidwire, junto com as outras regras.

O Elite tem `attack`, `hurt` e `death` em `elite/clips`. O Menos Grande (chefe) tem os mesmos clipes em `menos_grande/clips`.

## Dano e impacto

Cada acerto faz o hollow piscar em branco e tocar o clipe `hurt` (12 quadros a 22 fps, cerca de 0,55 s). O tranco é só visual: o hollow segue andando, o tranco não corta um golpe em curso e tem recarga de 1 s (`HURT` em `src/hollowTypes.js`). Assim um hollow sob fogo contínuo ainda ataca. O Acidwire não fica parado nem cospe durante o tranco.

No ponto do acerto aparece um estouro próprio do golpe (`IMPACT_FOR` em `src/fx/impactRules.js`), que toca uma vez e some:

| Golpe | Estouro |
|---|---|
| Getsuga Tenshō | `hit_getsuga` |
| Byakurai | `hit_byakurai` |
| Shakkahō | `hit_shakkaho` |
| Cero | `hit_cero` |
| Flecha Quincy | `hit_quincy_arrow` |
| El Directo | `hit_directo` |
| La Muerte | `hit_muerte` |
| Corte corpo a corpo | `hit_slash` |

O estouro herda a cor do arsenal (o Getsuga azul do Grimmjow estoura azul, e o corte, a cor do corte do personagem). São no máximo 48 estouros vivos; acima disso, o mais velho dá a vez. O desenho fica em `src/fx/impactFx.js`, criado pelo `FXManager`.

Os estouros novos têm 8 quadros e saem do Codex com o projétil da mesma habilidade como referência:

```bash
python geradores/gen_impact_fx.py
```

```bash
python geradores/process_impact_fx.py
```

O roteiro está em `geradores/impact_fx.py`. O fundo é verde puro, porque o magenta se confunde com o roxo da Muerte. Para acrescentar só um clipe a um hollow sem refazer as outras tiras, use `python geradores/process_hollow_clips.py fishbone:hurt`.

A morte toca o clipe inteiro e depois some em 0,5 s. Enquanto morre, o hollow não recebe golpe e o pool não reaproveita a malha (`en.dying`).

## Regenerar

```bash
python geradores/gen_codex.py --walk8 shrieker acidwire
```

```bash
python geradores/sprite_processor.py
```

O walk8 já está em `src/assets/monsters/`. Os clipes usam as poses paradas dele como referência:

```bash
python geradores/gen_hollow_clips.py shrieker:attack:front
```

```bash
python geradores/process_hollow_clips.py
```

```bash
python geradores/validate_hollow_clips.py
```

O roteiro quadro a quadro está em `geradores/hollow_clip_anims.py`. O gerador pula imagem bruta que já existe em `arts/codex/hollows/`.

## Por que a régua é o quadro 1

O monstro não tem uma mancha de cor estável como o cabelo do jogador, e a caixa de um golpe ou de uma queda mede a pose, não o corpo. O roteiro fixa o quadro 1 de todo clipe como a pose parada da caminhada, e esse quadro passa a medir os 107 px do walk8. A imagem inteira usa a mesma escala.

O despill só age no contorno da silhueta. Ver [aprendizados](../aprendizados.md) item 15.
