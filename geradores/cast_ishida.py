"""Golpes do Ishida: lâmina espiritual curta no corpo a corpo, arco espiritual à distância.

Mapa para as armas do jogo: Asauchi -> lâmina; Getsuga -> disparo carregado do arco;
Byakurai -> flecha rápida; Shakkahō -> disparo ajoelhado. A flecha nunca é desenhada: o jogo
desenha o projétil.
"""
ID = "ishida"
RULER = "fixed"
GARMENT = "cape"
REST = "bow held low at his side in his left hand"
CARRY = "the bow in his left hand"

CHARACTER = (
    "THE CHARACTER (identical in every frame, copied from the attached reference sprites): a slim young man with neat "
    "straight black hair with a dark blue sheen, thin rectangular glasses, a long white high-collared tunic with light "
    "blue trim, a white cape hanging from his shoulders, white trousers and white boots, white gloves. His main weapon is "
    "a slender bow made of glowing light-blue spirit energy, held in his LEFT hand; when a beat says the bow is at rest, "
    "he holds it low at his side exactly as in the references. The bow is NEVER worn on his back: in the back view it is still held in his left hand, visible beside his body. He carries NOTHING on his back: no sword, no quiver, no strap. Only during melee attacks his RIGHT hand holds a short silver hilt "
    "that projects a thin straight light-blue crystal blade, drawn as solid pixel art like the bow; when he is not attacking, that hilt is hidden and his right hand is empty. Same proportions and "
    "head size always."
)

READY_BLADE = "ready stance, bow low in the left hand, short light-blue blade held forward in the right hand"
DRAW = "draws the bow: left arm fully extended toward where he faces holding the bow, right hand pulling the string back to his cheek"


