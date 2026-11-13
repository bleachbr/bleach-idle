"""Roteiro quadro a quadro dos clipes de ataque e morte dos hollows (Fishbone, Shrieker, Acidwire, Elite e Menos Grande).

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

FISHBONE = (
    "THE CREATURE (identical in every frame, copied from the attached reference sprites): a tall, thin, hunched fish-like "
    "humanoid monster with dark blue-gray skin, long arms ending in webbed claws with pink tips, digitigrade legs with "
    "clawed feet, rows of pale bone fin spikes along its back, shoulders and forearms, a cream-white bone mask shaped like "
    "a fish skull with a long jaw full of needle teeth and a tall crest spike on top, and a round hole through the chest "
    "rimmed in dark red. Same proportions and mask size always."
)

MENOS = (
    "THE CREATURE (identical in every frame, copied from the attached reference sprites): a giant spirit shaped like a tall "
    "narrow cone wrapped in a floor-length tattered jet-black cloak, a ring of cream-white bone spikes around the collar, "
    "and a cream-white bone mask with a very long pointed beak-like nose and small dark eye holes at the top. It has NO "
    "arms; only two small black feet peek out under the cloak. Same proportions and mask size always."
)

ELITE = (
    "THE CREATURE (identical in every frame, copied from the attached reference sprites): a hulking, heavily armored brute "
    "monster, much broader than a man, standing upright on thick digitigrade legs with long heavy arms hanging to its "
    "knees. Black body with dark charcoal shading, jagged crimson-red bone armor plates on the shoulders, forearms, shins "
    "and along the spine, long crimson claws, a white bone mask shaped like a horned demon skull with two thick curved "
    "horns, a jaw of fangs and glowing red eye holes, and a round hole through the chest rimmed in crimson. Same "
    "proportions and mask size always."
)

HOLLOWS = {
    "fishbone": {
        "creature": FISHBONE,
        "clips": {
            "attack": clip("A pouncing bite: it crouches, lunges forward with its jaw open and claws out, bites and slashes, then recovers.", [
                "crouches lower, knees bending, claws spreading open.",
                "jaw starts to open, head pulls back, fin spikes bristle.",
                "deepest crouch, jaw wide open showing the needle teeth, claws raised: biggest anticipation.",
                "holds, body coiled like a spring.",
                "explosive lunge forward toward where it faces, arms reaching ahead.",
                "impact pose: body stretched forward, jaw snapping shut, both claws slashing across, widest silhouette.",
                "claws pass through, body leaning far forward on the front foot.",
                "follow-through: arms low on the far side, head down.",
                "pulls back, jaw closing.",
                "steps back to its hunched stance.",
                "almost back to the pose of frame 1.",
            ], fps=16),
            "death": clip("Death: it is struck, recoils, its fish-skull mask cracks and it collapses to the ground, ending lying flat and still.", [
                "violent recoil, head snapped back, claws jerk open.",
                "staggers back, a crack appears across the bone mask.",
                "mask cracking more, arms going limp, fin spikes drooping.",
                "knees buckle, it starts to fall.",
                "on its knees, claws hanging to the floor, head bowed.",
                "torso falling forward, one claw reaching out.",
                "collapsing onto the floor, arms sprawled.",
                "lying face down on the floor, legs bent.",
                "a last twitch of one claw.",
                "lying still on the floor, mask broken.",
                "lying completely still on the floor, the same pose as frame 11.",
            ], fps=12),
        },
    },
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
    "elite": {
        "creature": ELITE,
        "clips": {
            "attack": clip("A two-handed ground pound: it raises both heavy armored arms over its horned head and brings both fists down to the ground in front of it, then straightens up.", [
                "shoulders hunch, armor plates bristling, claws flexing.",
                "both arms start rising, chest puffing out.",
                "both arms raised high over the horns, claws locked together, body leaning back: biggest anticipation.",
                "holds the raised pose for a moment, jaw open.",
                "starts swinging both arms down toward where it faces, torso bending forward.",
                "pound pose: torso bent far forward, both arms down and forward, fists almost touching the floor in front, widest silhouette.",
                "holds the pose, knees deeply bent.",
                "starts lifting back up, arms coming back.",
                "rising, arms swinging to its sides.",
                "almost upright, shoulders rolling.",
                "almost back to the pose of frame 1.",
            ], fps=14),
            "death": clip("Death: it is struck, staggers, its horned mask cracks and the armor plates break off as it drops to its knees and crashes face down, ending lying flat and still.", [
                "violent recoil, head snapped back, arms flung wide.",
                "staggers back a heavy step, a crack runs across the horned mask.",
                "mask cracking more, one horn chipping, armor plates loosening.",
                "knees buckle, its huge weight starts to drop.",
                "on its knees, arms hanging to the floor, head bowed.",
                "torso tipping forward, one claw reaching out.",
                "crashing onto the floor face down, armor plates scattering.",
                "lying face down on the floor, arms sprawled.",
                "a last twitch of one claw.",
                "lying still on the floor, mask broken.",
                "lying completely still on the floor, the same pose as frame 11.",
            ], fps=12),
        },
    },
    "menos_grande": {
        "creature": MENOS,
        "clips": {
            "attack": clip("A crushing slam: having no arms, it rears its whole cloaked body back, opens the beak of its mask, then bends its huge body forward and down to crush what is in front of it, then straightens up.", [
                "sways back slightly, the cloak hem lifts, the spike collar bristles.",
                "rears back, the long beak rising toward the sky.",
                "fully reared back, beak pointing up and slightly open, cloak stretched tight: biggest anticipation.",
                "holds, the whole body trembling, cloak hem fluttering.",
                "starts to fall forward toward where it faces, beak swinging down.",
                "slam pose: the whole tall body bent far forward like a falling tower, beak thrust down and forward, cloak flaring behind.",
                "holds the slam, the cloak hem billowing out on the ground.",
                "starts lifting back up, beak closing.",
                "rising, body halfway back to upright.",
                "almost upright, cloak settling.",
                "almost back to the pose of frame 1.",
            ], fps=12),
            "death": clip("Death: the giant is struck, its long-nosed mask cracks, the cloak sags and the whole tall body topples and collapses to the ground, ending lying flat and still.", [
                "violent recoil, the beak snaps upward, the cloak jerks.",
                "sways back, a crack runs down the long bone mask.",
                "the crack spreads, pieces of the spike collar chip away, the body leans.",
                "the tall body starts tilting to one side.",
                "tilting more, the cloak hem lifting off one foot.",
                "falling like a cut tree, the beak swinging toward the floor.",
                "the body hits the floor, the cloak crumpling.",
                "lying on the floor, the cloak spread out in a pool of black cloth, the cracked mask on its side.",
                "a last ripple through the cloak.",
                "lying still on the floor, mask broken.",
                "lying completely still on the floor, the same pose as frame 11.",
            ], fps=10),
        },
    },
}


# Reação ao golpe: um tranco curto que volta à pose parada, para o jogo tocar a cada acerto
# sem que o hollow pareça parar de andar. `limbs` diz o que chicoteia em cada criatura.
def hurt(limbs):
    return clip("Hit reaction: it is struck hard from the front, flinches back sharply and recovers to its standing pose. "
                "It stays on its feet the whole time and never falls; the feet stay planted in place.", [
        "struck: the whole body snaps back from the impact, the mask jerks up and back, " + limbs + " fly forward.",
        "biggest recoil: body leaning far back, mask tilted up, " + limbs + " flung out: the widest flinch.",
        "holds the recoil, the body trembling.",
        "starts to straighten, head coming forward again.",
        "a small second shake, " + limbs + " still swinging.",
        "body almost upright, slightly hunched.",
        "head and mask back to their place, " + limbs + " settling.",
        "a tiny overshoot forward.",
        "settling back.",
        "almost back to the pose of frame 1.",
        "the same pose as frame 1.",
    ], fps=22)


HURT_LIMBS = {
    "fishbone": "the long clawed arms",
    "shrieker": "the bat wings and clawed arms",
    "acidwire": "the clawed arms and tendril hair",
    "menos_grande": "the tattered cloak hem and the long beak",
}
for _hollow, _limbs in HURT_LIMBS.items():
    HOLLOWS[_hollow]["clips"]["hurt"] = hurt(_limbs)

# O Elite tem roteiro próprio, com palavras neutras: com o texto comum, o image_gen bloqueou a vista de
# costas dele (aprendizados 26). Vale só para ele; os outros seguem com hurt().
HOLLOWS["elite"]["clips"]["hurt"] = clip(
    "Hit reaction: it rocks back from a push to the front of its body and returns to its standing pose. "
    "It stays on its feet the whole time; the feet stay planted in place.", [
        "rocks back: the upper body tips backward, the horned mask tilts up, the heavy arms swing forward.",
        "furthest lean: body tipped back, mask tilted up, arms out to the sides.",
        "holds the lean for a moment.",
        "starts to straighten, head coming forward again.",
        "a small second sway, arms still swinging.",
        "body almost upright, slightly hunched.",
        "head and mask back to their place, arms settling.",
        "a tiny overshoot forward.",
        "settling back.",
        "almost back to the pose of frame 1.",
        "the same pose as frame 1.",
    ], fps=22)
