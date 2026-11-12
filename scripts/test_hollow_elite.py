"""Hollow Elite com desenho próprio: caminhada walk8, clipes de ataque e morte e nenhuma volta ao Fishbone.

Até aqui o elite era o Fishbone tingido de vermelho (0xff3355). Agora ele tem sprites em
src/assets/monsters/elite e o jogo precisa usá-los na caminhada, no golpe e na morte.
Os atributos continuam os de um Fishbone reforçado (scripts/test_hollow_types.py).
"""

from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ELITE = ROOT / "src" / "assets" / "monsters" / "elite"
VIEWS = ("front", "side_l", "side", "back")


def source(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


class TestEliteAssets(unittest.TestCase):
    def test_walk8_has_eight_frames_in_every_view(self):
        missing = [f"{v}_{f}.png" for v in VIEWS for f in range(8) if not (ELITE / f"{v}_{f}.png").exists()]
        self.assertEqual(missing, [])

    def test_attack_hurt_and_death_clips_in_three_views(self):
        manifest = json.loads((ELITE / "clips" / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(sorted(manifest["anims"]), ["attack", "death", "hurt"])
        missing = [f"{c}_{v}.png" for c in manifest["anims"] for v in ("front", "side_l", "back")
                   if not (ELITE / "clips" / f"{c}_{v}.png").exists()]
        self.assertEqual(missing, [])


class TestEliteInGame(unittest.TestCase):
    def test_walk_textures_are_loaded_under_the_elite_alias(self):
        self.assertRegex(source("src/monsterTextures.js"), r"\{ id: 'elite', alias: 'elite', dirCount: 8 \}")

    def test_clips_come_from_the_elite_folder(self):
        self.assertIn("elite: 'elite'", source("src/hollowClips.js"))

    def test_main_never_swaps_the_elite_for_the_fishbone(self):
        main = source("src/main.js")
        self.assertNotRegex(main, r"isElite \? 'fishbone'")
        self.assertNotRegex(main, r"en\.type === 'elite' \? 'fishbone'")

    def test_elite_is_not_tinted_over_its_own_colors(self):
        self.assertIsNone(re.search(r"isElite \? 0xff3355", source("src/main.js")))


if __name__ == "__main__":
    unittest.main()
