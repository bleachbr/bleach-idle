"""Roteiro quadro a quadro dos clipes de ataque e morte dos hollows Shrieker e Acidwire.

O quadro 1 de cada clipe é a pose parada da caminhada: o processador mede a altura dele para
achar a escala da vista, então ele precisa ser a mesma figura das referências.
`fps` e `loop` também vão para o manifesto lido pelo jogo.
"""

DIRECTIONS = {
    "front": "Seen from the FRONT: it faces down toward the camera, in the same 3/4 top-down view as the front reference.",
    "left": "Seen from its LEFT SIDE: it faces and acts toward the LEFT of the image, as in the side reference.",
    "back": "Seen from BEHIND: it faces up away from the camera, as in the back reference.",
}

FIRST = "neutral standing pose, exactly the same figure, size and pose as the reference sprite for this view."


def clip(summary, beats, fps=14, loop=False):
    assert len(beats) == 11, summary
    return {"summary": summary, "beats": [FIRST, *beats], "fps": fps, "loop": loop}


SHRIEKER = (
    "THE CREATURE (identical in every frame, copied from the attached reference sprites): a winged bat-like monster that "
    "walks hunched on its hind legs, black leathery body with dark purple-gray shading, large ragged bat wings, long thin "
    "arms with hooked white claws, a white bone mask shaped like a screaming bat skull with glowing orange eye holes and a "
    "wide open mouth, and a round hole through its chest. Same proportions and mask size always."
)

ACIDWIRE = (
    "THE CREATURE (identical in every frame, copied from the attached reference sprites): a lanky serpent-humanoid monster "
    "with a long coiled snake-like lower body instead of legs, glossy dark green scales with yellow-green chevron markings, "
    "thin arms ending in dripping claws, a narrow pale bone mask shaped like a snake skull with slit eye holes, long dark "
    "green tendril hair, and a round hole through its chest. Same proportions and mask size always."
)

HOLLOWS = {
    "shrieker": {
        "creature": SHRIEKER,
        "clips": {
            "attack": clip("A lunging claw swipe: it screams, spreads its wings and slashes forward with both claws, then recovers.", [
                "crouches slightly, wings start to open, head pulls back.",
                "wings half spread, mouth opens wider, claws rise.",
                "wings fully spread wide, arms raised high with claws open, screaming: biggest anticipation.",
                "holds the scream, body coiled, weight on the back leg.",
                "explosive lunge forward toward where it faces, wings sweeping back.",
                "impact pose: both arms fully extended forward, claws slashing across, widest silhouette.",
                "claws pass through, body leaning far forward.",
                "follow-through: arms low on the far side, wings flared behind.",
                "pulls back, wings start folding.",
                "steps back to its stance, wings half folded.",
                "almost back to the pose of frame 1.",
            ], fps=16),
            "death": clip("Death: it is struck, recoils, its mask cracks and it collapses to the ground, ending lying flat and still.", [
                "violent recoil, head snapped back, wings jerk open.",
                "staggers back, a crack appears across the bone mask.",
                "mask cracking more, arms limp, wings sagging.",
                "knees buckle, it starts to fall.",
                "on its knees, wings drooping to the floor, head bowed.",
                "torso falling forward, one claw reaching out.",
                "collapsing onto the floor, wings crumpling over it.",
                "lying on the floor, wings spread limp over the body.",
                "a last twitch of one wing.",
                "lying still on the floor, mask broken.",
                "lying completely still on the floor, the same pose as frame 11.",
            ], fps=12),
        },
    },
    "acidwire": {
        "creature": ACIDWIRE,
        "clips": {
            "attack": clip("Acid spit: it rears up on its coiled tail, throws its head back, then snaps it forward and spits; the game draws the acid projectile separately, so no projectile appears in the image.", [
                "tail coils tighter, body starts to rise.",
                "rearing up tall on the coiled tail, claws pulled in to the chest.",
                "head thrown back, jaw opening, chest expanded: biggest anticipation.",
                "holds, body arched back like a drawn bow.",
                "head and neck whip forward toward where it faces.",
                "spit pose: neck fully extended forward, jaw wide open, a few acid drips at the jaw.",
                "jaw still open, body leaning forward, tail sways behind.",
                "jaw closing, head pulls back a little.",
                "body lowering back down onto the coils.",
                "settles, tail sways the other way.",
                "almost back to the pose of frame 1.",
            ], fps=14),
            "death": clip("Death: it is struck, thrashes, its mask cracks and its body coils and collapses to the ground, ending lying flat and still.", [
                "violent recoil, head snapped back, claws open.",
                "thrashing, the tail whips to one side, a crack appears across the mask.",
                "thrashing the other way, mask cracking more.",
                "body sags, arms go limp.",
                "starts falling sideways, tail uncoiling.",
                "torso hits the floor, head falling.",
                "lying on the floor in loose coils, head down.",
                "a last twitch of the tail tip.",
                "the coils relax and flatten on the floor.",
                "lying still on the floor, mask broken.",
                "lying completely still on the floor, the same pose as frame 11.",
            ], fps=12),
        },
    },
}
