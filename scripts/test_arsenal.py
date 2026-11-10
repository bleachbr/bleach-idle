"""Testes do arsenal de cada personagem jogável (`src/arsenal.js`), via Node."""

from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRELUDE = "import { ARSENALS, arsenalLabels, arsenalShot, volleyDirections } from './src/arsenal.js';"
WEAPONS = ["asauchi", "getsuga", "byakurai", "shakkaho"]


def run(body: str):
    script = f"{PRELUDE}\nconst __r = (() => {{ {body} }})();\nconsole.log(JSON.stringify(__r));"
    proc = subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, check=True,
                          capture_output=True, text=True, encoding="utf-8")
    return json.loads(proc.stdout.strip())


class TestLabels(unittest.TestCase):
    def test_every_character_names_the_four_weapons(self):
        labels = run("return Object.fromEntries(Object.keys(ARSENALS).map((c) => [c, arsenalLabels(c)]));")
        self.assertEqual(sorted(labels), ["grimmjow", "ichigo_shikai", "ishida", "sado"])
        for char, by_key in labels.items():
            self.assertEqual(sorted(by_key), sorted(WEAPONS), char)
            for key, label in by_key.items():
                self.assertTrue(label["name"] and label["icon"], (char, key))

    def test_unknown_character_falls_back_to_ichigo(self):
        self.assertEqual(run("return arsenalLabels('nobody').getsuga.name;"), "Getsuga Tenshō")


class TestShots(unittest.TestCase):
    def test_ichigo_keeps_his_single_projectiles(self):
        shots = run("return ['getsuga', 'byakurai', 'shakkaho'].map((k) => arsenalShot('ichigo_shikai', k));")
        self.assertEqual([s["count"] for s in shots], [1, 1, 1])
        self.assertEqual([s["fx"] for s in shots], ["skill_getsuga", "skill_byakurai", "skill_shakkaho"])

    def test_every_shot_has_a_known_effect(self):
        fx = run("""return Object.keys(ARSENALS).flatMap((c) =>
          ['getsuga', 'byakurai', 'shakkaho'].map((k) => arsenalShot(c, k).fx));""")
        registered = set(json.loads(subprocess.run(
            ["node", "--input-type=module", "-e",
             "import { FX_REGISTRY } from './src/characters.js'; console.log(JSON.stringify(Object.keys(FX_REGISTRY)));"],
            cwd=ROOT, check=True, capture_output=True, text=True).stdout))
        self.assertTrue(set(fx) <= registered, set(fx) - registered)

    def test_fan_spreads_around_the_target(self):
        dirs = run("return volleyDirections(1, 0, arsenalShot('ishida', 'getsuga'));")
        self.assertEqual(len(dirs), 5)
        self.assertAlmostEqual(dirs[2]["z"], 0.0, places=6)
        self.assertAlmostEqual(dirs[0]["z"], -dirs[4]["z"], places=6)
        for d in dirs:
            self.assertAlmostEqual(d["x"] ** 2 + d["z"] ** 2, 1.0, places=6)

    def test_parallel_row_keeps_direction_and_shifts_sideways(self):
        dirs = run("return volleyDirections(0, 1, arsenalShot('grimmjow', 'getsuga'));")
        self.assertEqual({(round(d["x"], 6), round(d["z"], 6)) for d in dirs}, {(0.0, 1.0)})
        self.assertEqual([round(d["offX"], 2) for d in dirs], [0.9 * 2, 0.9, 0.0, -0.9, -0.9 * 2])

    def test_volley_damage_stays_in_the_same_order_as_one_shot(self):
        totals = run("""return Object.keys(ARSENALS).map((c) => {
          const s = arsenalShot(c, 'getsuga'); return s.count * s.damageScale; });""")
        for total in totals:
            self.assertGreaterEqual(total, 1.0)
            self.assertLessEqual(total, 2.0)


if __name__ == "__main__":
    unittest.main()
