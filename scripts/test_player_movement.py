"""Testes unitários automatizados da movimentação, walk cycle e billboard direcional.

Executa as funções puras de `src/movement.js` via Node.js em ambiente isolado,
garantindo que o código em JavaScript respeite todas as invariantes sem depender de DOM.
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
  computePlayerDisplacement,
  getSpriteDirection,
  updateWalkCycle,
  resetWalkCycle
}} from './src/movement.js';

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


class TestPlayerMovementUnit(unittest.TestCase):
    """Testa cálculos vetoriais e animação da caminhada."""

    def test_compute_displacement_cardinal_yaw_zero(self):
        res = run_node_eval("""
            return {
                w: computePlayerDisplacement({ w: true, a: false, s: false, d: false }, 0),
                s: computePlayerDisplacement({ w: false, a: false, s: true, d: false }, 0),
                d: computePlayerDisplacement({ w: false, a: false, s: false, d: true }, 0),
                a: computePlayerDisplacement({ w: false, a: true, s: false, d: false }, 0)
            };
        """)
        # W -> Frente (Z negativo no Three.js)
        self.assertAlmostEqual(res["w"]["dx"], 0.0, places=5)
        self.assertAlmostEqual(res["w"]["dz"], -1.0, places=5)

        # S -> Recuo/Câmera (Z positivo)
        self.assertAlmostEqual(res["s"]["dx"], 0.0, places=5)
        self.assertAlmostEqual(res["s"]["dz"], 1.0, places=5)

        # D -> Direita (X positivo)
        self.assertAlmostEqual(res["d"]["dx"], 1.0, places=5)
        self.assertAlmostEqual(res["d"]["dz"], 0.0, places=5)

        # A -> Esquerda (X negativo)
        self.assertAlmostEqual(res["a"]["dx"], -1.0, places=5)
        self.assertAlmostEqual(res["a"]["dz"], 0.0, places=5)

    def test_compute_displacement_with_rotated_camera_yaw_90(self):
        res = run_node_eval("""
            const yaw = Math.PI / 2;
            return {
                w: computePlayerDisplacement({ w: true, a: false, s: false, d: false }, yaw),
                s: computePlayerDisplacement({ w: false, a: false, s: true, d: false }, yaw),
                d: computePlayerDisplacement({ w: false, a: false, s: false, d: true }, yaw),
                a: computePlayerDisplacement({ w: false, a: true, s: false, d: false }, yaw)
            };
        """)
        # A 90°, 'W' avança para o fundo da tela (Oeste: X negativo)
        self.assertAlmostEqual(res["w"]["dx"], -1.0, places=5)
        self.assertAlmostEqual(res["w"]["dz"], 0.0, places=5)

        # 'S' recua para fora da tela (Leste: X positivo)
        self.assertAlmostEqual(res["s"]["dx"], 1.0, places=5)
        self.assertAlmostEqual(res["s"]["dz"], 0.0, places=5)

    def test_compute_displacement_diagonal_normalization(self):
        res = run_node_eval("""
            const diag = computePlayerDisplacement({ w: true, a: false, s: false, d: true }, 0);
            return {
                dx: diag.dx,
                dz: diag.dz,
                len: Math.hypot(diag.dx, diag.dz)
            };
        """)
        self.assertAlmostEqual(res["len"], 1.0, places=5)
        self.assertAlmostEqual(res["dx"], 0.707106, places=4)
        self.assertAlmostEqual(res["dz"], -0.707106, places=4)

    def test_compute_displacement_idle_returns_null(self):
        res = run_node_eval("""
            return {
                idle: computePlayerDisplacement({ w: false, a: false, s: false, d: false }, 0)
            };
        """)
        self.assertIsNone(res["idle"])

    def test_get_sprite_direction_cardinal(self):
        res = run_node_eval("""
            return {
                north: getSpriteDirection(0, -1, 0),
                south: getSpriteDirection(0, 1, 0),
                east:  getSpriteDirection(1, 0, 0),
                west:  getSpriteDirection(-1, 0, 0)
            };
        """)
        self.assertEqual(res["north"], "back")
        self.assertEqual(res["south"], "front")
        self.assertEqual(res["east"], "side")
        self.assertEqual(res["west"], "side_l")

    def test_get_sprite_direction_camera_relative_180(self):
        res = run_node_eval("""
            const yaw180 = Math.PI;
            return {
                facingNorth: getSpriteDirection(0, -1, yaw180),
                facingSouth: getSpriteDirection(0, 1, yaw180)
            };
        """)
        # Câmera virada 180°: olhar para o Norte significa caminhar em direção à lente da câmera (front)
        self.assertEqual(res["facingNorth"], "front")
        self.assertEqual(res["facingSouth"], "back")

    def test_update_walk_cycle_timing_and_rollover(self):
        res = run_node_eval("""
            const state = { animTimer: 0, animFrame: 0 };
            const fps = 8; // intervalo = 0.125s
            
            // Sub-intervalo: timer acumula, frame não avança
            updateWalkCycle(state, 0.05, fps, 4);
            const step1 = { ...state };

            // Ultrapassa intervalo: avança para frame 1
            updateWalkCycle(state, 0.08, fps, 4);
            const step2 = { ...state };

            // Ciclo completo 1 -> 2 -> 3 -> 0
            updateWalkCycle(state, 0.13, fps, 4);
            const step3 = { ...state };
            updateWalkCycle(state, 0.13, fps, 4);
            const step4 = { ...state };
            updateWalkCycle(state, 0.13, fps, 4);
            const step5 = { ...state };

            return { step1, step2, step3, step4, step5 };
        """)
        self.assertEqual(res["step1"]["animFrame"], 0)
        self.assertAlmostEqual(res["step1"]["animTimer"], 0.05, places=5)

        self.assertEqual(res["step2"]["animFrame"], 1)
        self.assertAlmostEqual(res["step2"]["animTimer"], 0.0, places=5)

        self.assertEqual(res["step3"]["animFrame"], 2)
        self.assertEqual(res["step4"]["animFrame"], 3)
        self.assertEqual(res["step5"]["animFrame"], 0)

    def test_reset_walk_cycle_restores_neutral_standing(self):
        res = run_node_eval("""
            const state = { isMoving: true, animTimer: 0.11, animFrame: 3 };
            resetWalkCycle(state);
            return state;
        """)
        self.assertFalse(res["isMoving"])
        self.assertEqual(res["animFrame"], 1)
        self.assertAlmostEqual(res["animTimer"], 0.0)

    def test_compute_displacement_with_virtual_joystick(self):
        res = run_node_eval("""
            const emptyKeys = { w: false, a: false, s: false, d: false };
            return {
                joyForward: computePlayerDisplacement(emptyKeys, 0, { x: 0.0, y: 1.0 }),
                joyRight:   computePlayerDisplacement(emptyKeys, 0, { x: 1.0, y: 0.0 }),
                joyDiag90:  computePlayerDisplacement(emptyKeys, Math.PI / 2, { x: 0.0, y: 1.0 }),
                joyDeadzone: computePlayerDisplacement(emptyKeys, 0, { x: 0.02, y: 0.03 })
            };
        """)
        # Joystick para frente (y=1) com yaw 0 -> dz negativo (-1.0)
        self.assertAlmostEqual(res["joyForward"]["dx"], 0.0, places=5)
        self.assertAlmostEqual(res["joyForward"]["dz"], -1.0, places=5)

        # Joystick para a direita (x=1) com yaw 0 -> dx positivo (1.0)
        self.assertAlmostEqual(res["joyRight"]["dx"], 1.0, places=5)
        self.assertAlmostEqual(res["joyRight"]["dz"], 0.0, places=5)

        # Joystick para frente com câmera a 90° -> dx negativo (-1.0)
        self.assertAlmostEqual(res["joyDiag90"]["dx"], -1.0, places=5)
        self.assertAlmostEqual(res["joyDiag90"]["dz"], 0.0, places=5)

        # Dentro da deadzone (< 0.08) -> None
        self.assertIsNone(res["joyDeadzone"])



if __name__ == "__main__":
    unittest.main()
