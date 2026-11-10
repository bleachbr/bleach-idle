"""Golpes do Grimmjow: katana numa mão e garras na outra, disparos de energia pela palma e pelo punho.

Mapa para as armas do jogo: Asauchi -> cortes de katana; Getsuga -> rasgo de garras carregado;
Byakurai -> soco rápido que dispara à distância; Shakkahō -> disparo carregado pela palma aberta.
Nenhuma energia é desenhada: o jogo desenha o projétil.
"""
ID = "grimmjow"
RULER = "fixed"
GARMENT = "jacket"
REST = "katana sheathed at his left hip, hands in his pockets"
CARRY = "the katana sheathed at his left hip"

CHARACTER = (
    "THE CHARACTER (identical in every frame, copied from the attached reference sprites): a tall lean young man with "
    "spiky light-blue hair swept back, sharp blue eyes with teal-green markings under them, and a white bone fragment "
    "shaped like a jawbone on the right side of his face. He wears a short white jacket with a high popped collar, open "
    "with rolled-up sleeves showing his bare chest and abdomen, a round hole through his abdomen, a black sash, loose "
    "white trousers and black shoes. His weapon is a katana with a light-blue wrapped handle; when a beat says it is at "
    "rest, it stays sheathed at his left hip exactly as in the references. Same proportions and head size always."
)

READY = "aggressive crouched stance, katana drawn in the right hand held low, left hand open like a claw"


