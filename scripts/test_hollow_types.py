"""Testes da regra dos tipos de hollow (`src/hollowTypes.js`): sorteio, rota e ataque, via Node."""

from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PRELUDE = """
import { HOLLOW_TYPES, pickHollowType, configureHollow, steerHollow, tickHollowAttack } from './src/hollowTypes.js';
const mult = { hpMult: 1, speedMult: 1 };
const make = (type) => { const en = { id: 3 }; configureHollow(en, type, false, mult); return en; };
"""


def run(body: str):
    script = f"{PRELUDE}\nconst __r = (() => {{ {body} }})();\nconsole.log(JSON.stringify(__r));"
    proc = subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, check=True,
                          capture_output=True, text=True)
    return json.loads(proc.stdout.strip())


class TestSpawnPool(unittest.TestCase):
    def test_only_fishbone_at_start(self):
        self.assertEqual(run("return [0, 0.5, 0.99].map((r) => pickHollowType(0, r));"), ["fishbone"] * 3)

    def test_new_types_unlock_over_time(self):
        seen = run("""const ids = new Set();
          for (let r = 0; r < 1; r += 0.01) ids.add(pickHollowType(60, r));
          return [...ids].sort();""")
        self.assertEqual(seen, ["acidwire", "fishbone", "shrieker"])
        self.assertNotIn("acidwire", run("""const ids = new Set();
          for (let r = 0; r < 1; r += 0.01) ids.add(pickHollowType(30, r)); return [...ids];"""))

    def test_elite_stays_a_reinforced_fishbone(self):
        en = run("const en = { id: 1 }; configureHollow(en, 'acidwire', true, mult); return en;")
        self.assertEqual((en["type"], en["hp"], en["scale"]), ("elite", 200, 2.2))


class TestSteering(unittest.TestCase):
    def test_fishbone_walks_straight(self):
        self.assertEqual(run("return steerHollow(make('fishbone'), 10, 0, 10, 1.0);"), {"x": 1, "z": 0, "pace": 1})

    def test_shrieker_zigzags_but_still_approaches(self):
        dirs = run("""const en = make('shrieker');
          return [0, 0.3, 0.6, 0.9, 1.2].map((t) => steerHollow(en, 10, 0, 10, t));""")
        self.assertGreater(len({round(d["z"], 2) for d in dirs}), 3)
        for d in dirs:
            self.assertAlmostEqual(d["x"] ** 2 + d["z"] ** 2, 1.0, places=6)
            self.assertGreater(d["x"], 0)

    def test_acidwire_keeps_its_distance(self):
        paces = run("const en = make('acidwire'); return [3, 7, 12].map((d) => steerHollow(en, d, 0, d, 0).pace);")
        self.assertEqual(paces, [-0.8, 0, 1])


class TestAttacks(unittest.TestCase):
    def test_acidwire_spits_once_per_attack(self):
        events = run("""const en = make('acidwire'); const out = [];
          for (let i = 0; i < 60; i++) out.push(tickHollowAttack(en, 8, 1 / 30));
          return out.filter(Boolean);""")
        self.assertEqual(events, ["spit"])

    def test_acidwire_stands_still_while_spitting(self):
        self.assertEqual(run("""const en = make('acidwire'); tickHollowAttack(en, 12, 0.01);
          return steerHollow(en, 12, 0, 12, 0).pace;"""), 0)

    def test_attack_waits_for_range_and_cooldown(self):
        result = run("""const en = make('shrieker');
          const far = tickHollowAttack(en, 5, 0.1) || en.clip;
          tickHollowAttack(en, 1, 0.1); const started = en.clip?.id;
          for (let i = 0; i < 10; i++) tickHollowAttack(en, 1, 0.1);
          return { far, started, after: en.clip, cooldown: en.attackCooldown > 0 };""")
        self.assertEqual(result, {"far": None, "started": "attack", "after": None, "cooldown": True})

    def test_fishbone_attack_starts_only_up_close(self):
        result = run("""const near = make('fishbone'); tickHollowAttack(near, 0.5, 0.1);
          const far = make('fishbone'); tickHollowAttack(far, 3, 0.1);
          return { near: near.clip?.id ?? null, far: far.clip?.id ?? null };""")
        self.assertEqual(result, {"near": "attack", "far": None})



