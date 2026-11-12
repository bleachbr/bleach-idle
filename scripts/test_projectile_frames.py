"""Testes dos projéteis com 8 quadros (src/assets/fx/skill_*, `src/fx/fxFrames.js`), via Node.

Os projéteis tinham 4 quadros e o laço do FXManager fixava `% 4`. Com 8 quadros, o número
vem do registro. O tamanho igual entre quadros não é testado aqui (o CI não tem Pillow): o
processador (geradores/process_impact_fx.py) escala os 8 quadros juntos, pela mesma caixa.
"""

from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FX = ROOT / "src" / "assets" / "fx"
PROJECTILES = ("skill_getsuga", "skill_cero", "skill_byakurai", "skill_shakkaho", "skill_quincy_arrow",
               "skill_directo", "skill_muerte")


def run(body: str):
    script = ("import { FX_REGISTRY } from './src/characters.js';\n"
              "import { fxFrameIndex, fxFrameCount } from './src/fx/fxFrames.js';\n"
              f"const __r = (() => {{ {body} }})();\nconsole.log(JSON.stringify(__r));")
    proc = subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, check=True,
                          capture_output=True, text=True, encoding="utf-8")
    return json.loads(proc.stdout.strip())


class TestProjectileFrames(unittest.TestCase):
    def test_registry_and_manifest_have_eight_frames(self):
        counts = run(f"return {list(PROJECTILES)}.map((id) => FX_REGISTRY[id].frameCount);")
        self.assertEqual(counts, [8] * len(PROJECTILES))
        for fx in PROJECTILES:
            manifest = json.loads((FX / fx / "manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest["frameCount"], 8, fx)
            for f in range(8):
                self.assertTrue((FX / fx / f"frame_{f}.png").exists(), f"{fx} frame_{f}")

    def test_frame_index_loops_over_the_real_count(self):
        self.assertEqual(run("return [0, 0.05, 0.3, 0.34].map((t) => fxFrameIndex(t, 24, 8));"), [0, 1, 7, 0])

    def test_frame_count_comes_from_loaded_textures(self):
        self.assertEqual(run("""const tex = {}; for (let i = 0; i < 8; i++) tex[`fx_skill_cero_${i}`] = {};
          tex.fx_aura_shikai_0 = {}; return [fxFrameCount(tex, 'skill_cero'), fxFrameCount(tex, 'aura_shikai'),
          fxFrameCount(tex, 'nada')];"""), [8, 1, 1])

    def test_manager_has_no_fixed_four_frames(self):
        self.assertNotIn("% 4", (ROOT / "src" / "fx" / "fxManager.js").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
