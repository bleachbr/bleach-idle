"""Clipe de dano (`hurt`) dos hollows sem congelar a horda (`src/hollowTypes.js`), via Node.

O sinal de golpe é `en.flashTimer > 0`, que só `damageEnemy` grava (main.js). O hurt nunca
interrompe o golpe, espera HURT.cooldown entre um e outro e não para o hollow no lugar.
"""

from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MONSTERS = ROOT / "src" / "assets" / "monsters"
PRELUDE = """
import { HURT, HOLLOW_TYPES, steerHollow, tickHollowAttack } from './src/hollowTypes.js';
const far = 30;
const hit = (en) => { en.flashTimer = 0.12; };
const fresh = (type) => ({ type, id: 1, attackCooldown: 0, hurtCooldown: 0, clip: null, flashTimer: 0 });
"""


def run(body: str):
    script = f"{PRELUDE}\nconst __r = (() => {{ {body} }})();\nconsole.log(JSON.stringify(__r));"
    proc = subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, check=True,
                          capture_output=True, text=True, encoding="utf-8")
    return json.loads(proc.stdout.strip())


class TestHurtRule(unittest.TestCase):
    def test_hit_starts_hurt_and_it_ends(self):
        result = run("""const en = fresh('fishbone'); hit(en); tickHollowAttack(en, far, 0.016);
          const start = en.clip?.id; en.flashTimer = 0;
          for (let t = 0; t < HURT.duration + 0.05; t += 0.016) tickHollowAttack(en, far, 0.016);
          return { start, after: en.clip };""")
        self.assertEqual(result, {"start": "hurt", "after": None})

    def test_repeated_hits_wait_for_the_cooldown(self):
        starts = run("""const en = fresh('fishbone'); let starts = 0;
          for (let t = 0; t < 1.4; t += 0.016) { hit(en); const before = en.clip; tickHollowAttack(en, far, 0.016);
            if (en.clip?.id === 'hurt' && en.clip !== before) starts++; }
          return starts;""")
        self.assertEqual(starts, 1)

    def test_hurt_never_interrupts_an_attack(self):
        self.assertEqual(run("""const en = fresh('fishbone'); tickHollowAttack(en, 1.0, 0.016);
          hit(en); tickHollowAttack(en, 1.0, 0.016); return en.clip.id;"""), "attack")

    def test_attack_replaces_hurt_when_in_range(self):
        self.assertEqual(run("""const en = fresh('fishbone'); hit(en); tickHollowAttack(en, far, 0.016);
          tickHollowAttack(en, 1.0, 0.016); return en.clip.id;"""), "attack")

    def test_acidwire_never_spits_from_a_hurt(self):
        self.assertEqual(run("""const en = fresh('acidwire'); const out = []; hit(en);
          for (let t = 0; t < 1.0; t += 0.016) out.push(tickHollowAttack(en, far, 0.016)); return out.filter(Boolean);"""), [])


class TestNoFreeze(unittest.TestCase):
    def test_every_type_keeps_walking_while_hurt(self):
        paces = run("""return Object.keys(HOLLOW_TYPES).map((type) => { const en = fresh(type); en.clip = { id: 'hurt', t: 0 };
          return steerHollow(en, 0, 20, 20, 0).pace; });""")
        self.assertTrue(all(p != 0 for p in paces), paces)


class TestHurtAssets(unittest.TestCase):
    def test_hurt_strips_in_three_views(self):
        missing = []
        for folder in ("fishbone", "shrieker", "acidwire", "menos_grande"):
            manifest = json.loads((MONSTERS / folder / "clips" / "manifest.json").read_text(encoding="utf-8"))
            if "hurt" not in manifest["anims"]:
                missing.append(f"{folder}: manifesto")
            missing += [f"{folder}/hurt_{v}" for v in ("front", "side_l", "back")
                        if not (MONSTERS / folder / "clips" / f"hurt_{v}.png").exists()]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
