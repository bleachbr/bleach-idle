"""Testes dos clipes de ataque do Fishbone, do Elite e do Menos Grande (`src/hollowTypes.js`), via Node.

O ataque desses três é só visual: o dano continua sendo por contato. O Menos não pode entrar no
sorteio da horda, porque ele nasce só como chefe.
"""

from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(body: str):
    script = ("import { HOLLOW_TYPES, HURT, hollowTypeOf, pickHollowType, startHollowHurt, steerHollow, tickHollowAttack } from './src/hollowTypes.js';\n"
              f"const __r = (() => {{ {body} }})();\nconsole.log(JSON.stringify(__r));")
    proc = subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, check=True,
                          capture_output=True, text=True, encoding="utf-8")
    return json.loads(proc.stdout.strip())


class TestMeleeClips(unittest.TestCase):
    def test_fishbone_starts_attack_clip_in_range(self):
        self.assertEqual(run("""const en = { type: 'fishbone', attackCooldown: 0, clip: null };
          tickHollowAttack(en, 1.0, 0.016); return en.clip?.id;"""), "attack")

    def test_elite_uses_fishbone_attack(self):
        self.assertEqual(run("""const en = { type: 'elite', attackCooldown: 0, clip: null };
          tickHollowAttack(en, 1.0, 0.016); return en.clip?.id;"""), "attack")

    def test_fishbone_attack_never_fires_a_projectile(self):
        self.assertEqual(run("""const en = { type: 'fishbone', attackCooldown: 0, clip: null }; const out = [];
          for (let i = 0; i < 80; i++) out.push(tickHollowAttack(en, 1.0, 0.016)); return out.filter(Boolean);"""), [])

    def test_menos_has_own_reach_and_attacks(self):
        result = run("""const en = { type: 'menos', attackCooldown: 0, clip: null };
          tickHollowAttack(en, 2.5, 0.016);
          return { clip: en.clip?.id, reach: hollowTypeOf(en).attack.range, fish: HOLLOW_TYPES.fishbone.attack.range };""")
        self.assertEqual(result["clip"], "attack")
        self.assertGreater(result["reach"], result["fish"])

    def test_menos_never_spawns_in_the_horde(self):
        picks = run("return Array.from({ length: 200 }, (_, i) => pickHollowType(9999, i / 200));")
        self.assertNotIn("menos", picks)
        self.assertNotIn("menos_grande", picks)


class TestHurtClip(unittest.TestCase):
    """O tranco ao levar golpe é só visual: não cancela o golpe do hollow e tem recarga."""

    def test_hit_starts_hurt_and_it_ends(self):
        result = run("""const en = { type: 'fishbone', active: true, attackCooldown: 9, clip: null };
          const started = startHollowHurt(en, true); const id = en.clip?.id;
          for (let i = 0; i < 40; i++) tickHollowAttack(en, 9, 0.016);
          return { started, id, after: en.clip };""")
        self.assertEqual(result, {"started": True, "id": "hurt", "after": None})

    def test_hurt_never_cuts_an_attack(self):
        self.assertEqual(run("""const en = { type: 'fishbone', active: true, attackCooldown: 0, clip: null };
          tickHollowAttack(en, 1.0, 0.016); startHollowHurt(en, true); return en.clip.id;"""), "attack")

    def test_hurt_has_a_cooldown(self):
        result = run("""const en = { type: 'shrieker', active: true, attackCooldown: 9, clip: null };
          startHollowHurt(en, true);
          for (let i = 0; i < 40; i++) tickHollowAttack(en, 9, 0.016);
          const early = startHollowHurt(en, true);
          for (let i = 0; i < 40; i++) tickHollowAttack(en, 9, 0.016);
          return { early, late: startHollowHurt(en, true) };""")
        self.assertEqual(result, {"early": False, "late": True})

    def test_no_clip_or_dying_means_no_hurt(self):
        self.assertEqual(run("""const a = { type: 'fishbone', active: true, clip: null };
          const b = { type: 'fishbone', active: false, clip: { id: 'death', t: 0 } };
          return [startHollowHurt(a, false), startHollowHurt(b, true), a.clip, b.clip.id];"""), [False, False, None, "death"])

    def test_acidwire_does_not_spit_or_root_while_hurt(self):
        result = run("""const en = { type: 'acidwire', active: true, attackCooldown: 9, clip: null, id: 1 };
          startHollowHurt(en, true); const pace = steerHollow(en, 20, 0, 20, 0).pace; const out = [];
          for (let i = 0; i < 40; i++) out.push(tickHollowAttack(en, 9, 0.016));
          return { pace, spits: out.filter(Boolean) };""")
        self.assertEqual(result, {"pace": 1, "spits": []})

    def test_hurt_length_matches_the_clip(self):
        self.assertAlmostEqual(run("return HURT.duration;"), 12 / 22, places=6)


if __name__ == "__main__":
    unittest.main()
