"""Troca de forma do jogador por nível: o Ichigo vira Bankai no nível 35 (`src/playerForm.js`).

A regra é pura e roda no Node. O kit do Bankai precisa existir com os 22 clipes nas três vistas,
o `main.js` precisa trocar o kit ao fim do level-up e o Bankai não vira uma escolha à parte no menu.
"""

from __future__ import annotations

import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BANKAI = ROOT / "src" / "assets" / "characters" / "ichigo_bankai"
SHIKAI = ROOT / "src" / "assets" / "characters" / "ichigo_shikai"
PRELUDE = "import { BANKAI_LEVEL, playerFormId } from './src/playerForm.js';"


def run(body: str):
    script = f"{PRELUDE}\nconst __r = (() => {{ {body} }})();\nconsole.log(JSON.stringify(__r));"
    proc = subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, check=True,
                          capture_output=True, text=True, encoding="utf-8")
    return json.loads(proc.stdout.strip())


def function_body(source: str, name: str) -> str:
    match = re.search(rf"function {name}\([^)]*\) \{{(.*?)\n\}}", source, re.S)
    return match.group(1) if match else ""


class TestFormRule(unittest.TestCase):
    def test_bankai_from_level_35(self):
        ids = run("const has = () => true; return [1, 34, 35, 60].map((lv) => playerFormId('ichigo_shikai', lv, has));")
        self.assertEqual(ids, ["ichigo_shikai", "ichigo_shikai", "ichigo_bankai", "ichigo_bankai"])
        self.assertEqual(run("return BANKAI_LEVEL;"), 35)

    def test_other_characters_keep_their_sprite(self):
        ids = run("const has = () => true; return ['ishida', 'sado', 'grimmjow'].map((c) => playerFormId(c, 99, has));")
        self.assertEqual(ids, ["ishida", "sado", "grimmjow"])

    def test_missing_bankai_kit_keeps_shikai(self):
        self.assertEqual(run("return playerFormId('ichigo_shikai', 50, (id) => id !== 'ichigo_bankai');"), "ichigo_shikai")


class TestBankaiKit(unittest.TestCase):
    def test_manifest_has_the_22_clips_of_the_shikai(self):
        bankai = json.loads((BANKAI / "anims" / "manifest.json").read_text(encoding="utf-8"))
        shikai = json.loads((SHIKAI / "anims" / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(sorted(bankai["anims"]), sorted(shikai["anims"]))
        for clip, spec in bankai["anims"].items():
            self.assertEqual((spec["fps"], spec["frames"], spec["loop"]),
                             (shikai["anims"][clip]["fps"], shikai["anims"][clip]["frames"], shikai["anims"][clip]["loop"]), clip)

    def test_every_clip_has_the_three_views(self):
        manifest = json.loads((BANKAI / "anims" / "manifest.json").read_text(encoding="utf-8"))
        missing = [f"{c}_{v}" for c in manifest["anims"] for v in ("front", "side_l", "back")
                   if not (BANKAI / "anims" / f"{c}_{v}.png").exists()]
        self.assertEqual(missing, [])


class TestGameHooks(unittest.TestCase):
    def test_level_up_reloads_the_kit_for_the_new_level(self):
        body = function_body((ROOT / "src" / "main.js").read_text(encoding="utf-8"), "finishLevelUp")
        self.assertRegex(body, r"playerKit = loadPlayerKit\(.*, state\.selectedCharacter, state\.level\);")

    def test_sprite_module_resolves_the_form(self):
        source = (ROOT / "src" / "playerSprite.js").read_text(encoding="utf-8")
        self.assertIn("playerFormId(", function_body(source, "loadPlayerKit"))

    def test_bankai_is_not_a_menu_choice(self):
        source = (ROOT / "src" / "playableCast.js").read_text(encoding="utf-8")
        self.assertNotIn("ichigo_bankai", source)


if __name__ == "__main__":
    unittest.main()
