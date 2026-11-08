"""Testes unitários automatizados do ciclo infinito, reiatsu e level-up timer.

Executa as funções puras de `src/cycle.js` e `src/reiatsu.js` via Node.js em ambiente isolado,
garantindo que as regras matemáticas e estados do Endless Survivor respeitem todas as invariantes.
"""

from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def run_node_eval(expr: str) -> dict:
    root = repo_root()
    script = f"""
import {{
  createCycleState,
  getCycleMultipliers,
  shouldSpawnCycleBoss,
  markBossSpawned,
  advanceToNextCycle,
  updateCycleProgress,
  registerKillInCycle,
  resetCycleState
}} from './src/cycle.js';

import {{
  calculateReiatsuScore,
  getReiatsuAgroRadius,
  getReiatsuSpawnBonus,
  getReiatsuRankTitle,
  updateEnemyWandering
}} from './src/reiatsu.js';

import {{
  LEVELUP_TIMEOUT_SECONDS
}} from './src/levelup.js';

const __result = (() => {{
  {expr}
}})();

console.log(JSON.stringify(__result));
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        cwd=root,
        check=True,
        capture_output=True,
        text=True
    )
    return json.loads(proc.stdout.strip())


class TestEndlessCycle(unittest.TestCase):
    def test_cycle_initial_state(self):
        res = run_node_eval("""
            const state = createCycleState();
            return {
                cycle: state.currentCycle,
                bossSpawned: state.bossSpawned,
                bossActive: state.bossActive,
                killsInCycle: state.killsInCycle
            };
        """)
        self.assertEqual(res["cycle"], 1)
        self.assertFalse(res["bossSpawned"])
        self.assertFalse(res["bossActive"])
        self.assertEqual(res["killsInCycle"], 0)

    def test_cycle_multipliers_progression(self):
        res = run_node_eval("""
            const c1 = getCycleMultipliers({ currentCycle: 1 });
            const c2 = getCycleMultipliers({ currentCycle: 2 });
            const c3 = getCycleMultipliers({ currentCycle: 3 });
            return { c1, c2, c3 };
        """)
        self.assertEqual(res["c1"]["hpMult"], 1.0)
        self.assertEqual(res["c1"]["bossHpMult"], 1.0)
        self.assertEqual(res["c1"]["speedMult"], 1.0)

        self.assertAlmostEqual(res["c2"]["hpMult"], 1.35)
        self.assertAlmostEqual(res["c2"]["bossHpMult"], 1.45)
        self.assertGreater(res["c2"]["speedMult"], 1.0)

        self.assertGreater(res["c3"]["hpMult"], res["c2"]["hpMult"])
        self.assertGreater(res["c3"]["bossHpMult"], res["c2"]["bossHpMult"])

    def test_cycle_boss_spawn_and_advance(self):
        res = run_node_eval("""
            const state = createCycleState();
            const shouldBefore = shouldSpawnCycleBoss(state, 10, 5);
            updateCycleProgress(state, 125, 125, 10);
            const shouldAfterTime = shouldSpawnCycleBoss(state);
            markBossSpawned(state);
            const shouldAfterSpawn = shouldSpawnCycleBoss(state);
            const advanceResult = advanceToNextCycle(state);
            return {
                shouldBefore,
                shouldAfterTime,
                shouldAfterSpawn,
                advanceResult,
                newCycle: state.currentCycle,
                bossSpawnedAfterAdvance: state.bossSpawned
            };
        """)
        self.assertFalse(res["shouldBefore"])
        self.assertTrue(res["shouldAfterTime"])
        self.assertFalse(res["shouldAfterSpawn"])
        self.assertEqual(res["newCycle"], 2)
        self.assertFalse(res["bossSpawnedAfterAdvance"])
        self.assertEqual(res["advanceResult"]["newCycle"], 2)
        self.assertEqual(res["advanceResult"]["reishiShowerCount"], 18)


class TestReiatsuSystem(unittest.TestCase):
    def test_reiatsu_score_and_ranks(self):
        res = run_node_eval("""
            const player1 = { hp: 100, maxHp: 100 };
            const state1 = { level: 1, kills: 0, passives: { reiatsu: 0 }, cycleState: { currentCycle: 1 } };
            const score1 = calculateReiatsuScore(player1, state1);
            const title1 = getReiatsuRankTitle(score1);

            const player2 = { hp: 100, maxHp: 100 };
            const state2 = { level: 25, kills: 150, passives: { reiatsu: 1 }, cycleState: { currentCycle: 3 } };
            const score2 = calculateReiatsuScore(player2, state2);
            const title2 = getReiatsuRankTitle(score2);

            return { score1, title1, score2, title2 };
        """)
        self.assertEqual(res["title1"], "Shinigami Raso")
        self.assertIn("Capitão", res["title2"])
        self.assertGreater(res["score2"], res["score1"])

    def test_reiatsu_agro_radius_and_spawns(self):
        res = run_node_eval("""
            const agroMin = getReiatsuAgroRadius(0);
            const agroMid = getReiatsuAgroRadius(600);
            const agroMax = getReiatsuAgroRadius(50000);
            const bonusLow = getReiatsuSpawnBonus(100);
            const bonusHigh = getReiatsuSpawnBonus(2500);
            return { agroMin, agroMid, agroMax, bonusLow, bonusHigh };
        """)
        self.assertEqual(res["agroMin"], 16.0)
        self.assertGreater(res["agroMid"], 16.0)
        self.assertEqual(res["agroMax"], 65.0)
        self.assertEqual(res["bonusLow"], 0)
        self.assertGreaterEqual(res["bonusHigh"], 3)

    def test_enemy_wandering(self):
        res = run_node_eval("""
            const enemy = {
                active: true,
                x: 10,
                z: 10,
                dirX: 0,
                dirZ: 0,
                speed: 3.0,
                wanderTimer: 0,
                wanderAngle: 0
            };
            updateEnemyWandering(enemy, 0.1);
            return {
                moved: enemy.x !== 10 || enemy.z !== 10,
                timerActive: enemy.wanderTimer > 0
            };
        """)
        self.assertTrue(res["moved"])
        self.assertTrue(res["timerActive"])


class TestLevelUpSettings(unittest.TestCase):
    def test_levelup_auto_selection_timer(self):
        res = run_node_eval("""
            return { timeoutSeconds: LEVELUP_TIMEOUT_SECONDS };
        """)
        self.assertEqual(res["timeoutSeconds"], 10.0)


if __name__ == "__main__":
    unittest.main()
