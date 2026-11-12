"""Testes da regra dos efeitos de impacto (`src/fx/impactRules.js`), via Node.

Cada projétil e o corte corpo a corpo têm um estouro próprio no ponto do acerto, e o
estouro toca uma vez só e some.
"""

from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FX = ROOT / "src" / "assets" / "fx"


def run(body: str):
    script = ("import { IMPACT_FOR, impactFor, impactFrame, IMPACT_LIMIT } from './src/fx/impactRules.js';\n"
              f"const __r = (() => {{ {body} }})();\nconsole.log(JSON.stringify(__r));")
    proc = subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, check=True,
                          capture_output=True, text=True, encoding="utf-8")
    return json.loads(proc.stdout.strip())


class TestImpactRules(unittest.TestCase):
    def test_every_projectile_has_an_impact(self):
        mapping = run("return IMPACT_FOR;")
        for fx in ("skill_getsuga", "skill_byakurai", "skill_shakkaho", "skill_cero", "skill_quincy_arrow",
                   "skill_directo", "skill_muerte", "slash_combat"):
            self.assertIn(fx, mapping, fx)

    def test_every_impact_has_its_frames_on_disk(self):
        for hit in set(run("return Object.values(IMPACT_FOR).map((i) => i.id);")):
            manifest = json.loads((FX / hit / "manifest.json").read_text(encoding="utf-8"))
            for f in range(manifest["frameCount"]):
                self.assertTrue((FX / hit / f"frame_{f}.png").exists(), f"{hit} frame_{f}")

    def test_unknown_fx_has_no_impact(self):
        self.assertIsNone(run("return impactFor('nao_existe');"))

    def test_impact_plays_once_then_ends(self):
        frames = run("return [0, 0.06, 0.2, 0.39, 0.4, 2].map((t) => impactFrame(t, 20, 8));")
        self.assertEqual(frames, [0, 1, 4, 7, -1, -1])

    def test_pool_is_capped(self):
        self.assertLessEqual(run("return IMPACT_LIMIT;"), 64)


if __name__ == "__main__":
    unittest.main()