def combat_clips(anim, loop_note):
    return {
        "slash_a": anim("First combo strike: draws the katana from the hip in one fast horizontal one-handed slash, feet planted.", [
            f"neutral stance, {REST}.",
            "right hand grabs the katana handle at the left hip, knees bending.",
            "half draw: blade sliding out of the sheath, torso turned away.",
            "anticipation hold, weight on the back foot, grinning.",
            "explosive draw: front foot steps forward, blade leaving the sheath.",
            "blade sweeping at mid swing, right arm extending.",
            "impact pose: right arm fully extended, blade straight out toward where he faces, widest silhouette.",
            "blade passing the far side, torso twisted through.",
            "follow-through: blade far on the other side, jacket flaring.",
            "recoil: blade slows and dips.",
            "recovering: pulls the blade back, front foot sliding back.",
            f"{READY}.",
        ], fps=24),
        "slash_b": anim("Second combo strike: a rising backhand cut with the katana in one hand, standing in place.", [
            f"{READY}.",
            "drops lower, blade dipping behind on the far side, knees bend.",
            "low wind-up: blade near the floor behind him without touching it, torso twisted.",
            "anticipation hold, body coiled like a big cat.",
            "starts rising: legs extend, blade starts upward.",
            "blade at hip height moving upward, hips turn.",
            "impact pose: blade rising across his body at chest height, arm extended toward where he faces.",
            "blade above head height, body stretched on tiptoe.",
            "follow-through: blade high over the far shoulder.",
            "heels return to the floor, blade starting to fall.",
            "recovering: elbow in, blade lowering.",
            f"{READY}.",
        ], fps=24),
        "slash_c": anim("Third combo finisher: a leaping overhead chop with the katana in both hands, the strongest strike of the combo.", [
            f"{READY}.",
            "left hand joins the right on the handle, stepping back.",
            "katana rising in front of his face, chest opening.",
            "katana overhead, arms straight up, back arched.",
            "highest wind-up: blade pointing up and behind, on tiptoe, biggest anticipation.",
            "explosive start: front foot stomps forward, blade starts coming down.",
            "blade at head height moving down, torso driving forward.",
            "impact pose: deep lunge, arms extended forward and down, blade stopped just above the floor without touching it.",
            "holds the impact, hair and jacket overshoot forward.",
            "starts lifting: blade rises, back straightens.",
            "pulls back: front foot slides back, blade to the side in the right hand.",
            f"{READY}.",
        ], fps=24),
        "air_slash": anim("Slash performed in mid-air with the katana in one hand: no feet on any floor, knees tucked, jacket floating.", [
            "airborne, knees tucked, katana held near the right shoulder.",
            "torso turning away, blade going behind him.",
            "aerial wind-up: back arched, blade far behind, knees apart.",
            "anticipation hold, hair and jacket floating.",
            "whips forward: hips snap, blade starts moving.",
            "blade at mid swing, legs swing the opposite way for balance.",
            "impact pose: right arm fully extended forward, blade straight out, legs trailing back.",
            "blade passing to the far side, body rotating with it.",
            "follow-through: body curled around the swing.",
            "pulling in: knees tucked again.",
            "blade returns near the shoulder.",
            "airborne compact pose ready to land.",
        ], fps=24),
        "move_slash": anim("Slash while running: the legs NEVER stop striding, only the torso and right arm swing the katana.", [
            "running stride, right foot forward, katana low in the right hand.",
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
            "stride continues, passing, katana low in the right hand, same as frame 1.",
        ], fps=24, loop_note="The feet positions of frame 12 must be able to connect back into a running cycle."),
        "getsuga": anim("Signature claw rake: crouches, curls the fingers of the right hand into claws and tears the air with a huge diagonal swipe (no energy or claw marks drawn, only the body).", [
            f"neutral stance, {REST}.",
            "pulls the right hand out of the pocket, fingers curling into claws.",
            "crouches, right claw raised high behind his shoulder, grinning wildly.",
            "deep crouch, right arm cocked far back, jacket lifting from below.",
            "maximum charge: back arched, claw pointing up and back, hair and jacket blown upward by power.",
            "holds the charge, fingers spread like talons.",
            "explosive swipe: hips drive forward, claw coming down diagonally.",
            "claw at chest height in a diagonal rake, deep lunge begins.",
            "release pose: deepest lunge, right arm fully extended diagonally down, fingers spread, biggest silhouette.",
            "holds the release, hair and jacket overshoot forward.",
            "recovers: straightens up, shaking the hand.",
            f"neutral stance, {REST}.",
        ], fps=20),
        "move_getsuga": anim("Claw rake while running: the legs never stop striding while the right hand tears a big diagonal swipe.", [
            "running stride, right foot forward, right hand clawed.",
            "stride continues, passing, claw rising.",
            "left foot forward, claw high behind his shoulder.",
            "stride continues, maximum charge, back arched, hair flying back.",
            "right foot forward, holds the charge.",
            "stride continues, claw starts dropping.",
            "left foot forward, claw at chest height in a diagonal rake.",
            "stride continues, release pose: right arm fully extended diagonally down.",
            "right foot forward, holds the release.",
            "stride continues, arm lifts.",
            "left foot forward, arm comes back in.",
            "stride continues, passing, right hand clawed, same as frame 1.",
        ], fps=22),
        "byakurai": anim("Quick ranged punch: a short snapping jab with the right fist into the air, as if firing a shot (no energy drawn).", [
            f"neutral stance, {REST}.",
            "right hand comes out of the pocket and closes into a fist.",
            "fist pulled to the chin, shoulders turning.",
            "quick wind-up, weight on the back foot, smirking.",
            "snaps the jab forward, arm straightening.",
            "full extension: right arm straight toward where he faces, fist closed.",
            "holds the extension, eyes on the target.",
            "recoil: arm kicks up slightly, shoulders pushed back.",
            "recoil peak, jacket flapping.",
            "arm starts lowering, fist relaxing.",
            "hand slides back into the pocket.",
            f"neutral stance, {REST}.",
        ], fps=20),
        "shakkaho": anim("Charged palm blast: extends the right arm with the open palm forward, grips the wrist with the left hand and fires (no energy drawn, only the pose).", [
            f"neutral stance, {REST}.",
            "steps wider, both hands come out of the pockets.",
            "right arm rises forward, palm opening.",
            "left hand grips the right wrist to brace it.",
            "charging: arm straight with the open palm toward where he faces, knees bending, jacket fluttering.",
            "maximum charge: leaning into the arm, teeth bared, hair blown back.",
            "holds the charge, arm trembling.",
            "fires: whole body jolts back, palm still forward.",
            "holds the recoil, jacket and hair whipping back.",
            "palm lowers, left hand lets go.",
            "arms return, hands sliding into the pockets.",
            f"neutral stance, {REST}.",
        ], fps=20),
        "move_kido": anim("Palm blast while running: the legs never stop striding, the right arm thrusts the open palm forward, fires and returns.", [
            "running stride, right foot forward, arms pumping.",
            "stride continues, passing, right hand comes to the chest.",
            "left foot forward, right hand pulled near the shoulder.",
            "stride continues, right arm starts extending forward.",
            "right foot forward, arm almost straight.",
            "stride continues, full cast: arm fully extended, open palm forward.",
            "left foot forward, holds the cast, jacket flapping back.",
            "stride continues, slight recoil of the arm.",
            "right foot forward, arm bends back.",
            "stride continues, passing, arm returning.",
            "left foot forward, arms start pumping again.",
            "stride continues, passing, arms pumping, same as frame 1.",
        ], fps=22),
        "victory": anim("Victory pose after beating the boss: cocky and wild: laughs with his head thrown back, then slides his hands into his pockets, leaning back with a wide grin.", [
            f"neutral stance, {REST}, breathing out.",
            "hands come out of the pockets, shoulders rolling.",
            "throws his head back, laughing, arms spread.",
            "laughing loudest, chest out, back arched.",
            "laugh fading, head coming forward.",
            "cracks his neck to one side.",
            "rolls the shoulders, smirking.",
            "hands slide back into the pockets.",
            "leans back slightly, weight on one leg.",
            "head tilted, wide toothy grin.",
            "cocky stance, hands in pockets, chin up.",
            "same final pose, holds still.",
        ], fps=14),
    }
