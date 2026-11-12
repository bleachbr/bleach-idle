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
    script = ("import { HOLLOW_TYPES, hollowTypeOf, pickHollowType, tickHollowAttack } from './src/hollowTypes.js';\n"
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


if __name__ == "__main__":
    unittest.main()