def combat_clips(anim, loop_note):
    return {
        "slash_a": anim("First combo strike: a fast horizontal slash with the short crystal blade in his right hand, feet planted.", [
            f"neutral stance, {REST}, right hand reaching to his hip for the hilt.",
            "the thin blade appears in his right hand, held low.",
            "winds up: right arm crosses his chest, blade pointing behind him, torso turning away.",
            "anticipation hold, weight on the back foot, cape swinging.",
            "front foot steps forward, hips turning, blade starts moving.",
            "blade sweeping at mid swing, arm extending.",
            "impact pose: right arm fully extended, blade straight out toward where he faces, widest silhouette.",
            "blade passing the far side, torso twisted through.",
            "follow-through: blade far on the other side, cape flaring.",
            "recoil: blade slows, shoulders relaxing.",
            "recovering: pulls the blade back in, front foot sliding back.",
            f"{READY_BLADE}.",
        ], fps=24),
        "slash_b": anim("Second combo strike: a rising backhand cut with the short crystal blade, standing in place.", [
            f"{READY_BLADE}.",
            "drops lower, blade dipping behind on the far side, knees bend.",
            "low wind-up: blade near the floor behind him without touching it, torso twisted.",
            "anticipation hold, body coiled, glasses glinting.",
            "starts rising: legs extend, blade starts upward.",
            "blade at hip height moving upward, hips turn.",
            "impact pose: blade rising across his body at chest height, arm extended toward where he faces.",
            "blade above head height, body stretched on tiptoe, cape lifting.",
            "follow-through: blade high over the far shoulder.",
            "heels return to the floor, blade starting to fall.",
            "recovering: elbow in, blade lowering.",
            f"{READY_BLADE}.",
        ], fps=24),
        "slash_c": anim("Third combo finisher: a lunging straight thrust with the crystal blade, the strongest strike of the combo.", [
            f"{READY_BLADE}.",
            "pulls the right arm far back, blade pointing forward at shoulder height.",
            "weight shifts onto the back foot, knees bend, aiming along the blade.",
            "deepest coil: right elbow far behind, left hand with the bow raised for balance.",
            "biggest anticipation: whole body compressed like a spring, cape hanging still.",
            "explosive start: front foot shoots forward.",
            "lunging: body stretches forward, blade driving ahead.",
            "impact pose: deepest lunge, right arm fully extended, blade point straight ahead toward where he faces.",
            "holds the impact, cape and hair overshoot forward.",
            "starts pulling back the blade, back straightening.",
            "front foot slides back, blade returning to his side.",
            f"{READY_BLADE}.",
        ], fps=24),
        "air_slash": anim("Slash performed in mid-air with the crystal blade: no feet on any floor, knees tucked, cape floating.", [
            "airborne, knees tucked, blade held near the right shoulder.",
            "torso turning away, blade going behind him.",
            "aerial wind-up: back arched, blade far behind, knees apart.",
            "anticipation hold, hair and cape floating.",
            "whips forward: hips snap, blade starts moving.",
            "blade at mid swing, legs swing the opposite way for balance.",
            "impact pose: right arm fully extended forward, blade straight out, legs trailing back.",
            "blade passing to the far side, body rotating with it.",
            "follow-through: body curled around the swing.",
            "pulling in: knees tucked again.",
            "blade returns near the shoulder, cape floating.",
            "airborne compact pose ready to land.",
        ], fps=24),
        "move_slash": anim("Slash while running: the legs NEVER stop striding, only the torso and right arm slash with the crystal blade.", [
            "running stride, right foot forward, blade low in the right hand, bow in the left.",
            "stride continues, passing, torso twists away to wind up.",
            "left foot forward, blade behind him, torso twisted.",
            "stride continues, passing, hips begin to rotate.",
            "right foot forward, blade starts swinging.",
            "stride continues, blade at mid swing.",
            "left foot forward, impact pose: right arm fully extended, blade straight out toward where he runs.",
            "stride continues, blade passing the far side.",
            "right foot forward, follow-through.",
            "stride continues, passing, blade returning.",
            "left foot forward, blade comes low in front.",
            "stride continues, passing, blade low in the right hand, same as frame 1.",
        ], fps=24, loop_note="The feet positions of frame 12 must be able to connect back into a running cycle."),
        "getsuga": anim("Signature charged shot: plants his feet, draws the spirit bow to full power and releases a single huge shot (no arrow or energy drawn, only the body and the bow).", [
            f"neutral stance, {REST}.",
            "turns his side toward the target, feet wide apart.",
            "raises the bow with the left arm, right hand coming to the string.",
            f"{DRAW}, string half pulled.",
            "string pulled further, the bow bending, cape starting to lift from below.",
            "full draw, maximum charge: back straight, elbow high, hair and cape blown upward by power.",
            "holds the full draw, perfectly still, eyes narrowed behind the glasses.",
            "release: right hand opens and snaps back past his ear, the string vibrates.",
            "recoil: shoulders pushed back, cape whipping forward.",
            "holds the follow-through, right hand open behind his head.",
            "lowers the bow, right arm returning.",
            f"neutral stance, {REST}.",
        ], fps=20),
        "move_getsuga": anim("Charged bow shot while running: the legs never stop striding while he draws the bow to full power and releases.", [
            "running stride, right foot forward, bow in the left hand.",
            "stride continues, passing, bow rising.",
            "left foot forward, bow arm extended toward where he runs, right hand on the string.",
            "stride continues, string half pulled, cape flying back.",
            "right foot forward, full draw, elbow high.",
            "stride continues, holds the full draw.",
            "left foot forward, release: right hand snaps back past his ear.",
            "stride continues, recoil, shoulders pushed back.",
            "right foot forward, holds the follow-through.",
            "stride continues, bow lowering.",
            "left foot forward, arms return to pumping.",
            "stride continues, passing, bow in the left hand, same as frame 1.",
        ], fps=22),
        "byakurai": anim("Quick single shot: a fast draw and release of the spirit bow while standing (no arrow drawn).", [
            f"neutral stance, {REST}.",
            "the bow snaps up, left arm rising toward where he faces.",
            "left arm fully extended with the bow, right hand meets the string.",
            "pulls the string quickly, elbow rising.",
            "string at his cheek, full draw, feet set.",
            "aims: holds the full draw for an instant, eyes on target.",
            "release: right hand snaps open and back.",
            "recoil: bow arm kicks up slightly, cape flutters.",
            "recoil peak, weight on the back foot.",
            "bow starts lowering, right hand relaxing.",
            "bow returning to his side, feet closing.",
            f"neutral stance, {REST}.",
        ], fps=20),
        "shakkaho": anim("Heavy kneeling shot: drops to one knee, aims the spirit bow and releases a powerful shot (no arrow drawn).", [
            f"neutral stance, {REST}.",
            "steps back with one foot, bow rising.",
            "drops to one knee, bow raised in the left hand.",
            "kneeling, right hand takes the string.",
            "kneeling, pulling the string, cape spreading on the floor behind.",
            "kneeling full draw: elbow high, aiming toward where he faces, maximum charge.",
            "holds the full draw, cape lifting from below.",
            "release: right hand snaps back past his ear, the bow vibrates.",
            "recoil pushes his shoulders back, still kneeling.",
            "lowers the bow, starts to rise.",
            "standing up, bow returning to his side.",
            f"neutral stance, {REST}.",
        ], fps=20),
        "move_kido": anim("Quick shot while running: the legs never stop striding, he raises the bow, fires once and keeps running (no arrow drawn).", [
            "running stride, right foot forward, arms pumping, bow in the left hand.",
            "stride continues, passing, bow rising.",
            "left foot forward, bow arm extending toward where he runs.",
            "stride continues, right hand on the string.",
            "right foot forward, quick full draw.",
            "stride continues, release, right hand snaps back.",
            "left foot forward, holds the follow-through, cape flapping back.",
            "stride continues, slight recoil of the bow arm.",
            "right foot forward, bow lowering.",
            "stride continues, passing, arms returning.",
            "left foot forward, arms pumping again.",
            "stride continues, passing, arms pumping, same as frame 1.",
        ], fps=22),
        "victory": anim("Victory pose after beating the boss: lowers the bow, pushes his glasses up with one finger and stands proud while his cape settles.", [
            f"neutral stance, {REST}, breathing out.",
            "straightens his back, chin rising.",
            "right hand rises toward his face.",
            "index finger touches the bridge of the glasses.",
            "pushes the glasses up, the lenses glint.",
            "holds the gesture, eyes closed, a slight smile.",
            "lowers the right hand, the bow turning in the left hand.",
            "turns the bow, resting it upright beside him.",
            "cape billows once behind him.",
            "cape settling, chin high.",
            "confident pose, bow upright at his side, right hand on his hip.",
            "same final pose, cape still, holds still.",
        ], fps=14),
    }
