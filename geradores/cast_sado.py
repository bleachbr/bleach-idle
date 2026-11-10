"""Golpes do Sado: socos dos dois braços blindados, sem arma na mão.

Mapa para as armas do jogo: Asauchi -> combo de socos; Getsuga -> soco carregado do braço
direito; Byakurai -> soco reto rápido que dispara à distância; Shakkahō -> golpe de garra do braço
esquerdo. Nenhuma energia é desenhada: o jogo desenha o projétil.
"""
ID = "sado"
RULER = "fixed"
GARMENT = "shirt"
REST = "armored arms relaxed at his sides, fists loose"
CARRY = ""

CHARACTER = (
    "THE CHARACTER (identical in every frame, copied from the attached reference sprites): a very tall, broad-shouldered "
    "young man with dark tan skin and shaggy wavy dark brown hair that covers his eyes, an open red shirt, blue jeans and "
    "white sneakers. His RIGHT arm is covered up to the shoulder by a massive black armor with thin red lines; his LEFT "
    "arm is covered by a white armor with black stripes ending in a clawed hand. He fights bare-handed with these two "
    "armored arms and never holds a weapon. Same proportions and head size always."
)

GUARD = "boxing guard: knees bent, both armored fists raised in front of his chest"


def combat_clips(anim, loop_note):
    return {
        "slash_a": anim("First combo strike: a straight jab with the black right arm, feet planted.", [
            f"neutral stance, {REST}.",
            f"raises his fists into a {GUARD}.",
            "right fist pulls back to the shoulder, torso turning away.",
            "anticipation hold, weight on the back foot.",
            "front foot steps forward, hips turning, right fist starts moving.",
            "right fist at mid punch, arm extending.",
            "impact pose: right arm fully extended straight toward where he faces, shoulder behind the punch.",
            "holds the impact, shirt flapping forward.",
            "fist starts pulling back.",
            "recoil: right fist returning to the chest.",
            "front foot sliding back.",
            f"{GUARD}.",
        ], fps=24),
        "slash_b": anim("Second combo strike: a wide hook with the white left arm, standing in place.", [
            f"{GUARD}.",
            "left fist drops to the side, torso twisting away.",
            "wind-up: left arm far out to the side, elbow bent, hips coiled.",
            "anticipation hold, heels pressing.",
            "hips snap around, left fist swinging inward.",
            "left fist at mid swing, elbow at shoulder height.",
            "impact pose: left hook fully across in front of him, clawed fist where he faces, torso twisted through.",
            "fist passing the far side, follow-through.",
            "weight on the front foot, shoulders turned.",
            "left arm returning toward the chest.",
            "recovering the guard.",
            f"{GUARD}.",
        ], fps=24),
        "slash_c": anim("Third combo finisher: a huge rising uppercut with the black right arm, the strongest strike of the combo.", [
            f"{GUARD}.",
            "drops low, knees deeply bent, right fist near the floor without touching it.",
            "deepest crouch, right arm coiled behind his hip.",
            "anticipation hold, whole body compressed.",
            "explodes upward: legs extend, right fist starts rising.",
            "fist at chest height rising, torso turning.",
            "impact pose: right arm fully extended upward and forward, body stretched on tiptoe, biggest silhouette.",
            "holds the impact, hair and shirt lifting.",
            "heels come back down, arm starting to fall.",
            "right arm lowering, shoulders relaxing.",
            "recovering the guard.",
            f"{GUARD}.",
        ], fps=24),
        "air_slash": anim("Punch performed in mid-air: no feet on any floor, knees tucked, the black right arm smashes downward-forward.", [
            "airborne, knees tucked, right fist pulled back by his ear.",
            "torso arching back, right arm going behind him.",
            "aerial wind-up: back arched, right fist far behind, knees apart.",
            "anticipation hold, hair floating.",
            "whips forward: hips snap, fist starts moving.",
            "fist at mid swing, legs swing back for balance.",
            "impact pose: right arm fully extended forward and down, legs trailing back.",
            "holds the impact, shirt floating.",
            "follow-through, body curling.",
            "pulling in: knees tucked again.",
            "fists return near the chest.",
            "airborne compact pose ready to land.",
        ], fps=24),
        "move_slash": anim("Punch while running: the legs NEVER stop striding, only the torso and the black right arm throw a straight punch.", [
            "running stride, right foot forward, fists up.",
            "stride continues, passing, right fist pulls back.",
            "left foot forward, right fist behind him, torso twisted.",
            "stride continues, passing, hips begin to rotate.",
            "right foot forward, fist starts moving.",
            "stride continues, fist at mid punch.",
            "left foot forward, impact pose: right arm fully extended toward where he runs.",
            "stride continues, holds the punch.",
            "right foot forward, fist pulling back.",
            "stride continues, passing, fist returning.",
            "left foot forward, fists up.",
            "stride continues, passing, fists up, same as frame 1.",
        ], fps=24, loop_note="The feet positions of frame 12 must be able to connect back into a running cycle."),
        "getsuga": anim("Signature charged punch: plants his feet, charges the black right arm at his hip and fires it straight forward with his whole body (no energy drawn, only the body).", [
            f"neutral stance, {REST}.",
            "widens his stance, knees bending, head lowering in focus.",
            "right fist pulled back to his hip, left arm forward for aim.",
            "deep stance, right arm coiled far behind, shirt starting to lift from below.",
            "maximum charge: torso fully twisted, right shoulder far back, hair and shirt blown upward by power.",
            "holds the charge, muscles tense, armor plates flexing.",
            "explosive release: hips drive forward, right fist starts moving.",
            "right fist at mid thrust, deep lunge begins.",
            "release pose: deepest lunge, right arm fully extended straight toward where he faces, biggest silhouette.",
            "holds the release, hair and shirt overshoot forward.",
            "recovers: straightens the back, pulls the arm back.",
            f"neutral stance, {REST}.",
        ], fps=20),
        "move_getsuga": anim("Charged punch while running: the legs never stop striding, he coils the black right arm and fires a huge straight punch.", [
            "running stride, right foot forward, fists up.",
            "stride continues, passing, right fist pulling back.",
            "left foot forward, right fist at his hip, charging.",
            "stride continues, maximum charge, torso twisted, hair flying back.",
            "right foot forward, holds the charge.",
            "stride continues, fist starts moving.",
            "left foot forward, fist at mid thrust.",
            "stride continues, release pose: right arm fully extended toward where he runs.",
            "right foot forward, holds the release.",
            "stride continues, arm pulling back.",
            "left foot forward, fists up.",
            "stride continues, passing, fists up, same as frame 1.",
        ], fps=22),
        "byakurai": anim("Quick ranged punch: a short snapping straight punch with the black right arm into the air, as if firing a shot (no energy drawn).", [
            f"neutral stance, {REST}.",
            "right fist comes up to the chin.",
            "left arm guards, right elbow pulls back.",
            "quick wind-up, shoulders turning.",
            "snaps the punch forward, arm straightening.",
            "full extension: right arm straight toward where he faces, fist closed.",
            "holds the extension, eyes on the target behind his hair.",
            "recoil: arm kicks up slightly, shoulders pushed back.",
            "recoil peak, weight on the back foot.",
            "arm starts lowering.",
            "arm returning to his side, feet closing.",
            f"neutral stance, {REST}.",
        ], fps=20),
        "shakkaho": anim("Claw strike: charges the white left arm and thrusts the open clawed hand forward (no energy drawn, only the pose).", [
            f"neutral stance, {REST}.",
            "steps wider, left arm rising.",
            "left hand opens into a claw at shoulder height.",
            "pulls the clawed hand back past his hip, torso twisting.",
            "charging: left arm far back, knees bent, shirt fluttering.",
            "maximum charge: torso fully twisted, back foot pressing.",
            "thrust begins: hips turn, clawed hand starts moving forward.",
            "full thrust: left arm fully extended with the open claw forward, deep front stance.",
            "holds the thrust, recoil pushes shirt and hair back.",
            "claw lowers slightly, weight returns.",
            "arm pulling back, feet closing.",
            f"neutral stance, {REST}.",
        ], fps=20),
        "move_kido": anim("Ranged punch while running: the legs never stop striding, the black right arm snaps a straight punch forward and returns.", [
            "running stride, right foot forward, arms pumping.",
            "stride continues, passing, right fist comes to the chest.",
            "left foot forward, right fist near the shoulder.",
            "stride continues, right arm starts extending forward.",
            "right foot forward, arm almost straight.",
            "stride continues, full extension: right arm straight forward, fist closed.",
            "left foot forward, holds the punch, shirt flapping back.",
            "stride continues, slight recoil of the arm.",
            "right foot forward, arm bends back.",
            "stride continues, passing, arm returning.",
            "left foot forward, arms start pumping again.",
            "stride continues, passing, arms pumping, same as frame 1.",
        ], fps=22),
        "victory": anim("Victory pose after beating the boss: a calm, silent strongman: raises the black right fist, then crosses his armored arms and nods.", [
            f"neutral stance, {REST}, breathing out.",
            "straightens up, chest rising.",
            "raises the black right fist slowly.",
            "fist high above his head, arm straight, in triumph.",
            "holds it high, hair moving slightly.",
            "lowers the fist toward his chest.",
            "both armored arms come in front of the chest.",
            "crosses the arms over his chest.",
            "arms crossed, nods once, head down.",
            "head comes back up.",
            "arms crossed, standing tall and calm.",
            "same final pose, holds still.",
        ], fps=14),
    }
