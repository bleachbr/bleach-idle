"""Roteiro dos efeitos de impacto e do voo dos projéteis.

IMPACTS: o estouro que aparece onde um golpe acerta o hollow.
PROJECTILES: o voo de cada habilidade, em laço de 8 quadros (antes eram 4).

Cada impacto é uma folha 4x2 com 8 quadros, gerada pelo Codex com o projétil da mesma habilidade
como referência de paleta e traço. Fundo verde puro: o magenta, o fundo das outras folhas, se
confunde com o roxo da Muerte e com o rosa do Directo.
`fps` vai para o registro de FX (src/characters.js) e para o manifesto da pasta.
"""

COLS, ROWS = 4, 2
FRAMES = COLS * ROWS

IMPACTS = {
    "hit_getsuga": {
        "ref": "skill_getsuga",
        "fps": 18,
        "look": "a crescent wave of pale cyan and white spiritual energy with deep blue edges, like the Getsuga Tensho wave",
        "burst": "the crescent wave crashes into a target: a bright white flash, then the crescent shatters into curved cyan "
                 "blade shards and streaks that fly outward in an arc, then thin and fade into small sparks",
    },
    "hit_cero": {
        "ref": "skill_cero",
        "fps": 16,
        "look": "a sphere of deep blue and white energy crackling with thin white lightning, like the Cero blast",
        "burst": "the energy sphere detonates: a white core flash, a round shockwave ring of blue energy expanding outward "
                 "with lightning arcs, then the ring breaks into crackling fragments that fade",
    },
    "hit_quincy_arrow": {
        "ref": "skill_quincy_arrow",
        "fps": 20,
        "look": "a thin arrow of pale blue spirit light with cyan streaks, like a Quincy spirit arrow",
        "burst": "the arrow pierces a target: a sharp small white star flash, a tight burst of cyan needle-like rays and a "
                 "small hexagonal spark ring, then the rays shrink into floating blue motes that fade",
    },
    "hit_directo": {
        "ref": "skill_directo",
        "fps": 18,
        "look": "a heavy blast of dark red and crimson spirit energy shaped like a fist, with a dark outline",
        "burst": "a giant crimson punch lands: a heavy white-and-red flash, a thick red shockwave ring with jagged spikes "
                 "pushing outward, chunky red energy debris flying out, then dissipating into dark red smoke puffs",
    },
    "hit_muerte": {
        "ref": "skill_muerte",
        "fps": 14,
        "look": "pale violet and white ghostly energy with dark purple outlines, shaped like a horned skull spirit",
        "burst": "the ghostly skull blast hits: a pale violet flash, ghostly white wisps and violet flames burst outward, a "
                 "faint horned skull shape appears in the center for a moment, then everything swirls away into violet smoke",
    },
    "hit_slash": {
        "ref": "slash_combat",
        "fps": 22,
        "look": "a sharp sword slash trail of white and pale cyan light with a deep blue outline",
        "burst": "a sword cut lands: a thin bright diagonal slash line flashes across the center, a short X-shaped burst of "
                 "white light and small cyan sparks shoots out from the cut, then the line thins and the sparks fade",
    },
}

# Voo em laço: o projétil aponta para a DIREITA (o jogo gira o desenho para a direção do voo,
# src/fx/flightPose.js). A referência é o próprio voo antigo de 4 quadros.
# `fps` é o do jogo (FX_BEHAVIORS em src/fx/fxConfig.js); sem entrada lá, vale o do Getsuga.
PROJECTILES = {
    "skill_getsuga": {
        "fps": 24,
        "look": "a large crescent wave of pale cyan and white spiritual energy with deep blue edges, its convex side "
                "facing RIGHT, with short cyan speed streaks trailing to the left",
        "motion": "the crescent ripples and its edges flicker like a flame front, the trailing streaks stream and break "
                  "off to the left",
    },
    "skill_cero": {
        "fps": 24,
        "look": "a sphere of deep blue and white energy crackling with thin white lightning, flying to the RIGHT with "
                "short lightning tails trailing to the left",
        "motion": "the sphere pulses slightly and spins, the lightning arcs jump to new places in every frame",
    },
    "skill_byakurai": {
        "fps": 24,
        "look": "a thin horizontal zigzag bolt of white and pale cyan lightning pointing to the RIGHT, with tiny white "
                "star sparks around it",
        "motion": "the zigzag shape changes every frame like real lightning, sparks blink on and off; the bolt "
                  "stays complete and equally bright in all 8 frames, it never fades, thins out or breaks apart",
    },
    "skill_shakkaho": {
        "fps": 20,
        "look": "a red-orange fireball with a bright yellow-white core flying to the RIGHT, flame tongues trailing to "
                "the left",
        "motion": "the flames lick and swirl backwards, small embers peel off the tail and the core flickers",
    },
    "skill_quincy_arrow": {
        "fps": 24,
        "look": "a thin straight arrow of pale blue spirit light pointing to the RIGHT, with cyan speed streaks trailing "
                "to the left",
        "motion": "the arrow stays rigid while the trailing streaks flow backwards and shimmer, tiny motes drift off",
    },
    "skill_directo": {
        "fps": 24,
        "look": "a heavy blast of dark red and crimson spirit energy shaped like a clenched fist punching to the RIGHT, "
                "with a dark outline and red energy smoke trailing to the left",
        "motion": "the fist stays solid while the smoky red energy trail churns and flows backwards",
    },
    "skill_muerte": {
        "fps": 24,
        "look": "a pale violet and white ghostly horned skull spirit with dark purple outlines, facing RIGHT, ghostly "
                "violet flames streaming behind it to the left",
        "motion": "the skull's jaw opens and closes, the ghostly flames whip and curl backwards",
    },
}

