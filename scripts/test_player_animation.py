"""Testes da máquina de estados de animação do jogador (`src/playerAnimation.js`), via Node."""

from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PRELUDE = """
import { createPlayerAnimator, triggerPlayerAction, updatePlayerAnimator, nearestEnemyDirection }
  from './src/playerAnimation.js';
const clip = (fps, loop = false) => ({ fps, loop, frames: 12, frameSize: 128 });
const names = ['idle','walk','run','jump','land','slash_a','slash_b','slash_c','air_slash','move_slash','getsuga',
  'move_getsuga','byakurai','shakkaho','move_kido','hurt','hurt_heavy','hurt_air','death','level_up','victory','afk'];
const catalog = Object.fromEntries(names.map((n) => [n, clip(12, ['idle','walk','run','afk'].includes(n))]));
const still = { isGrounded: true, isMoving: false, isAFK: false, running: false, vy: 0, jumpStrength: 8.5 };
const moving = { ...still, isMoving: true };
const air = { ...still, isGrounded: false };
const tick = (a, dt, ctx) => updatePlayerAnimator(a, dt, ctx);
"""


def run(body: str):
    script = f"{PRELUDE}\nconst __r = (() => {{ {body} }})();\nconsole.log(JSON.stringify(__r));"
    proc = subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, check=True,
                          capture_output=True, text=True)
    return json.loads(proc.stdout.strip())


class TestBaseClips(unittest.TestCase):
    def test_idle_and_walk_cycle_every_frame(self):
        frames = run("""const a = createPlayerAnimator(catalog); const seen = new Set();
          for (let i = 0; i < 24; i++) seen.add(tick(a, 1 / 12, moving).frame);
          return { clip: tick(a, 0, moving).anim, count: seen.size };""")
        self.assertEqual(frames, {"clip": "walk", "count": 12})
        self.assertEqual(run("return tick(createPlayerAnimator(catalog), 0, still).anim;"), "idle")

    def test_run_replaces_walk_when_running(self):
        self.assertEqual(run("return tick(createPlayerAnimator(catalog), 0, { ...moving, running: true }).anim;"), "run")

    def test_jump_frame_follows_vertical_speed(self):
        result = run("""const a = createPlayerAnimator(catalog);
          return [8.5, 0, -8.5].map((vy) => tick(a, 0, { ...air, vy }));""")
        self.assertEqual([r["anim"] for r in result], ["jump"] * 3)
        self.assertEqual([r["frame"] for r in result], [2, 6, 10])

    def test_landing_plays_only_when_standing(self):
        self.assertEqual(run("""const a = createPlayerAnimator(catalog); tick(a, 0.1, air);
          return tick(a, 0, still).anim;"""), "land")
        self.assertEqual(run("""const a = createPlayerAnimator(catalog); tick(a, 0.1, air);
          return tick(a, 0, moving).anim;"""), "walk")

    def test_afk_wins_over_locomotion(self):
        self.assertEqual(run("return tick(createPlayerAnimator(catalog), 0, { ...still, isAFK: true }).anim;"), "afk")


class TestActions(unittest.TestCase):
    def test_slash_combo_cycles_three_strikes(self):
        clips = run("""const a = createPlayerAnimator(catalog); const out = [];
          for (let i = 0; i < 4; i++) { triggerPlayerAction(a, 'slash'); out.push(tick(a, 0, still).anim); tick(a, 2, still); }
          return out;""")
        self.assertEqual(clips, ["slash_a", "slash_b", "slash_c", "slash_a"])

    def test_variant_follows_locomotion(self):
        self.assertEqual(run("""const a = createPlayerAnimator(catalog); triggerPlayerAction(a, 'slash');
          return [tick(a, 0, moving).anim, tick(a, 0, air).anim];"""), ["move_slash", "air_slash"])
        self.assertEqual(run("""const a = createPlayerAnimator(catalog); triggerPlayerAction(a, 'getsuga');
          return tick(a, 0, moving).anim;"""), "move_getsuga")

    def test_swapping_variant_keeps_the_frame(self):
        frames = run("""const a = createPlayerAnimator(catalog); triggerPlayerAction(a, 'slash');
          const before = tick(a, 0.5, still).frame; return [before, tick(a, 0, moving).frame];""")
        self.assertEqual(frames[0], 6)
        self.assertEqual(frames[1], 6)

    def test_weaker_action_does_not_interrupt(self):
        self.assertEqual(run("""const a = createPlayerAnimator(catalog); triggerPlayerAction(a, 'getsuga');
          triggerPlayerAction(a, 'slash'); return tick(a, 0, still).anim;"""), "getsuga")

    def test_action_returns_to_base_when_finished(self):
        self.assertEqual(run("""const a = createPlayerAnimator(catalog); triggerPlayerAction(a, 'byakurai');
          return tick(a, 1.1, still).anim;"""), "idle")

    def test_hurt_has_cooldown_so_a_crowd_does_not_freeze_the_sprite(self):
        result = run("""const a = createPlayerAnimator(catalog); const first = triggerPlayerAction(a, 'hurt');
          tick(a, 1.1, still); const blocked = triggerPlayerAction(a, 'hurt');
          tick(a, 0.5, still); const again = triggerPlayerAction(a, 'hurt'); return [first, blocked, again];""")
        self.assertEqual(result, [True, False, True])

    def test_moving_cuts_hurt_short_to_avoid_foot_sliding(self):
        self.assertEqual(run("""const a = createPlayerAnimator(catalog); triggerPlayerAction(a, 'hurt');
          return tick(a, 0.5, moving).anim;"""), "walk")

    def test_moving_cancels_celebration(self):
        self.assertEqual(run("""const a = createPlayerAnimator(catalog); triggerPlayerAction(a, 'level_up');
          return tick(a, 0.1, moving).anim;"""), "walk")

    def test_death_holds_last_frame_and_blocks_everything(self):
        result = run("""const a = createPlayerAnimator(catalog); triggerPlayerAction(a, 'death');
          const blocked = triggerPlayerAction(a, 'hurt_heavy'); const r = tick(a, 5, moving);
          return { blocked, anim: r.anim, frame: r.frame };""")
        self.assertEqual(result, {"blocked": False, "anim": "death", "frame": 11})

    def test_nearest_enemy_direction(self):
        result = run("""const enemies = [{ active: true, x: 10, z: 0 }, { active: false, x: 1, z: 0 }, { active: true, x: 0, z: 2 }];
          return [nearestEnemyDirection(enemies, 0, 0), nearestEnemyDirection([], 0, 0)];""")
        self.assertEqual(result, [{"dirX": 0, "dirZ": 1}, None])


if __name__ == "__main__":
    unittest.main()