class TestNewHollows(unittest.TestCase):
    def test_new_types_unlock_later(self):
        self.assertNotIn("ironhide", run("""const ids = new Set();
          for (let r = 0; r < 1; r += 0.01) ids.add(pickHollowType(70, r)); return [...ids];"""))
        seen = run("""const ids = new Set();
          for (let r = 0; r < 1; r += 0.005) ids.add(pickHollowType(120, r)); return [...ids].sort();""")
        self.assertEqual(seen, ["acidwire", "fishbone", "ironhide", "shrieker", "wraith"])

    def test_unlock_at_exact_thresholds(self):
        # 80 s abre ironhide; 110 s abre wraith. Um segundo antes, cada um ainda fechado.
        r = run("""const pool = (t) => {
            const ids = new Set();
            for (let x = 0; x < 1; x += 0.005) ids.add(pickHollowType(t, x));
            return [...ids].sort();
          };
          return {
            beforeIron: pool(79.9), atIron: pool(80),
            beforeWraith: pool(109.9), atWraith: pool(110),
            unlocks: {
              ironhide: HOLLOW_TYPES.ironhide.unlockAt,
              wraith: HOLLOW_TYPES.wraith.unlockAt,
              minRange: HOLLOW_TYPES.ironhide.charge.minRange,
              range: HOLLOW_TYPES.ironhide.charge.range,
            },
          };""")
        self.assertNotIn("ironhide", r["beforeIron"])
        self.assertIn("ironhide", r["atIron"])
        self.assertNotIn("wraith", r["beforeWraith"])
        self.assertIn("wraith", r["atWraith"])
        self.assertEqual(r["unlocks"], {"ironhide": 80, "wraith": 110, "minRange": 2.5, "range": 9.0})

    def test_ironhide_charge_band_is_strict(self):
        # Só 2.5 < dist ≤ 9 inicia a carga (limites inclusivo no max, exclusivo no min).
        r = run("""const tryAt = (d) => {
            const en = make('ironhide'); tickHollowAttack(en, d, 0.1); return !!en.charge;
          };
          return {
            belowMin: tryAt(2.5), justInside: tryAt(2.51), mid: tryAt(6),
            atMax: tryAt(9), aboveMax: tryAt(9.01),
          };""")
        self.assertEqual(r, {
            "belowMin": False, "justInside": True, "mid": True, "atMax": True, "aboveMax": False,
        })

    def test_ironhide_winds_up_then_dashes_in_a_locked_line(self):
        r = run("""const en = make('ironhide'); en.dirX = 1; en.dirZ = 0;
          tickHollowAttack(en, 6, 0.01);
          const windup = steerHollow(en, 0, 6, 6, 0);
          for (let i = 0; i < 7; i++) tickHollowAttack(en, 6, 0.1);
          const dash = steerHollow(en, 6, 0, 6, 0);
          return { started: !!en.charge, windup, dash };""")
        self.assertTrue(r["started"])
        self.assertEqual(r["windup"]["pace"], 0)
        self.assertGreater(r["dash"]["pace"], 3)
        # A corrida segue a mira travada na preparação (para baixo), não o jogador de agora (à direita).
        self.assertEqual((round(r["dash"]["x"], 3), round(r["dash"]["z"], 3)), (0.0, 1.0))

    def test_ironhide_charge_ends_and_cools_down(self):
        r = run("""const en = make('ironhide'); en.dirX = 1; en.dirZ = 0;
          for (let i = 0; i < 15; i++) tickHollowAttack(en, 6, 0.1);
          const after = en.charge; tickHollowAttack(en, 6, 0.1);
          return { after, again: en.charge, cooldown: en.chargeCooldown > 0 };""")
        self.assertEqual(r, {"after": None, "again": None, "cooldown": True})

    def test_ironhide_does_not_charge_from_too_far_or_too_close(self):
        r = run("""const far = make('ironhide'); tickHollowAttack(far, 20, 0.1);
          const near = make('ironhide'); tickHollowAttack(near, 1.5, 0.1);
          return [far.charge, near.charge];""")
        self.assertEqual(r, [None, None])

    def test_wraith_spirals_in_and_goes_straight_when_close(self):
        r = run("""const a = make('wraith'); a.id = 1; const b = make('wraith'); b.id = 2;
          return { a: steerHollow(a, 10, 0, 10, 0), b: steerHollow(b, 10, 0, 10, 0), close: steerHollow(a, 3, 0, 3, 0) };""")
        self.assertGreater(r["a"]["x"], 0)
        self.assertNotAlmostEqual(r["a"]["z"], 0.0, places=3)
        self.assertAlmostEqual(r["a"]["z"], -r["b"]["z"], places=6)
        self.assertEqual(r["close"], {"x": 1, "z": 0, "pace": 1})


if __name__ == "__main__":
    unittest.main()
