"""Elenco jogável do kit de animações: quem é cada personagem e qual roteiro ele usa.

Os 22 clipes têm o mesmo id e a mesma função para todos (direcionamento/17), porque a máquina de
estados do jogo é uma só. O que muda é o corpo, a arma e o golpe:
- clipes de corpo (parado, andar, correr, pular, dano, morte, celebração, AFK) vêm do roteiro do
  Ichigo, com a espada nas costas trocada pela pose de descanso do personagem;
- clipes de golpe vêm do módulo do personagem (cast_<id>.py), um golpe dele para cada situação.

`ruler` diz qual mancha de cor é a régua de escala do personagem (ver process_player_kit.py).
"""
import copy

import cast_grimmjow
import cast_ishida
import cast_sado
from player_kit_anims import ANIMS as ICHIGO_ANIMS
from player_kit_anims import LOOP_NOTE, anim

BODY_CLIPS = ("idle", "walk", "run", "jump", "land", "hurt", "hurt_heavy", "hurt_air", "death", "level_up", "afk")

ICHIGO = (
    "THE CHARACTER (identical in every frame, copied from the attached reference sprites): a young man with short spiky "
    "bright orange hair, black kimono-style robe with wide black hakama trousers, white sash at the waist, white socks "
    "and straw sandals, a brown diagonal strap across the chest. His weapon is a huge cleaver-shaped greatsword as long "
    "as his body, with a broad white-silver blade, a short black wrapped handle and no guard. When a beat says the sword "
    "is on his back, it hangs diagonally behind him exactly as in the references. Same proportions and head size always."
)


def retarget(text: str, rest: str, carry: str, garment: str) -> str:
    """Troca a espada nas costas e o quimono do Ichigo pela pose, pela arma e pela roupa do personagem.
    `rest` é a pose neutra; `carry` é o que ele leva na mão durante o movimento (vazio: nada)."""
    for old in ("Sword stays on his back.", "sword across his back, "):
        text = text.replace(old, "")
    text = text.replace("neutral stance, feet planted, sword on his back", f"neutral stance, feet planted, {rest}")
    text = text.replace("neutral stance, sword on his back", f"neutral stance, {rest}")
    if carry:
        text = text.replace("the sword on his back", carry).replace("sword on his back", carry)
    else:
        for old in (" with the sword on his back", ", sword on his back", " sword on his back"):
            text = text.replace(old, "")
    return text.replace("robe sleeves", garment).replace("robe", garment).replace("hakama", "trousers")


def body_clips(module) -> dict:
    clips = {}
    for clip_id in BODY_CLIPS:
        spec = copy.deepcopy(ICHIGO_ANIMS[clip_id])
        spec["summary"] = retarget(spec["summary"], module.REST, module.CARRY, module.GARMENT)
        spec["beats"] = [retarget(b, module.REST, module.CARRY, module.GARMENT) for b in spec["beats"]]
        clips[clip_id] = spec
    return clips


def build_cast(module) -> dict:
    anims = body_clips(module)
    anims.update(module.combat_clips(anim, LOOP_NOTE))
    missing = set(ICHIGO_ANIMS) - set(anims)
    assert not missing, (module.ID, missing)
    return {"character": module.CHARACTER, "garment": module.GARMENT, "ruler": module.RULER, "anims": anims}


CAST = {
    "ichigo_shikai": {"character": ICHIGO, "garment": "robe sleeves and hakama", "ruler": "orange", "anims": ICHIGO_ANIMS},
    **{m.ID: build_cast(m) for m in (cast_ishida, cast_sado, cast_grimmjow)},
}
