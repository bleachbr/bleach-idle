"""Golpes do Ichigo em Bankai: os mesmos do shikai, com a katana preta fina numa mão só.

O roteiro do shikai (player_kit_anims.py) pensa num cutelo enorme guardado nas costas. No Bankai
a espada nunca vai para as costas: fica na mão direita, apontada para baixo, e os golpes ficam mais
rápidos e de uma mão. Aqui o roteiro do shikai é reaproveitado trocando a espada, o saque nas costas
e o manto curto pelo casaco longo. A troca de sprite acontece no nível 35 (src/playerForm.js).
"""
import copy

from player_kit_anims import ANIMS as ICHIGO_ANIMS

ID = "ichigo_bankai"
RULER = "orange"  # o cabelo laranja continua sendo a única mancha laranja, como no shikai (aprendizados 16)
GARMENT = "long coat"
REST = "the slim black katana held low in his right hand, blade pointing down"
CARRY = "the slim black katana in his right hand"

CHARACTER = (
    "THE CHARACTER (identical in every frame, copied from the attached reference sprites): a young man with short spiky "
    "bright orange hair, wearing a long black high-collared coat that reaches his ankles, closed across the chest, with "
    "a dark red inner lining and a ragged, flared hem that splits into tattered strips at the bottom, black trousers, "
    "white socks and straw sandals. His weapon is a slim, completely black katana about as long as his leg, with a "
    "four-pronged black cross-shaped guard and a short broken black chain hanging from the end of the handle. He never "
    "carries anything on his back: the katana is always in his right hand. Same proportions and head size always."
)

COMBAT_CLIPS = ("slash_a", "slash_b", "slash_c", "air_slash", "move_slash", "getsuga", "move_getsuga",
                "byakurai", "shakkaho", "move_kido", "victory")

# A ordem importa: o trecho mais longo sai antes do mais curto que ele contém.
SWAPS = (
    ("draws the sword from the back, right hand on the handle, slight crouch",
     "raises the black katana from his side, slight crouch"),
    ("right arm reaches over his shoulder and grabs the handle", "lifts the black katana from his side"),
    ("pulls the sword up off his back", "turns the katana in his hand"),
    ("the sword stays on his back", "the katana stays low in his right hand"),
    ("with the sword on his back", f"with {REST}"),
    ("sword on his back", REST),
    ("the huge sword held in both hands", "the black katana in his right hand"),
    ("the huge sword in both hands", "the black katana in his right hand"),
    ("with the huge sword", "with the black katana"),
    ("the huge sword", "the black katana"),
    ("both hands on the sword handle", "right hand on the katana handle, left hand open"),
    ("holding the sword low in both hands", "holding the katana low in his right hand"),
    ("sword low in both hands", "katana low in his right hand"),
    ("sword held in both hands", "katana held in his right hand"),
    ("takes the handle with both hands", "grips the katana tightly"),
    ("sword in right hand", "katana in his right hand"),
    ("the flat of the blade", "the back of the black blade"),
    ("sword", "katana"),
    ("robe", "long coat"),
)


def swap_weapon(text: str) -> str:
    for old, new in SWAPS:
        text = text.replace(old, new)
    return text


def combat_clips(anim, loop_note):
    """Mesmos quadros e ritmos dos golpes do shikai, com a espada trocada. `anim` e `loop_note` vêm do
    kit_cast.build_cast, que chama todo módulo de elenco do mesmo jeito."""
    clips = {}
    for clip_id in COMBAT_CLIPS:
        spec = copy.deepcopy(ICHIGO_ANIMS[clip_id])
        spec["summary"] = swap_weapon(spec["summary"])
        spec["beats"] = [swap_weapon(b) for b in spec["beats"]]
        clips[clip_id] = spec
    return clips
